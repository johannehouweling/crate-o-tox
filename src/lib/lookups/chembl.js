const BASE_OVERRIDE = import.meta.env?.VITE_CHEMBL_BASE?.replace(/\/$/, '');
const DEFAULT_BASE = 'https://www.ebi.ac.uk/chembl/api/data';
const PROXY_BASE = '/lookup/chembl';
const CHEMBL_BASE = BASE_OVERRIDE || DEFAULT_BASE;
const MIN_QUERY_LENGTH = 2;
const MAX_RESULTS = 20;

async function safeJsonFetch(url) {
  try {
    const headers = { Accept: 'application/json' };
    if (typeof window === 'undefined') {
      headers['User-Agent'] = headers['User-Agent'] || 'crate-o-tox/lookup (+https://github.com/Language-Research-Technology/crate-o)';
    }
    const response = await fetch(url, {
      mode: 'cors',
      credentials: 'omit',
      headers
    });
    if (response.ok) return await response.json();
  } catch (_) {
    // ignore
  }
  return null;
}

async function fetchWithFallback(url) {
  const primary = await safeJsonFetch(url);
  if (primary) return primary;
  if (!PROXY_BASE || url.startsWith(PROXY_BASE)) return null;
  const fallbackUrl = url.replace(CHEMBL_BASE, PROXY_BASE);
  if (fallbackUrl === url) return null;
  return await safeJsonFetch(fallbackUrl);
}

function extractMolecules(payload) {
  const molecules = payload?.molecules || payload?.results || payload?.objects || [];
  return Array.isArray(molecules) ? molecules : [];
}

function uniqueStrings(values = []) {
  return Array.from(
    new Set(
      values
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter(Boolean)
    )
  );
}

function parseNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getSynonyms(molecule) {
  const raw = molecule?.molecule_synonyms || molecule?.synonyms || [];
  const values = Array.isArray(raw)
    ? raw.map((entry) => entry?.molecule_synonym || entry?.synonym || entry?.value || entry).filter(Boolean)
    : [];
  return uniqueStrings(values);
}

function getName(molecule) {
  return molecule?.pref_name || molecule?.molecule_name || molecule?.molecule_chembl_id || null;
}

function hasDetails(molecule) {
  return Boolean(molecule?.molecule_structures || molecule?.molecule_properties || molecule?.pref_name);
}

export default class Lookup {
  constructor(opt = {}) {
    this.fields = opt.fields;
    this.type = opt.type || 'ChemicalSubstance';
  }

  async search({ query, limit = 10 }) {
    const normalized = query?.trim();
    if (!normalized || normalized.length < MIN_QUERY_LENGTH) return [];

    const size = Math.min(Math.max(limit, 1), MAX_RESULTS);
    const candidates = await this.searchCandidates(normalized, size);
    if (!candidates.length) return [];

    const byId = new Map();
    for (const candidate of candidates) {
      const id = candidate?.molecule_chembl_id;
      if (id && !byId.has(id)) byId.set(id, candidate);
    }

    const ids = Array.from(byId.keys()).slice(0, size);
    const idsToFetch = ids.filter((id) => !hasDetails(byId.get(id)));
    if (idsToFetch.length) {
      const fetched = await Promise.all(idsToFetch.map((id) => this.fetchMolecule(id)));
      idsToFetch.forEach((id, index) => {
        const molecule = fetched[index];
        if (molecule) byId.set(id, molecule);
      });
    }

    return ids
      .map((id) => this.formatMolecule(byId.get(id)))
      .filter(Boolean)
      .map((entity) => this.pickFields(entity));
  }

  async searchCandidates(query, limit) {
    const encoded = encodeURIComponent(query);
    const searchUrl = `${CHEMBL_BASE}/molecule/search?q=${encoded}&format=json&limit=${limit}`;
    const searchPayload = await fetchWithFallback(searchUrl);
    let candidates = extractMolecules(searchPayload);

    if (!candidates.length) {
      const prefUrl = `${CHEMBL_BASE}/molecule?pref_name__icontains=${encoded}&format=json&limit=${limit}`;
      const prefPayload = await fetchWithFallback(prefUrl);
      candidates = extractMolecules(prefPayload);
    }

    if (!candidates.length) {
      const nameUrl = `${CHEMBL_BASE}/molecule?molecule_name__icontains=${encoded}&format=json&limit=${limit}`;
      const namePayload = await fetchWithFallback(nameUrl);
      candidates = extractMolecules(namePayload);
    }

    return candidates.slice(0, limit);
  }

  async fetchMolecule(chemblId) {
    if (!chemblId) return null;
    const url = `${CHEMBL_BASE}/molecule/${encodeURIComponent(chemblId)}.json`;
    return await fetchWithFallback(url);
  }

  formatMolecule(molecule) {
    const chemblId = molecule?.molecule_chembl_id;
    if (!chemblId) return null;
    const name = getName(molecule);
    if (!name) return null;

    const structures = molecule?.molecule_structures || {};
    const properties = molecule?.molecule_properties || {};

    return {
      '@id': `https://www.ebi.ac.uk/chembl/compound_report_card/${chemblId}/`,
      '@type': this.type,
      name,
      synonym: getSynonyms(molecule),
      inchi: structures.standard_inchi || null,
      inchikey: structures.standard_inchi_key || null,
      smiles: structures.canonical_smiles || null,
      formula: properties.full_molformula || null,
      mass: parseNumber(properties.full_mwt),
      chemblId
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
      if (field in cleaned) projection[field] = cleaned[field];
    }
    if (!('@type' in projection) && cleaned['@type']) projection['@type'] = cleaned['@type'];
    if (!('@id' in projection) && cleaned['@id']) projection['@id'] = cleaned['@id'];
    if (!Object.keys(projection).length) return null;
    return projection;
  }
}
