const MIMEDB_URL =
  "https://cdn.jsdelivr.net/gh/jshttp/mime-db@1.52.0/db.json";

const MIN_QUERY_LENGTH = 1;

export default class Lookup {
  constructor(opt = {}) {
    this.fields = opt.fields;
    this.cachePromise = null;
  }

  async ensureData() {
    if (!this.cachePromise) {
      this.cachePromise = fetch(MIMEDB_URL, {
        headers: { Accept: "application/json" }
      })
        .then((response) => (response.ok ? response.json() : {}))
        .catch(() => ({}));
    }
    return this.cachePromise;
  }

  normalize(text = "") {
    return text.toLowerCase();
  }

  async search({ query, limit = 10 }) {
    const normalized = query?.trim();
    if (!normalized || normalized.length < MIN_QUERY_LENGTH) return [];

    const documents = await this.ensureData();
    const q = this.normalize(normalized);
    const matches = [];

    for (const [mime, meta] of Object.entries(documents)) {
      if (matches.length >= limit) break;
      const extensions = (meta.extensions || []).map((ext) => `.${ext}`);
      const haystack = [mime, ...extensions].map((value) => this.normalize(value));
      if (haystack.some((value) => value.includes(q))) {
        matches.push(this.formatEntry(mime, meta));
      }
    }

    return matches;
  }

  formatEntry(mime, meta) {
    const extensions = (meta.extensions || []).map((ext) => `.${ext}`);
    return this.pickFields({
      "@id": `urn:mimetype:${mime}`,
      "@type": "MediaType",
      name: mime,
      description: meta.source ? `Source: ${meta.source}` : undefined,
      extensions
    });
  }

  pickFields(entity) {
    if (!entity) return null;
    const cleaned = Object.fromEntries(
      Object.entries(entity).filter(
        ([, value]) =>
          value !== undefined &&
          value !== null &&
          value !== "" &&
          (!Array.isArray(value) || value.length > 0)
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
