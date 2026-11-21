import type { Candidate, SearchQuery } from "../domain.js";
import type { CandidateProvider } from "./provider.js";

const now = new Date().toISOString();

/** Fictional candidates for development and testing. Any resemblance to real people is coincidental. */
const CANDIDATES: Candidate[] = [
  {
    id: "mock-1",
    source: "mock",
    fullName: "Alex Morgan",
    headline: "Senior Backend Engineer",
    location: "Berlin, Germany",
    summary: "8 years building distributed systems and payment infrastructure.",
    skills: ["Go", "PostgreSQL", "Kubernetes", "gRPC", "AWS"],
    languages: ["English", "German"],
    experiences: [
      { title: "Senior Backend Engineer", company: "Example Payments Inc.", startDate: "2021-03" },
      { title: "Backend Engineer", company: "Example Logistics", startDate: "2017-06", endDate: "2021-02" },
    ],
    education: [{ school: "Example Technical University", degree: "BSc", field: "Computer Science", endYear: 2017 }],
    fetchedAt: now,
  },
  {
    id: "mock-2",
    source: "mock",
    fullName: "Sam Rivera",
    headline: "Frontend Lead",
    location: "London, United Kingdom",
    summary: "Leads teams working on React applications and design systems.",
    skills: ["TypeScript", "React", "Next.js", "Design Systems", "GraphQL"],
    languages: ["English", "Spanish"],
    experiences: [
      { title: "Frontend Lead", company: "Example Commerce", startDate: "2022-01" },
      { title: "Frontend Developer", company: "Example Agency", startDate: "2018-09", endDate: "2021-12" },
    ],
    education: [{ school: "Example University", degree: "BSc", field: "Software Engineering", endYear: 2018 }],
    fetchedAt: now,
  },
  {
    id: "mock-3",
    source: "mock",
    fullName: "Jordan Lee",
    headline: "Data Engineer",
    location: "Toronto, Canada",
    skills: ["Python", "Spark", "Airflow", "SQL", "AWS"],
    languages: ["English", "French"],
    experiences: [{ title: "Data Engineer", company: "Example Telecom", startDate: "2020-05" }],
    education: [{ school: "Example State University", degree: "MSc", field: "Data Science", endYear: 2020 }],
    fetchedAt: now,
  },
];

export class MockProvider implements CandidateProvider {
  readonly name = "mock";

  async search(q: SearchQuery): Promise<Candidate[]> {
    const lc = (s?: string) => (s ?? "").toLowerCase();
    return CANDIDATES.filter((c) => {
      const haystack = lc([c.fullName, c.headline, c.summary, c.skills.join(" "), c.experiences.map((e) => e.title).join(" ")].join(" "));
      if (q.keywords && !lc(q.keywords).split(/\s+/).every((k) => haystack.includes(k))) return false;
      if (q.location && !lc(c.location).includes(lc(q.location))) return false;
      if (q.title && !lc(c.headline).includes(lc(q.title))) return false;
      if (q.skills?.length && !q.skills.every((s) => c.skills.some((cs) => lc(cs) === lc(s)))) return false;
      return true;
    }).slice(0, q.limit ?? 20);
  }

  async get(id: string): Promise<Candidate | undefined> {
    return CANDIDATES.find((c) => c.id === id);
  }
}
