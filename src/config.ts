import type { CandidateProvider } from "./providers/provider.js";
import { MockProvider } from "./providers/mock.js";
import { LinkedInProvider } from "./providers/linkedin.js";

export interface AppConfig {
  provider: CandidateProvider;
  cacheTtlSeconds: number;
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Environment variable ${name} is required (see .env.example)`);
  return v;
}

export function loadConfig(env = process.env): AppConfig {
  const kind = env.CANDIDATE_PROVIDER ?? "mock";
  let provider: CandidateProvider;
  switch (kind) {
    case "mock":
      provider = new MockProvider();
      break;
    case "linkedin":
      provider = new LinkedInProvider({
        clientId: required("LINKEDIN_CLIENT_ID"),
        clientSecret: required("LINKEDIN_CLIENT_SECRET"),
        apiBase: env.LINKEDIN_API_BASE || "https://api.linkedin.com",
        tokenUrl: env.LINKEDIN_TOKEN_URL || "https://www.linkedin.com/oauth/v2/accessToken",
        apiVersion: env.LINKEDIN_API_VERSION || undefined,
        searchPath: required("LINKEDIN_SEARCH_PATH"),
        profilePath: required("LINKEDIN_PROFILE_PATH"),
      });
      break;
    default:
      throw new Error(`Unknown CANDIDATE_PROVIDER: ${kind} (expected: mock | linkedin)`);
  }
  return { provider, cacheTtlSeconds: Number(env.CACHE_TTL_SECONDS ?? 900) };
}
