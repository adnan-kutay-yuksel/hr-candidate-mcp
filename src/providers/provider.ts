import type { Candidate, SearchQuery } from "../domain.js";

/**
 * Data source contract. To add a new source (an ATS, another API, ...),
 * implement this interface and register it in src/config.ts.
 */
export interface CandidateProvider {
  readonly name: string;
  search(query: SearchQuery): Promise<Candidate[]>;
  get(id: string): Promise<Candidate | undefined>;
}

export class ProviderError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "ProviderError";
  }
}
