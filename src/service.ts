import { totalYearsOfExperience, type Candidate, type SearchQuery } from "./domain.js";
import type { CandidateProvider } from "./providers/provider.js";

/** Simple TTL cache in front of the provider, plus business logic (comparison, matching). */
export class CandidateService {
  private cache = new Map<string, { at: number; value: unknown }>();

  constructor(private readonly provider: CandidateProvider, private readonly ttlMs: number) {}

  get providerName() {
    return this.provider.name;
  }

  search(q: SearchQuery): Promise<Candidate[]> {
    return this.cached(`search:${JSON.stringify(q)}`, () => this.provider.search(q));
  }

  get(id: string): Promise<Candidate | undefined> {
    return this.cached(`get:${id}`, () => this.provider.get(id));
  }

  async getMany(ids: string[]): Promise<{ found: Candidate[]; missing: string[] }> {
    const results = await Promise.all(ids.map((id) => this.get(id)));
    return {
      found: results.filter((c): c is Candidate => !!c),
      missing: ids.filter((_, i) => !results[i]),
    };
  }

  /** Simple, explainable scoring against role requirements. */
  score(c: Candidate, role: { requiredSkills: string[]; niceToHaveSkills?: string[]; minYears?: number }) {
    const has = new Set(c.skills.map((s) => s.toLowerCase()));
    const matchedRequired = role.requiredSkills.filter((s) => has.has(s.toLowerCase()));
    const missingRequired = role.requiredSkills.filter((s) => !has.has(s.toLowerCase()));
    const matchedNice = (role.niceToHaveSkills ?? []).filter((s) => has.has(s.toLowerCase()));
    const years = totalYearsOfExperience(c);

    const reqScore = role.requiredSkills.length ? matchedRequired.length / role.requiredSkills.length : 1;
    const niceScore = role.niceToHaveSkills?.length ? matchedNice.length / role.niceToHaveSkills.length : 1;
    const yearsScore = role.minYears ? Math.min(1, years / role.minYears) : 1;
    const score = Math.round((reqScore * 0.6 + yearsScore * 0.3 + niceScore * 0.1) * 100);

    return { candidateId: c.id, fullName: c.fullName, score, years, matchedRequired, missingRequired, matchedNice };
  }

  private async cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < this.ttlMs) return hit.value as T;
    const value = await fn();
    this.cache.set(key, { at: Date.now(), value });
    return value;
  }
}
