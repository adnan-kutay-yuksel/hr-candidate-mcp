/** Source-agnostic candidate model. Every provider maps its own data to this shape. */
export interface Experience {
  title: string;
  company: string;
  startDate?: string; // YYYY-MM
  endDate?: string; // YYYY-MM, omitted if current
  description?: string;
}

export interface Education {
  school: string;
  degree?: string;
  field?: string;
  endYear?: number;
}

export interface Candidate {
  id: string;
  source: string;
  fullName: string;
  headline?: string;
  location?: string;
  summary?: string;
  skills: string[];
  languages?: string[];
  experiences: Experience[];
  education: Education[];
  profileUrl?: string;
  fetchedAt: string; // ISO 8601
}

export interface SearchQuery {
  keywords?: string;
  skills?: string[];
  location?: string;
  title?: string;
  limit?: number;
}

/** Total years of experience across positions (overlaps are not deduplicated). */
export function totalYearsOfExperience(c: Candidate, now = new Date()): number {
  let months = 0;
  for (const e of c.experiences) {
    if (!e.startDate) continue;
    const start = parseYm(e.startDate);
    const end = e.endDate ? parseYm(e.endDate) : now;
    if (!start || !end) continue;
    months += Math.max(0, (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth());
  }
  return Math.round((months / 12) * 10) / 10;
}

function parseYm(s: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})/.exec(s);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, 1) : undefined;
}
