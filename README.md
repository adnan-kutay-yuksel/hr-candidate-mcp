# hr-candidate-mcp

An open-source [Model Context Protocol](https://modelcontextprotocol.io) server that lets HR teams ask Claude (or any MCP client) questions about candidates.

> "List candidates in Berlin with 5+ years of Go experience."
> "Compare mock-1 and mock-3."
> "Rank candidates for a role that requires Go and AWS, with Kubernetes as a nice-to-have."

## Data sources (providers)

| Provider   | When to use                                                                 |
|------------|-----------------------------------------------------------------------------|
| `mock`     | Development and demos. Uses fictional candidates, no credentials needed.     |
| `linkedin` | Organizations with **official LinkedIn API access** (Talent Solutions / Recruiter System Connect partners). Fetches data automatically. |

LinkedIn APIs that expose candidate data are not publicly available. This project does **not** include scraping, browser automation, or session impersonation, and will not accept contributions that add them. The `linkedin` adapter reads the endpoints from your partner agreement via environment variables. If your response schema differs, adapt `mapCandidate` in `src/providers/linkedin.ts`.

To add a new source (an ATS, etc.), implement the `CandidateProvider` interface and register it in `src/config.ts`.

## Tools

- `search_candidates`: search by keywords, skills, title, and location
- `get_candidate`: full profile
- `compare_candidates`: side-by-side comparison of 2-10 candidates
- `match_candidates_to_role`: explainable scoring against role requirements (required skills 60%, experience 30%, nice-to-have skills 10%)

## Setup

```bash
npm install
npm run build
```

Add it to your Claude Desktop config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "hr-candidates": {
      "command": "node",
      "args": ["/absolute/path/to/hr-candidate-mcp/dist/index.js"],
      "env": { "CANDIDATE_PROVIDER": "mock" }
    }
  }
}
```

Variables required for the `linkedin` provider are listed in `.env.example`.

## Architecture

```
src/
  index.ts            stdio MCP server
  tools.ts            MCP tool definitions
  service.ts          cache + comparison/scoring logic
  domain.ts           source-agnostic candidate model
  config.ts           environment variables -> provider selection
  providers/
    provider.ts       CandidateProvider interface
    mock.ts           fictional test data
    linkedin.ts       official LinkedIn API adapter (OAuth 2.0 client credentials)
```

## Responsible use

- Candidate data is personal data. Compliance with GDPR and other applicable privacy laws is the responsibility of the organization running the server.
- Scores are a pre-screen, not a hiring decision.
- Do not evaluate candidates based on protected characteristics such as age, gender, or ethnicity.

## Roadmap

- [ ] Persistent cache (SQLite)
- [ ] Remote (HTTP) transport with OAuth for team use
- [ ] ATS providers (Greenhouse, Lever)
- [ ] Unit tests and CI

## License

MIT
