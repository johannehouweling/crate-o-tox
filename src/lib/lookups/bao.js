const BASE_OVERRIDE = import.meta.env?.VITE_BAO_BASE?.replace(/\/$/, '');
const DEV_BASE = '/lookup/bao';
const DEFAULT_BASE = 'https://www.ebi.ac.uk/ols4';
const BAO_BASE = BASE_OVERRIDE || (import.meta.env?.DEV ? DEV_BASE : DEFAULT_BASE);
const SEARCH_ENDPOINT = `${BAO_BASE}/api/search`;
const MIN_QUERY_LENGTH = 2;
const DEFAULT_FIELDS = [
  '@id',
  'name',
  'description',
  'synonym',
  'oboId',
  'shortForm',
  'curie',
  'ontologyName'
];

async function safeJsonFetch(url) {
  try {
    const response = await fetch(url, {
      mode: 'cors',
      credentials: 'omit',
      headers: {
        Accept: 'application/json'
      }
    });
    if (!response?.ok) return null;
    return await response.json();
  } catch (error) {
    console.warn('[bao] request failed', error);
    return null;
  }
}

function normalizeDescription(value) {
  if (!value) return undefined;
  if (Array.isArray(value)) {
    return value.find((entry) => typeof entry === 'string' && entry.trim())?.trim();
  }
  return typeof value === 'string' ? value.trim() : undefined;
}

function ensureArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter((entry) => typeof entry === 'string' && entry.trim()).map((entry) => entry.trim());
  }
  return [value].filter((entry) => typeof entry === 'string' && entry.trim()).map((entry) => entry.trim());
}

export default class Lookup {
  constructor(opt = {}) {
    this.fields = opt.fields?.length ? opt.fields : DEFAULT_FIELDS;
    this.type = opt.type || 'BAOTerm';
  }

  async search({ query, limit = 10 }) {
    const normalized = query?.trim();
    if (!normalized || normalized.length < MIN_QUERY_LENGTH) {
      return [];
    }
    const docs = await this.fetchDocs(normalized, Math.max(1, limit));
    if (!docs.length) return [];
    const seen = new Set();
    const results = [];
    for (const doc of docs) {
      if (results.length >= limit) break;
      if (!doc?.iri || !doc?.label) continue;
      if (seen.has(doc.iri)) continue;
      seen.add(doc.iri);
      const record = this.toRecord(doc);
      if (record) {
        results.push(this.pickFields(record));
      }
    }
    return results;
  }

  async fetchDocs(searchTerm, limit) {
    const params = new URLSearchParams({
      q: searchTerm,
      ontology: 'bao',
      rows: String(Math.min(limit * 4, 100)),
      start: '0',
      type: 'class'
    });
    const url = `${SEARCH_ENDPOINT}?${params.toString()}`;
    const payload = await safeJsonFetch(url);
    return payload?.response?.docs || [];
  }

  toRecord(doc) {
    const synonyms = ensureArray(doc.synonym);
    const description = normalizeDescription(doc.description);
    return {
      '@id': doc.iri,
      '@type': this.type,
      name: doc.label,
      description,
      synonym: synonyms,
      shortForm: doc.short_form,
      oboId: doc.obo_id || doc.short_form,
      curie: doc.curie || doc.obo_id,
      ontologyName: doc.ontology_name,
      ontologyIri: doc.ontology_iri,
      isObsolete: doc.is_obsolete === true
    };
  }

  pickFields(entity) {
    if (!entity) return null;
    const cleaned = Object.fromEntries(
      Object.entries(entity).filter(([, value]) => value !== undefined && value !== null)
    );
    if (!this.fields?.length) return cleaned;
    const projection = {};
    for (const field of this.fields) {
      if (field in cleaned) {
        projection[field] = cleaned[field];
      }
    }
    if (!('@type' in projection) && cleaned['@type']) {
      projection['@type'] = cleaned['@type'];
    }
    if (!('@id' in projection) && cleaned['@id']) {
      projection['@id'] = cleaned['@id'];
    }
    return projection;
  }
}
