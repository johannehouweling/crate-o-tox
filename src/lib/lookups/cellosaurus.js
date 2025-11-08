const CELL_BASE = import.meta.env?.DEV
  ? "/lookup/cellosaurus"
  : "https://api.cellosaurus.org";
const API_URL = `${CELL_BASE}/search/cell-line`;
const ORIGIN_FALLBACK = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
const MIN_QUERY_LENGTH = 2;

function primaryValue(list = [], preferredType = "primary") {
  if (!Array.isArray(list)) return undefined;
  const preferred = list.find((entry) => entry?.type === preferredType);
  return (preferred || list[0])?.value;
}

export default class Lookup {
  constructor(opt = {}) {
    this.fields = opt.fields;
    this.type = opt.type || "CellLine";
  }

  async search({ query, limit = 10 }) {
    const normalized = query?.trim();
    if (!normalized || normalized.length < MIN_QUERY_LENGTH) return [];
    const url = new URL(API_URL, ORIGIN_FALLBACK);
    url.searchParams.set("q", normalized);
    url.searchParams.set("rows", String(limit || 10));

    let payload;
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" }
      });
      if (!response.ok) {
        return [];
      }
      payload = await response.json();
    } catch (error) {
      return [];
    }

    const entries = payload?.Cellosaurus?.["cell-line-list"];
    if (!Array.isArray(entries)) return [];

    return entries
      .map((entry) => this.formatEntry(entry))
      .filter(Boolean);
  }

  formatEntry(entry) {
    if (!entry) return null;
    const accession = primaryValue(entry["accession-list"]);
    const name =
      primaryValue(entry["name-list"], "identifier") ||
      primaryValue(entry["name-list"]);
    const speciesList = (entry["species-list"] || [])
      .map((item) => item?.label || item?.accession || item?.value)
      .filter(Boolean);

    const entity = {
      "@id": accession ? `https://www.cellosaurus.org/${accession}` : undefined,
      "@type": this.type,
      name,
      accession,
      species: speciesList,
    };
    return this.pickFields(entity);
  }

  pickFields(entity) {
    if (!entity) return null;
    const cleaned = Object.fromEntries(
      Object.entries(entity).filter(([, value]) => value !== undefined && value !== null)
    );
    if (!this.fields?.length) return cleaned;
    const projected = {};
    for (const field of this.fields) {
      if (field in cleaned) projected[field] = cleaned[field];
    }
    if (!("@type" in projected) && cleaned["@type"]) {
      projected["@type"] = cleaned["@type"];
    }
    return projected;
  }
}
