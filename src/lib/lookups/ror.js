// Try the public API first (works on static hosts), then fall back to a same-origin proxy if present.
const ROR_PUBLIC = "https://api.ror.org";
const ROR_PROXY = "/lookup/ror";
const API_PUBLIC = `${ROR_PUBLIC}/v2/organizations`;
const API_PROXY = `${ROR_PROXY}/v2/organizations`;
const MAX_RESULTS = 20;
const MIN_QUERY_LENGTH = 2;

async function safeJsonFetch(url) {
  try {
    const response = await fetch(url, {
      mode: "cors",
      headers: { Accept: "application/json" }
    });
    if (response.ok) return await response.json();
  } catch (_) {
    // ignore
  }
  return null;
}

async function fetchWithFallback(url) {
  // 1) Direct public API (works on static hosting)
  const primary = await safeJsonFetch(url.replace(API_PROXY, API_PUBLIC));
  if (primary) return primary;
  // 2) Same-origin proxy (dev server / reverse proxy)
  const fallback = await safeJsonFetch(url.replace(API_PUBLIC, API_PROXY));
  return fallback;
}

export default class Lookup {
  constructor(opt = {}) {
    this.fields = opt.fields;
  }

  async search({ query, limit = 20 }) {
    const normalized = query?.trim();
    if (!normalized || normalized.length < MIN_QUERY_LENGTH) return [];

    const size = Math.min(Math.max(limit, 1), MAX_RESULTS);
    // ROR API v2 no longer accepts a custom size parameter; default is 20.
    const url = `${API_PUBLIC}?query=${encodeURIComponent(normalized)}&page=1`;
    const payload = await fetchWithFallback(url);
    if (!payload?.items?.length) return [];

    return payload.items
      .slice(0, size)
      .map((item) => this.formatItem(item))
      .filter(Boolean)
      .map((entity) => this.pickFields(entity))
      .filter(Boolean);
  }

  formatItem(item) {
    if (!item?.id) return null;
    const displayName =
      item?.names?.find((n) => Array.isArray(n.types) && n.types.includes("ror_display"))?.value ||
      item?.name ||
      null;
    return {
      "@id": item.id,
      "@type": "Organization",
      name: displayName
    };
  }

  pickFields(entity) {
    if (!entity) return null;
    if (!this.fields?.length) return entity;
    const projection = {};
    for (const field of this.fields) {
      if (field in entity) projection[field] = entity[field];
    }
    if (!("@type" in projection) && entity["@type"]) projection["@type"] = entity["@type"];
    if (!("@id" in projection) && entity["@id"]) projection["@id"] = entity["@id"];
    if (!Object.keys(projection).length) return null;
    return projection;
  }
}
