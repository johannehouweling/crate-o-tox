const PUBCHEM_BASE = import.meta.env?.DEV
  ? "/lookup/pubchem"
  : "https://pubchem.ncbi.nlm.nih.gov";
const AUTOCOMPLETE_BASE = `${PUBCHEM_BASE}/rest/autocomplete/compound`;
const PUG_BASE = `${PUBCHEM_BASE}/rest/pug/compound`;
const MIN_QUERY_LENGTH = 2;

async function safeJsonFetch(url, options) {
  try {
    const response = await fetch(url, options);
    if (!response?.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export default class Lookup {
  constructor(opt = {}) {
    this.fields = opt.fields;
    this.type = opt.type || "ChemicalSubstance";
  }

  async search({ query, limit = 10 }) {
    const normalized = query?.trim();
    if (!normalized || normalized.length < MIN_QUERY_LENGTH) {
      return [];
    }
    const suggestions = await this.fetchSuggestions(normalized, limit);
    if (!suggestions.length) {
      const single = await this.fetchCompoundByName(normalized);
      return single ? [this.pickFields(single)] : [];
    }

    const records = [];
    for (const name of suggestions) {
      if (records.length >= limit) break;
      const record = await this.fetchCompoundByName(name);
      if (record && !records.some((r) => r.cid === record.cid)) {
        records.push(record);
      }
    }
    return records.map((record) => this.pickFields(record));
  }

  async fetchSuggestions(query, limit) {
    const url = `${AUTOCOMPLETE_BASE}/${encodeURIComponent(
      query.trim()
    )}/json?limit=${encodeURIComponent(limit)}`;
    const payload = await safeJsonFetch(url);
    return (
      payload?.dictionary_terms?.compound?.map((name) => name.trim()).filter(Boolean) || []
    );
  }

  async fetchCompoundByName(name) {
    const propertyUrl = `${PUG_BASE}/name/${encodeURIComponent(
      name
    )}/property/Title,InChI,InChIKey/JSON`;
    const propertyData = await safeJsonFetch(propertyUrl);
    const property = propertyData?.PropertyTable?.Properties?.[0];
    if (!property?.CID) return null;

    const synonyms = await this.fetchSynonyms(property.CID);
    return {
      "@id": `https://pubchem.ncbi.nlm.nih.gov/compound/${property.CID}`,
      "@type": this.type,
      name: property.Title || name,
      synonym: synonyms,
      inchi: property.InChI,
      inchikey: property.InChIKey,
      cid: property.CID
    };
  }

  async fetchSynonyms(cid) {
    const url = `${PUG_BASE}/cid/${encodeURIComponent(cid)}/synonyms/JSON`;
    const payload = await safeJsonFetch(url);
    return payload?.InformationList?.Information?.[0]?.Synonym?.slice(0, 10) || [];
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
    if (!("@type" in projection) && cleaned["@type"]) {
      projection["@type"] = cleaned["@type"];
    }
    if (!("@id" in projection) && cleaned["@id"]) {
      projection["@id"] = cleaned["@id"];
    }
    return projection;
  }
}
