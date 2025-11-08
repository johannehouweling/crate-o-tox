const API_BASE = import.meta.env?.DEV
  ? "/lookup/aopwiki"
  : "https://aopwiki.org";
const AOPS_ENDPOINT = `${API_BASE}/aops.json`;
const MIN_QUERY_LENGTH = 2;

function stripHtml(html = "") {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export default class Lookup {
  constructor(opt = {}) {
    this.fields = opt.fields;
    this.type = opt.type || "AdverseOutcomePathway";
    this.cachePromise = null;
  }

  async ensureData() {
    if (!this.cachePromise) {
      this.cachePromise = fetch(AOPS_ENDPOINT, {
        headers: { Accept: "application/json" }
      })
        .then((response) => (response.ok ? response.json() : []))
        .catch(() => [])
        .then((data) => (Array.isArray(data) ? data : []));
    }
    return this.cachePromise;
  }

  async search({ query, limit = 10 }) {
    const normalized = query?.trim();
    if (!normalized || normalized.length < MIN_QUERY_LENGTH) return [];

    const q = normalized.toLowerCase();
    const documents = await this.ensureData();

    const matches = [];
    for (const doc of documents) {
      if (matches.length >= limit) break;
      const haystack = [
        doc?.title,
        doc?.short_name,
        doc?.abstract
      ]
        .filter(Boolean)
        .map((value) => value.toLowerCase());
      if (haystack.some((value) => value.includes(q))) {
        matches.push(this.formatEntry(doc));
      }
    }
    return matches.map((entry) => this.pickFields(entry)).filter(Boolean);
  }

  formatEntry(doc) {
    if (!doc?.id) return null;
    const idUrl = `https://aopwiki.org/aops/${doc.id}`;
    return {
      "@id": idUrl,
      "@type": this.type,
      name: doc.title?.trim() || doc.short_name?.trim(),
      short_name: doc.short_name?.trim(),
      description: stripHtml(doc.abstract),
      url: doc.url?.replace(/\.json$/, "") || idUrl
    };
  }

  pickFields(entity) {
    if (!entity) return null;
    const cleaned = Object.fromEntries(
      Object.entries(entity).filter(
        ([, value]) => value !== undefined && value !== null && value !== ""
      )
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
