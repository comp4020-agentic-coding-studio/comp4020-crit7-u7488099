import { describe, expect, inject, it } from "vitest";

// The heart of the product: given a selected degree (or two) and courses
// already completed, which relevant courses can the student take next, and
// which ones are still blocked? Exercises the seeded three-course BAC chain
// (COMP1130 -> COMP2100 -> COMP3600, see src/lib/seed.ts) alongside the
// Finance side, so a double-degree selection and a single completion show
// both an unlocked course and a still-blocked one at once. Starts red —
// there's no degree-selection or completed-course feature yet — and turns
// green once the app implements it.
const baseUrl = inject("baseUrl");

describe("recommendations", () => {
  const post = (path: string, body: URLSearchParams) =>
    fetch(new URL(path, baseUrl), {
      method: "POST",
      headers: { origin: baseUrl },
      body,
      redirect: "manual",
    });

  it("accepts a double-degree selection and redirects back to the study plan", async () => {
    const body = new URLSearchParams();
    body.set("mode", "double");
    body.append("degreeCode", "BAC");
    body.append("degreeCode", "BFIN");
    const res = await post("/api/degree-selection", body);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/");
  });

  it("accepts a completed course and redirects back to the study plan", async () => {
    const res = await post("/api/completed-courses", new URLSearchParams({ courseCode: "COMP1130" }));
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/");
  });

  it("shows the unlocked course, the still-blocked course, and both selected degrees on reload", async () => {
    const res = await fetch(baseUrl);
    const body = await res.text();

    // BAC: COMP1130 completed unlocks COMP2100, but COMP3600 stays blocked on COMP2100.
    expect(body).toContain("COMP2100");
    expect(body).toContain("COMP3600");
    expect(body).toMatch(/COMP2100[^]*unlocks[^]*COMP3600/);
    expect(body).toMatch(/COMP3600[^]*(blocked|needs)[^]*COMP2100/);

    // BFIN: selected as the double-degree partner, so its courses appear too.
    expect(body).toContain("FINM1001");
    expect(body).toContain("FINM2001");
  });
});

// Stage 4: "Plan course" on a recommendation must go through the same
// plan_entries table the manual form uses (no second planning mechanism),
// show up grouped by year/semester in "My Study Plan", persist across a
// reload, refuse an obvious duplicate, and be removable. Builds directly on
// the state the "recommendations" describe block above already established
// (double BAC+BFIN, COMP1130 completed, so COMP2100 is available) rather than
// re-deriving it — appended to this file rather than a new one so Vitest's
// in-file ordering guarantees it runs after that state exists, with no risk
// of racing another file's mutation of the same global tables.
describe("planning from a recommendation", () => {
  const post = (path: string, body: URLSearchParams) =>
    fetch(new URL(path, baseUrl), {
      method: "POST",
      headers: { origin: baseUrl },
      body,
      redirect: "manual",
    });

  it("plans an available recommended course for a given year and semester", async () => {
    const res = await post(
      "/api/plan-entries",
      new URLSearchParams({ courseCode: "COMP2100", requirementCode: "BAC-CORE", year: "2028", semester: "S1" }),
    );
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/");
  });

  it("shows the planned course grouped under its year and semester, with requirement context", async () => {
    const res = await fetch(baseUrl);
    const body = await res.text();
    expect(body).toContain("2028 S1");
    expect(body).toMatch(/2028 S1[^]*COMP2100[^]*BAC-CORE/);
  });

  it("does not create a duplicate when the same course is planned again", async () => {
    const res = await post(
      "/api/plan-entries",
      new URLSearchParams({ courseCode: "COMP2100", requirementCode: "BAC-CORE", year: "2030", semester: "S2" }),
    );
    expect(res.status).toBe(303);

    const page = await fetch(baseUrl);
    const body = await page.text();
    // The original term still holds the entry; no second group was created.
    expect(body).toContain("2028 S1");
    expect(body).not.toContain("2030 S2");
  });

  it("removes a planned course, and the removal persists across a reload", async () => {
    const res = await post("/api/plan-entries/remove", new URLSearchParams({ courseCode: "COMP2100" }));
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/");

    const page = await fetch(baseUrl);
    const body = await page.text();
    expect(body).not.toContain("2028 S1");
  });
});

// Stage 5: historical offering guidance (course_offerings, not a forecasting
// engine) and Browse Electives (courses with no requirement_courses row for
// the selected degree(s), planned through the same plan_entries mechanism
// with a null requirement). Appended to this file for the same reason as the
// Stage 4 block above: it builds on the double BAC+BFIN / COMP1130-completed
// state already established by the "recommendations" describe block, and
// in-file ordering keeps that dependency safe from cross-file races.
describe("historical offering guidance and electives", () => {
  const post = (path: string, body: URLSearchParams) =>
    fetch(new URL(path, baseUrl), {
      method: "POST",
      headers: { origin: baseUrl },
      body,
      redirect: "manual",
    });

  const section = (body: string, id: string) => {
    const match = body.match(new RegExp(`<ul id="${id}">([^]*?)</ul>`));
    return match ? match[1] : "";
  };

  it("shows COMP2100's S1-only pattern next to the course it unlocks, and COMP3600's S2-only pattern", async () => {
    const res = await fetch(baseUrl);
    const body = await res.text();

    expect(body).toMatch(/COMP2100[^]*unlocks[^]*COMP3600[^]*Historically offered: Semester 1/);
    expect(body).toMatch(/COMP2100[^]*Planning note: historically S1 only/);
    expect(body).toMatch(/COMP3600[^]*Historically offered: Semester 2/);
    expect(body).toMatch(/COMP3600[^]*Planning note: historically S2 only/);
  });

  it("includes a disclaimer that historical offerings are not a guarantee of future availability", async () => {
    const res = await fetch(baseUrl);
    const body = await res.text();
    expect(body).toMatch(/not a prediction or guarantee/);
  });

  it("lists ECON1101 under Browse Electives, not in the degree recommendations", async () => {
    const res = await fetch(baseUrl);
    const body = await res.text();

    expect(section(body, "electives")).toContain("ECON1101");
    expect(section(body, "recommendations")).not.toContain("ECON1101");
  });

  it("plans an elective into the study plan with no requirement, and it persists across reload", async () => {
    const planRes = await post(
      "/api/plan-entries",
      new URLSearchParams({ courseCode: "ECON1101", year: "2029", semester: "S2" }),
    );
    expect(planRes.status).toBe(303);
    expect(planRes.headers.get("location")).toBe("/");

    const page = await fetch(baseUrl);
    const body = await page.text();
    expect(body).toMatch(/2029 S2[^]*ECON1101[^]*elective/);
  });
});
