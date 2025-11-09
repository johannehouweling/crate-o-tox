const API_BASE = import.meta.env?.DEV
  ? "/lookup/aopwiki"
  : "https://aopwiki.org";
const RELATIONSHIPS_ENDPOINT = `${API_BASE}/relationships.json`;
const MIN_QUERY_LENGTH = 2;

function normalizeText(value = "") {
  return value?.toLowerCase?.().trim?.() ?? "";
}

function parseRelationshipId(query = "") {
  if (!query) return null;
  const numeric = query.match(/^\d+$/);
  if (numeric) return numeric[0];
  const prefixed = query.match(/(?:ker|relationship)[-_\s]*(\d+)/i);
  if (prefixed) return prefixed[1];
  return null;
}

export default class Lookup {
  constructor(opt = {}) {
    this.fields = opt.fields;
    this.type = opt.type || "AopEventRelationship";
    this.relationshipIndexPromise = null;
    this.relationshipDetailCache = new Map();
  }

  async ensureIndex() {
    if (!this.relationshipIndexPromise) {
      this.relationshipIndexPromise = fetch(RELATIONSHIPS_ENDPOINT, {
        headers: { Accept: "application/json" }
      })
        .then((response) => (response.ok ? response.json() : []))
        .catch(() => [])
        .then((data) => (Array.isArray(data) ? data : []));
    }
    return this.relationshipIndexPromise;
  }

  async loadRelationshipDetail(id, url) {
    if (!id) return null;
    const cacheKey = String(id);
    if (this.relationshipDetailCache.has(cacheKey)) {
      return this.relationshipDetailCache.get(cacheKey);
    }
    const detailPromise = fetch(url || `${API_BASE}/relationships/${cacheKey}.json`, {
      headers: { Accept: "application/json" }
    })
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null);
    this.relationshipDetailCache.set(cacheKey, detailPromise);
    return detailPromise;
  }

  matches(detail, q) {
    if (!detail) return false;
    const upstream = detail?.events?.upstream_event?.name;
    const downstream = detail?.events?.downstream_event?.name;
    const composite = [upstream, downstream]
      .filter(Boolean)
      .map(normalizeText);
    return composite.some((value) => value.includes(q));
  }

  async search({ query, limit = 10 }) {
    const normalized = query?.trim();
    if (!normalized || normalized.length < MIN_QUERY_LENGTH) return [];

    const lower = normalized.toLowerCase();
    const index = await this.ensureIndex();

    const candidateId = parseRelationshipId(normalized);
    if (candidateId) {
      const meta = index.find((item) => String(item?.id) === candidateId);
      const detail = await this.loadRelationshipDetail(
        candidateId,
        meta?.url
      );
      const formatted = await this.formatEntry(detail);
      const picked = this.pickFields(formatted);
      return picked ? [picked] : [];
    }

    const matches = [];
    for (const meta of index) {
      if (matches.length >= limit) break;
      const detail = await this.loadRelationshipDetail(meta?.id, meta?.url);
      if (this.matches(detail, lower)) {
        matches.push(detail);
      }
    }

    const formatted = await Promise.all(matches.map((doc) => this.formatEntry(doc)));
    return formatted
      .map((entry) => this.pickFields(entry))
      .filter(Boolean);
  }

  async formatEntry(detail) {
    if (!detail?.id) return null;
    const upstream = detail?.events?.upstream_event;
    const downstream = detail?.events?.downstream_event;
    const upstreamName = upstream?.name?.trim();
    const downstreamName = downstream?.name?.trim();
    const idUrl = `https://aopwiki.org/relationships/${detail.id}`;
    const label = upstreamName && downstreamName
      ? `${upstreamName} → ${downstreamName}`
      : `Relationship ${detail.id}`;

    return {
      "@id": idUrl,
      "@type": this.type,
      name: label,
      description: `${upstreamName || "Unknown upstream"} to ${downstreamName || "unknown downstream"} relationship`,
      identifier: idUrl,
      upstream_event: upstreamName,
      downstream_event: downstreamName,
      url: idUrl
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
