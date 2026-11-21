import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { totalYearsOfExperience } from "./domain.js";
import type { CandidateService } from "./service.js";

const json = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });
const fail = (e: unknown) => ({ isError: true, content: [{ type: "text" as const, text: e instanceof Error ? e.message : String(e) }] });
const readOnly = { readOnlyHint: true, openWorldHint: true };

export function registerTools(server: McpServer, svc: CandidateService) {
  server.registerTool(
    "search_candidates",
    {
      title: "Search candidates",
      description: "Search candidates by keywords, skills, title, or location. Returns a short summary list; use get_candidate for details.",
      inputSchema: {
        keywords: z.string().optional().describe("Free text, e.g. 'backend payments'"),
        skills: z.array(z.string()).optional().describe("Skills the candidate must have"),
        title: z.string().optional(),
        location: z.string().optional(),
        limit: z.number().int().min(1).max(50).optional(),
      },
      annotations: readOnly,
    },
    async (q) => {
      try {
        const list = await svc.search(q);
        return json(
          list.map((c) => ({
            id: c.id,
            fullName: c.fullName,
            headline: c.headline,
            location: c.location,
            years: totalYearsOfExperience(c),
            topSkills: c.skills.slice(0, 5),
          })),
        );
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "get_candidate",
    {
      title: "Get candidate",
      description: "Return a candidate's full profile: experience, education, skills, and languages.",
      inputSchema: { id: z.string() },
      annotations: readOnly,
    },
    async ({ id }) => {
      try {
        const c = await svc.get(id);
        if (!c) return fail(`Candidate not found: ${id}`);
        return json({ ...c, totalYearsOfExperience: totalYearsOfExperience(c) });
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "compare_candidates",
    {
      title: "Compare candidates",
      description: "Compare 2-10 candidates side by side: years of experience, common and unique skills, education.",
      inputSchema: { ids: z.array(z.string()).min(2).max(10) },
      annotations: readOnly,
    },
    async ({ ids }) => {
      try {
        const { found, missing } = await svc.getMany(ids);
        const skillSets = found.map((c) => new Set(c.skills));
        const common = found.length ? [...skillSets[0]].filter((s) => skillSets.every((set) => set.has(s))) : [];
        return json({
          missing,
          commonSkills: common,
          candidates: found.map((c) => ({
            id: c.id,
            fullName: c.fullName,
            headline: c.headline,
            location: c.location,
            years: totalYearsOfExperience(c),
            currentRole: c.experiences.find((e) => !e.endDate),
            uniqueSkills: c.skills.filter((s) => !common.includes(s)),
            education: c.education,
            languages: c.languages,
          })),
        });
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "match_candidates_to_role",
    {
      title: "Match candidates to role",
      description:
        "Search and rank candidates against role requirements (required skills 60%, years of experience 30%, nice-to-have skills 10%). The score is a pre-screen, not a hiring decision.",
      inputSchema: {
        requiredSkills: z.array(z.string()).min(1),
        niceToHaveSkills: z.array(z.string()).optional(),
        minYears: z.number().min(0).optional(),
        keywords: z.string().optional(),
        location: z.string().optional(),
        limit: z.number().int().min(1).max(50).optional(),
      },
      annotations: readOnly,
    },
    async ({ requiredSkills, niceToHaveSkills, minYears, keywords, location, limit }) => {
      try {
        // Required skills are not used as a search filter so that partial matches still show up.
        const pool = await svc.search({ keywords, location, limit: 50 });
        const ranked = pool
          .map((c) => svc.score(c, { requiredSkills, niceToHaveSkills, minYears }))
          .sort((a, b) => b.score - a.score)
          .slice(0, limit ?? 10);
        return json(ranked);
      } catch (e) {
        return fail(e);
      }
    },
  );
}
