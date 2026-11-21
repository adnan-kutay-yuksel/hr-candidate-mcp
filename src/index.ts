#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { CandidateService } from "./service.js";
import { registerTools } from "./tools.js";

const cfg = loadConfig();
const svc = new CandidateService(cfg.provider, cfg.cacheTtlSeconds * 1000);

const server = new McpServer(
  { name: "hr-candidate-mcp", version: "0.1.0" },
  {
    instructions:
      "Lets HR teams ask questions about candidates. Start with search_candidates or match_candidates_to_role to find candidates, " +
      "then use get_candidate / compare_candidates for details. Scores are a pre-screen only; do not infer or evaluate " +
      "protected characteristics such as age, gender, or ethnicity.",
  },
);
registerTools(server, svc);

await server.connect(new StdioServerTransport());
console.error(`hr-candidate-mcp running (provider: ${svc.providerName})`);
