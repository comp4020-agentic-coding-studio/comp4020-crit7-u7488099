import { describe, expect, inject, it } from "vitest";

// Crit 7's own spec contract: "the core flow persists across a reload —
// create something, and it's still there." Here, creating something means
// adding a planned course to the study plan: a course code, the year and
// semester it's planned for, and which degree requirement it counts
// towards. Posts against the seeded catalogue (COMP1100, part of the BAC
// Core requirement and free of any prerequisite — see src/lib/seed.ts)
// rather than invented values, so this exercises the real requirement_id
// foreign key once the API exists, and stays valid once prerequisite
// validation is added later. This starts red — there is no study-plan
// feature yet — and turns green once the app implements it.
const baseUrl = inject("baseUrl");

describe("plan entry", () => {
  const courseCode = "COMP1100"; // seeded: BAC Core, no prerequisite
  const requirementCode = "BAC-CORE"; // seeded requirement's natural key
  const year = "2027";
  const semester = "S1";

  // Astro checks form POSTs carry a same-origin Origin header (CSRF
  // protection); browsers send it automatically, a bare fetch doesn't.
  const post = (path: string, body: URLSearchParams) =>
    fetch(new URL(path, baseUrl), {
      method: "POST",
      headers: { origin: baseUrl },
      body,
      redirect: "manual",
    });

  it("accepts a planned course and redirects back to the study plan", async () => {
    const res = await post(
      "/api/plan-entries",
      new URLSearchParams({ courseCode, year, semester, requirementCode }),
    );
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/");
  });

  it("persists the plan entry: a fresh page load includes it", async () => {
    const res = await fetch(baseUrl);
    const body = await res.text();
    expect(body).toContain(courseCode);
    expect(body).toContain(year);
    expect(body).toContain(semester);
    expect(body).toContain(requirementCode);
  });
});
