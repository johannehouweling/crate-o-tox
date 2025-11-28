const API_BASE = import.meta.env?.DEV
  ? "/lookup/aopwiki"
  : "https://aopwiki.org";
const AOPS_ENDPOINT = `${API_BASE}/aops.json`;
const MIN_QUERY_LENGTH = 2;

const EVENT_URL = (id) => `https://aopwiki.org/events/${id}`;
const AOP_URL = (id) => `https://aopwiki.org/aops/${id}`;

function stripHtml(html = "") {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function parseAopId(query = "") {
  if (!query) return null;
  const direct = query.match(/^\d+$/);
  if (direct) return direct[0];
  const prefixed = query.match(/aop[-_\s]*(\d+)/i);
  if (prefixed) return prefixed[1];
  return null;
}

export default class Lookup {
  constructor(opt = {}) {
    this.fields = opt.fields;
    this.type = opt.type || "AdverseOutcomePathway";
    this.cachePromise = null;
    this.detailCache = new Map();
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

  async loadDetail(id, url) {
    if (!id) return null;
    const key = String(id);
    if (this.detailCache.has(key)) {
      return this.detailCache.get(key);
    }
    const detailPromise = fetch(url || `${API_BASE}/aops/${key}.json`, {
      headers: { Accept: "application/json" }
    })
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null);
    this.detailCache.set(key, detailPromise);
    return detailPromise;
  }

  async search({ query, limit = 10 }) {
    const normalized = query?.trim();
    if (!normalized || normalized.length < MIN_QUERY_LENGTH) return [];

    const q = normalized.toLowerCase();
    const documents = await this.ensureData();

    const candidateId = parseAopId(normalized);
    if (candidateId) {
      const direct = documents.find(
        (doc) => String(doc?.id) === candidateId
      );
      if (direct) {
        const entry = this.pickFields(await this.formatEntry(direct));
        return entry ? [entry] : [];
      }
    }

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
        matches.push(doc);
      }
    }
    const formatted = await Promise.all(matches.map((doc) => this.formatEntry(doc)));
    return formatted.map((entry) => this.pickFields(entry)).filter(Boolean);
  }

  async formatEntry(doc) {
    if (!doc?.id) return null;
    const detail = await this.loadDetail(doc.id, doc.url);
    const idUrl = AOP_URL(doc.id);
    const title = doc.title?.trim();
    const altTitle = doc.short_name?.trim();
    const label = altTitle || title;

    const mapEvents = (events = []) =>
      events
        .map((item) => ({
          "@id": item?.event_id ? EVENT_URL(item.event_id) : undefined,
          name: item?.event?.trim?.(),
          eventType: item?.event_type
        }))
        .filter((e) => e["@id"] || e.name);

    const mapRelationships = (rels = []) =>
      rels
        .map((rel) => {
          const upstream = rel?.upstream_event?.trim?.();
          const downstream = rel?.downstream_event?.trim?.();
          const label = upstream && downstream
            ? `${upstream} → ${downstream}`
            : rel?.relation ? `Relationship ${rel.relation}` : undefined;
          return {
            "@id": rel?.relation ? `https://aopwiki.org/relationships/${rel.relation}` : undefined,
            name: label,
            upstream_event: upstream,
            downstream_event: downstream
          };
        })
        .filter((rel) => rel["@id"] || rel.name);

    return {
      "@id": idUrl,
      "@type": this.type,
      name: title || label,
      label,
      title,
      short_name: altTitle,
      alternative: altTitle && title && altTitle !== title ? altTitle : undefined,
      identifier: idUrl,
      page: idUrl,
      source: detail?.source,
      created: detail?.created_at,
      modified: detail?.updated_at,
      creator: detail?.corresponding_author?.id,
      abstract: stripHtml(doc.abstract),
      description: stripHtml(doc.abstract),
      has_molecular_initiating_event: mapEvents(detail?.aop_mies),
      has_key_event: mapEvents(detail?.aop_kes),
      has_adverse_outcome: mapEvents(detail?.aop_aos),
      has_key_event_relationship: mapRelationships(detail?.relationships),
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
