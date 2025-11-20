const CROSSREF_BASE = import.meta.env?.DEV
  ? "/lookup/crossref"
  : "https://api.crossref.org";
const WORKS_ENDPOINT = `${CROSSREF_BASE}/works`;
const MIN_QUERY_LENGTH = 3;
const DOI_REGEX = /10\.\d{4,9}\/[-._;()/:a-z0-9]+/i;

async function safeJsonFetch(url) {
  try {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function extractDoi(raw = "") {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const viaUrl = new URL(trimmed);
    if (viaUrl.hostname.toLowerCase().includes("doi.org")) {
      return viaUrl.pathname.replace(/^\/+/u, "");
    }
  } catch {
    // not a URL
  }
  const normalized = trimmed.replace(/^doi:/i, "");
  const match = DOI_REGEX.exec(normalized);
  return match ? match[0] : null;
}

function formatDate(work = {}) {
  const possible = [
    work["published-print"],
    work["published-online"],
    work["issued"]
  ];
  for (const part of possible) {
    const formatted = formatDateParts(part?.["date-parts"]);
    if (formatted) return formatted;
  }
  const year = work["published"]?.["date-parts"]?.[0]?.[0];
  return year ? String(year) : undefined;
}

function formatDateParts(parts) {
  if (!Array.isArray(parts) || !parts.length) return undefined;
  const [year, month, day] = parts[0];
  if (!year) return undefined;
  if (!month) return String(year);
  if (!day) return `${year}-${String(month).padStart(2, "0")}`;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatAuthors(authors = []) {
  if (!Array.isArray(authors)) return [];
  return authors
    .map((author) => {
      if (!author) return null;
      const given = author.given?.trim();
      const family = author.family?.trim();
      const label = [given, family].filter(Boolean).join(" ").trim();
      const person = { "@type": "Person" };
      if (author.ORCID) {
        const clean = author.ORCID.replace("http://", "https://").trim();
        person["@id"] = clean;
      }
      if (label) person.name = label;
      if (given) person.givenName = given;
      if (family) person.familyName = family;
      return person["@id"] || person.name ? person : null;
    })
    .filter(Boolean);
}

function buildCitation({ authors = [], title, journal, year, volume, issue, pages, doi } = {}) {
  const names = authors
    .map((author) => author.name)
    .filter(Boolean);
  const authorPart = names.length ? `${names.join(", ")}, ` : "";
  const pieces = [
    authorPart && `${authorPart}`,
    title ? `"${title}"` : null,
    journal,
    volume ? `vol. ${volume}` : null,
    issue ? `no. ${issue}` : null,
    pages ? `pp. ${pages}` : null,
    year,
    doi ? `doi: ${doi.replace(/^https?:\/\//i, "")}` : null
  ].filter(Boolean);
  return pieces.join(", ");
}

function cleanEntity(entity = {}) {
  return Object.fromEntries(
    Object.entries(entity).filter(([, value]) => {
      if (value === undefined || value === null) return false;
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === "object") return Object.keys(value).length > 0;
      if (typeof value === "string") return value.trim().length > 0;
      return true;
    })
  );
}

export default class Lookup {
  constructor(opt = {}) {
    this.fields = opt.fields;
    this.type = opt.type || "ScholarlyArticle";
  }

  async search({ query, limit = 10 }) {
    const normalized = query?.trim();
    if (!normalized || normalized.length < MIN_QUERY_LENGTH) return [];

    const doiCandidate = extractDoi(normalized);
    if (doiCandidate) {
      const work = await this.fetchByDoi(doiCandidate);
      if (!work) return [];
      const entity = this.pickFields(this.formatWork(work));
      return entity ? [entity] : [];
    }

    const rows = Math.min(Math.max(limit, 1), 20);
    const params = new URLSearchParams({
      query: normalized,
      rows: rows.toString()
    });
    const payload = await safeJsonFetch(`${WORKS_ENDPOINT}?${params.toString()}`);
    const items = payload?.message?.items ?? [];
    return items
      .slice(0, limit)
      .map((work) => this.pickFields(this.formatWork(work)))
      .filter(Boolean);
  }

  async fetchByDoi(doi) {
    if (!doi) return null;
    const encoded = encodeURIComponent(doi.toLowerCase());
    const payload = await safeJsonFetch(`${WORKS_ENDPOINT}/${encoded}`);
    return payload?.message ?? null;
  }

  formatWork(work = {}) {
    const doi = work.DOI?.trim();
    const doiUrl = doi ? `https://doi.org/${doi}` : undefined;
    const authors = formatAuthors(work.author);
    const journal = work["container-title"]?.[0];
    const datePublished = formatDate(work);
    const volume = work.volume;
    const issue = work.issue;
    const pages = work.page;
    const issn = work.ISSN?.[0] || work["issn-type"]?.[0]?.value;
    const creditText = buildCitation({
      authors,
      title: work.title?.[0],
      journal,
      volume,
      issue,
      pages,
      year: datePublished?.substring(0, 4),
      doi: doiUrl
    });
    const entity = {
      "@id": doiUrl,
      "@type": this.type,
      name: work.title?.[0],
      author: authors,
      identifier: doiUrl,
      issn,
      journal,
      datePublished,
      creditText,
      publisher: work.publisher
    };
    return cleanEntity(entity);
  }

  pickFields(entity) {
    if (!entity) return null;
    const cleaned = cleanEntity(entity);
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
    return Object.keys(projection).length ? projection : null;
  }
}
