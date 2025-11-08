const ORCID_BASE = import.meta.env?.DEV
  ? "/lookup/orcid"
  : "https://pub.orcid.org";
const SEARCH_ENDPOINT = `${ORCID_BASE}/v3.0/expanded-search/`;
const MIN_QUERY_LENGTH = 2;

async function safeJsonFetch(url) {
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" }
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export default class Lookup {
  constructor(opt = {}) {
    this.fields = opt.fields;
    this.type = opt.type || "Person";
  }

  async search({ query, limit = 10 }) {
    const normalized = query?.trim();
    if (!normalized || normalized.length < MIN_QUERY_LENGTH) return [];

    const encodedQuery = encodeURIComponent(normalized);
    const rowsParam = Math.min(Math.max(limit, 1), 50);
    const url = `${SEARCH_ENDPOINT}?q=${encodedQuery}&rows=${rowsParam}`;
    const payload = await safeJsonFetch(url);
    if (!payload?.["expanded-result"]) return [];

    return payload["expanded-result"]
      .slice(0, limit)
      .map((entry) => this.formatEntry(entry))
      .filter(Boolean)
      .map((entity) => this.pickFields(entity))
      .filter(Boolean);
  }

  formatEntry(entry = {}) {
    const orcidId = entry["orcid-id"];
    if (!orcidId) return null;
    const nameParts = [entry["given-names"], entry["family-names"]]
      .filter(Boolean)
      .join(" ")
      .trim();
    const orgs = (entry["institution-name"] || []).filter(Boolean);
    return {
      "@id": `https://orcid.org/${orcidId}`,
      "@type": this.type,
      name: nameParts || orcidId,
      givenName: entry["given-names"] || undefined,
      familyName: entry["family-names"] || undefined,
      affiliation: orgs.slice(0, 5)
    };
  }

  pickFields(entity) {
    if (!entity) return null;
    const cleaned = Object.fromEntries(
      Object.entries(entity).filter(
        ([, value]) =>
          value !== undefined &&
          value !== null &&
          !(Array.isArray(value) && !value.length)
      )
    );
    if (!this.fields?.length) return cleaned;
    const projection = {};
    for (const field of this.fields) {
      if (field in cleaned) projection[field] = cleaned[field];
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
