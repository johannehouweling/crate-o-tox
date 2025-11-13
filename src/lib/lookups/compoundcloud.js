const BASE_OVERRIDE = import.meta.env?.VITE_COMPOUND_CLOUD_BASE?.replace(/\/$/, '');
const DEV_BASE = '/lookup/compoundcloud';
const DEFAULT_BASE = 'https://compoundcloud.wikibase.cloud';
const COMPOUND_CLOUD_BASE = BASE_OVERRIDE || (import.meta.env?.DEV ? DEV_BASE : DEFAULT_BASE);
const SPARQL_ENDPOINT = `${COMPOUND_CLOUD_BASE}/query/sparql`;
const ENTITY_BASE = 'https://compoundcloud.wikibase.cloud/entity';
const ENTITY_DATA_ENDPOINT = `${COMPOUND_CLOUD_BASE}/wiki/Special:EntityData`;
const DEFAULT_LANGUAGE = 'en';
const MIN_QUERY_LENGTH = 2;
const MAX_SYNONYMS = 20;

const PROPERTY_MAP = {
  inchi: 'P9',
  inchikey: 'P10',
  smiles: 'P12',
  formula: 'P3',
  mass: 'P2',
  cas: 'P23',
  pubchemCid: 'P13',
  dsstoxId: 'P22',
  keggId: 'P27',
  chebiId: 'P28',
  chemblId: 'P41',
  ecNumber: 'P43',
  echaInfocardId: 'P44',
  aopWikiStressorId: 'P36'
};

async function safeJsonFetch(url, options = {}) {
  try {
    const headers = {
      Accept: 'application/sparql-results+json, application/json',
      ...(options.headers || {})
    };
    if (typeof window === 'undefined') {
      headers['User-Agent'] = headers['User-Agent'] || 'crate-o-tox/lookup (+https://github.com/Language-Research-Technology/crate-o)';
    }
    const response = await fetch(url, {
      mode: 'cors',
      credentials: 'omit',
      headers,
      ...options
    });
    if (!response?.ok) return null;
    const contentType = response.headers?.get?.('content-type') || '';
    if (contentType.includes('json')) {
      return await response.json();
    }
    const preview = await response.text();
    console.warn(
      `[compoundcloud] Unexpected response from ${url} (content-type: ${contentType || 'unknown'})`,
      preview.slice(0, 200)
    );
    return null;
  } catch (error) {
    console.warn(`[compoundcloud] Request failed for ${url}`, error);
    return null;
  }
}

function escapeSparqlString(value = '') {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function buildSearchQuery(searchTerm, limit) {
  const raw = searchTerm || '';
  const lowered = escapeSparqlString(raw.toLowerCase());
  return `
SELECT DISTINCT ?item ?itemLabel ?description
WHERE {
  ?item rdfs:label ?itemLabel .

  OPTIONAL { ?item schema:description ?description FILTER(LANG(?description) = "${DEFAULT_LANGUAGE}") }
  FILTER(
    CONTAINS(LCASE(?itemLabel), "${lowered}") ||
    EXISTS {
      ?item skos:altLabel ?synonymSearch .
      FILTER(
        LANG(?synonymSearch) = "${DEFAULT_LANGUAGE}" &&
        CONTAINS(LCASE(?synonymSearch), "${lowered}")
      )
    }
  )
}
ORDER BY LCASE(?itemLabel)
LIMIT ${Math.min(limit * 10, 200)}
`;
}

function buildSparqlUrl(query) {
  const params = new URLSearchParams();
  params.set('query', query);
  params.set('format', 'json');
  return `${SPARQL_ENDPOINT}?${params.toString()}`;
}

function getBindingValue(binding, key) {
  return binding?.[key]?.value ?? null;
}

function getClaimValues(claims = {}, propertyId) {
  if (!claims?.[propertyId]) return [];
  return claims[propertyId]
    .map((statement) => statement?.mainsnak?.datavalue?.value)
    .filter((value) => value !== undefined && value !== null);
}

function getFirstStringClaim(claims, propertyId) {
  const value = getClaimValues(claims, propertyId).find((entry) => typeof entry === 'string');
  return value ?? null;
}

function getQuantityClaim(claims, propertyId) {
  const value = getClaimValues(claims, propertyId).find(
    (entry) => entry && typeof entry === 'object' && 'amount' in entry
  );
  if (!value) return null;
  const parsed = Number(value.amount);
  return Number.isFinite(parsed) ? parsed : null;
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

function getAliases(entity) {
  const aliasGroups = Object.values(entity?.aliases || {});
  return uniqueStrings(aliasGroups.flat().map((alias) => alias?.value));
}

function getLabel(entity, language, fallback) {
  return (
    entity?.labels?.[language]?.value ||
    fallback ||
    Object.values(entity?.labels || {})[0]?.value ||
    null
  );
}

export default class Lookup {
  constructor(opt = {}) {
    this.fields = opt.fields;
    this.type = opt.type || 'ChemicalSubstance';
  }

  async search({ query, limit = 10 }) {
    const normalized = query?.trim();
    if (!normalized || normalized.length < MIN_QUERY_LENGTH) {
      return [];
    }
    const candidates = await this.fetchViaSparql(normalized, limit);
    if (!candidates.length) return [];
    const ids = candidates
      .map((candidate) => candidate.id?.replace(`${ENTITY_BASE}/`, '').trim())
      .filter(Boolean);
    if (!ids.length) return [];
    const entities = await this.fetchEntities(ids);
    const records = [];
    for (const candidate of candidates) {
      if (records.length >= limit) break;
      const wikibaseId = candidate.id?.replace(`${ENTITY_BASE}/`, '').trim();
      const entity = entities[wikibaseId];
      if (!entity) continue;
      const record = this.buildRecordFromEntity(entity, candidate);
      if (record) {
        records.push(this.pickFields(record));
      }
    }
    return records;
  }

  async fetchViaSparql(searchTerm, limit) {
    const query = buildSearchQuery(searchTerm, Math.min(Math.max(limit, 1), 100));
    const url = buildSparqlUrl(query);
    const payload = await safeJsonFetch(url);
    const bindings = payload?.results?.bindings || [];
    const seen = new Map();
    for (const binding of bindings) {
      const id = binding?.item?.value;
      if (!id || seen.has(id)) continue;
      seen.set(id, {
        id,
        label: getBindingValue(binding, 'itemLabel'),
        description: getBindingValue(binding, 'description')
      });
    }
    return Array.from(seen.values());
  }

  async fetchEntities(ids = []) {
    if (!ids.length) return {};
    const uniqueIds = Array.from(new Set(ids));
    const results = await Promise.all(
      uniqueIds.map(async (id) => {
        try {
          return await this.fetchEntity(id);
        } catch {
          return null;
        }
      })
    );
    return uniqueIds.reduce((acc, id, index) => {
      const entity = results[index];
      if (entity) {
        acc[id] = entity;
      }
      return acc;
    }, {});
  }

  async fetchEntity(id) {
    if (!id) return null;
    const url = `${ENTITY_DATA_ENDPOINT}/${encodeURIComponent(id)}.json`;
    const payload = await safeJsonFetch(url);
    return payload?.entities?.[id] || null;
  }

  buildRecordFromEntity(entity, metadata = {}) {
    if (!entity?.id) return null;
    const name =
      getLabel(entity, DEFAULT_LANGUAGE, metadata.label) ||
      metadata.label ||
      null;
    if (!name) return null;
    const claims = entity.claims || {};
    const synonyms = getAliases(entity).slice(0, MAX_SYNONYMS);
    return {
      '@id': `${ENTITY_BASE}/${entity.id}`,
      '@type': this.type,
      name,
      description: metadata.description || entity.descriptions?.[DEFAULT_LANGUAGE]?.value,
      synonym: synonyms,
      inchi: getFirstStringClaim(claims, PROPERTY_MAP.inchi),
      inchikey: getFirstStringClaim(claims, PROPERTY_MAP.inchikey),
      smiles: getFirstStringClaim(claims, PROPERTY_MAP.smiles),
      formula: getFirstStringClaim(claims, PROPERTY_MAP.formula),
      cas: uniqueStrings(getClaimValues(claims, PROPERTY_MAP.cas)),
      pubchemCid: getFirstStringClaim(claims, PROPERTY_MAP.pubchemCid),
      dsstoxId: getFirstStringClaim(claims, PROPERTY_MAP.dsstoxId),
      keggId: getFirstStringClaim(claims, PROPERTY_MAP.keggId),
      chebiId: getFirstStringClaim(claims, PROPERTY_MAP.chebiId),
      chemblId: getFirstStringClaim(claims, PROPERTY_MAP.chemblId),
      ecNumber: getFirstStringClaim(claims, PROPERTY_MAP.ecNumber),
      echaInfocardId: getFirstStringClaim(claims, PROPERTY_MAP.echaInfocardId),
      aopWikiStressorId: getFirstStringClaim(claims, PROPERTY_MAP.aopWikiStressorId),
      mass: getQuantityClaim(claims, PROPERTY_MAP.mass),
      wikibaseId: entity.id
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
