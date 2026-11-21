import type { Candidate, SearchQuery } from "../domain.js";
import { ProviderError, type CandidateProvider } from "./provider.js";

/**
 * Official LinkedIn API adapter.
 *
 * LinkedIn APIs that expose candidate data (Talent Solutions / Recruiter System Connect, etc.)
 * are only available to approved LinkedIn partners. Endpoints and response schemas vary by
 * agreement, so this adapter reads endpoints from configuration and maps responses to the
 * shared model via `mapCandidate`. Adapt `mapCandidate` and `buildSearchParams` to your
 * partner documentation if needed.
 *
 * This adapter intentionally does not include scraping, browser automation, or session
 * impersonation.
 */
export interface LinkedInConfig {
  clientId: string;
  clientSecret: string;
  apiBase: string;
  tokenUrl: string;
  apiVersion?: string;
  searchPath: string;
  profilePath: string; // contains an "{id}" placeholder
}

export class LinkedInProvider implements CandidateProvider {
  readonly name = "linkedin";
  private token?: { value: string; expiresAt: number };

  constructor(private readonly cfg: LinkedInConfig) {}

  async search(q: SearchQuery): Promise<Candidate[]> {
    const url = new URL(this.cfg.searchPath, this.cfg.apiBase);
    for (const [k, v] of Object.entries(buildSearchParams(q))) url.searchParams.set(k, v);
    const body = await this.request(url);
    const elements: unknown[] = Array.isArray((body as any)?.elements) ? (body as any).elements : [];
    return elements.map(mapCandidate);
  }

  async get(id: string): Promise<Candidate | undefined> {
    const url = new URL(this.cfg.profilePath.replace("{id}", encodeURIComponent(id)), this.cfg.apiBase);
    try {
      return mapCandidate(await this.request(url));
    } catch (e) {
      if (e instanceof ProviderError && e.status === 404) return undefined;
      throw e;
    }
  }

  private async request(url: URL, retry = true): Promise<unknown> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${await this.accessToken()}`,
      "X-Restli-Protocol-Version": "2.0.0",
    };
    if (this.cfg.apiVersion) headers["LinkedIn-Version"] = this.cfg.apiVersion;

    const res = await fetch(url, { headers });
    if (res.status === 401 && retry) {
      this.token = undefined;
      return this.request(url, false);
    }
    if (res.status === 429) throw new ProviderError("LinkedIn API rate limit reached, please retry later.", 429);
    if (!res.ok) throw new ProviderError(`LinkedIn API error: ${res.status} ${await res.text()}`, res.status);
    return res.json();
  }

  /** OAuth 2.0 client credentials flow; the token is kept in memory until it expires. */
  private async accessToken(): Promise<string> {
    if (this.token && Date.now() < this.token.expiresAt - 60_000) return this.token.value;
    const res = await fetch(this.cfg.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: this.cfg.clientId,
        client_secret: this.cfg.clientSecret,
      }),
    });
    if (!res.ok) throw new ProviderError(`Failed to obtain LinkedIn access token: ${res.status}`, res.status);
    const json = (await res.json()) as { access_token: string; expires_in: number };
    this.token = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
    return this.token.value;
  }
}

export function buildSearchParams(q: SearchQuery): Record<string, string> {
  const p: Record<string, string> = { count: String(q.limit ?? 20) };
  if (q.keywords) p.keywords = q.keywords;
  if (q.title) p.title = q.title;
  if (q.location) p.location = q.location;
  if (q.skills?.length) p.skills = q.skills.join(",");
  return p;
}

/** Maps a raw API response to the shared model. Adjust field names to your partner schema. */
export function mapCandidate(raw: unknown): Candidate {
  const r = (raw ?? {}) as Record<string, any>;
  const str = (v: unknown) => (typeof v === "string" ? v : undefined);
  const name = str(r.fullName) ?? [str(r.firstName), str(r.lastName)].filter(Boolean).join(" ");
  return {
    id: String(r.id ?? r.urn ?? ""),
    source: "linkedin",
    fullName: name || "(unnamed)",
    headline: str(r.headline),
    location: str(r.location?.name ?? r.location),
    summary: str(r.summary),
    skills: Array.isArray(r.skills) ? r.skills.map((s: any) => String(s?.name ?? s)) : [],
    languages: Array.isArray(r.languages) ? r.languages.map((l: any) => String(l?.name ?? l)) : undefined,
    experiences: Array.isArray(r.positions)
      ? r.positions.map((p: any) => ({
          title: String(p.title ?? ""),
          company: String(p.companyName ?? p.company?.name ?? ""),
          startDate: ym(p.startDate),
          endDate: ym(p.endDate),
          description: str(p.description),
        }))
      : [],
    education: Array.isArray(r.educations)
      ? r.educations.map((e: any) => ({
          school: String(e.schoolName ?? e.school?.name ?? ""),
          degree: str(e.degreeName),
          field: str(e.fieldOfStudy),
          endYear: typeof e.endDate?.year === "number" ? e.endDate.year : undefined,
        }))
      : [],
    profileUrl: str(r.profileUrl ?? r.publicProfileUrl),
    fetchedAt: new Date().toISOString(),
  };
}

function ym(d: any): string | undefined {
  if (typeof d === "string") return d;
  if (d && typeof d.year === "number") return `${d.year}-${String(d.month ?? 1).padStart(2, "0")}`;
  return undefined;
}
