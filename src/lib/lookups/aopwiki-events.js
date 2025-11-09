const API_BASE = import.meta.env?.DEV
  ? "/lookup/aopwiki"
  : "https://aopwiki.org";
const EVENTS_ENDPOINT = `${API_BASE}/events.json`;
const MIN_QUERY_LENGTH = 2;

function normalizeText(value = "") {
  return value?.toLowerCase?.().trim?.() ?? "";
}

function parseEventId(query = "") {
  if (!query) return null;
  const numeric = query.match(/^\d+$/);
  if (numeric) return numeric[0];
  const prefixed = query.match(/(?:ke|event|mie)[-_\s]*(\d+)/i);
  if (prefixed) return prefixed[1];
  return null;
}

export default class Lookup {
  constructor(opt = {}) {
    this.fields = opt.fields;
    this.type = opt.type || "AopEvent";
    this.eventsPromise = null;
    this.eventDetailCache = new Map();
  }

  async ensureEvents() {
    if (!this.eventsPromise) {
      this.eventsPromise = fetch(EVENTS_ENDPOINT, {
        headers: { Accept: "application/json" }
      })
        .then((response) => (response.ok ? response.json() : []))
        .catch(() => [])
        .then((data) => (Array.isArray(data) ? data : []));
    }
    return this.eventsPromise;
  }

  async loadEventDetail(id) {
    if (!id) return null;
    const cacheKey = String(id);
    if (this.eventDetailCache.has(cacheKey)) {
      return this.eventDetailCache.get(cacheKey);
    }
    const detailPromise = fetch(`${API_BASE}/events/${cacheKey}.json`, {
      headers: { Accept: "application/json" }
    })
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null);
    this.eventDetailCache.set(cacheKey, detailPromise);
    return detailPromise;
  }

  async search({ query, limit = 10 }) {
    const normalized = query?.trim();
    if (!normalized || normalized.length < MIN_QUERY_LENGTH) return [];

    const lower = normalized.toLowerCase();
    const events = await this.ensureEvents();

    const idCandidate = parseEventId(normalized);
    if (idCandidate) {
      const match = events.find((doc) => String(doc?.id) === idCandidate);
      if (match) {
        const formatted = await this.formatEntry(match);
        const picked = this.pickFields(formatted);
        return picked ? [picked] : [];
      }
    }

    const results = [];
    for (const doc of events) {
      if (results.length >= limit) break;
      const fields = [
        doc?.title,
        doc?.short_name,
        doc?.biological_organization?.term
      ]
        .filter(Boolean)
        .map(normalizeText);
      if (fields.some((value) => value.includes(lower))) {
        results.push(doc);
      }
    }

    const formatted = await Promise.all(results.map((doc) => this.formatEntry(doc)));
    return formatted
      .map((entry) => this.pickFields(entry))
      .filter(Boolean);
  }

  async formatEntry(doc) {
    if (!doc?.id) return null;
    const detail = await this.loadEventDetail(doc.id);
    const idUrl = `https://aopwiki.org/events/${doc.id}`;
    const level =
      doc?.biological_organization?.term || doc?.biological_organization || detail?.biological_organization;
    const eventType = detail?.molecular_initiating_event ? "Molecular Initiating Event" : "Key Event";

    return {
      "@id": idUrl,
      "@type": this.type,
      name: doc.title?.trim() || doc.short_name?.trim(),
      short_name: doc.short_name?.trim() || doc.title?.trim(),
      description: undefined,
      identifier: idUrl,
      eventType,
      biologicalOrganization: level,
      url: doc.url?.replace(/\\.json$/, "") || idUrl
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
