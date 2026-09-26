import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import {
  courseOfferings,
  coursePrerequisites,
  courses,
  degrees,
  requirementCourses,
  requirements,
} from "./schema";

// A small, deliberately simplified demonstration catalogue for a Bachelor of
// Advanced Computing + Bachelor of Finance double degree — the pairing this
// prototype is grounded in, not an attempt to reproduce ANU's real degree
// rules. Seeded once, at boot, alongside the migrations: reference data, not
// a student's own plan — plan_entries is never touched here.
export function seedCatalogue(db: BetterSQLite3Database): void {
  if (db.select().from(degrees).all().length > 0) return;

  const [bac, bfin] = db
    .insert(degrees)
    .values([
      { code: "BAC", name: "Bachelor of Advanced Computing" },
      { code: "BFIN", name: "Bachelor of Finance" },
    ])
    .returning()
    .all();

  const [bacCore, bfinCore] = db
    .insert(requirements)
    .values([
      {
        degreeId: bac.id,
        code: "BAC-CORE",
        name: "Bachelor of Advanced Computing Core",
      },
      {
        degreeId: bfin.id,
        code: "BFIN-CORE",
        name: "Bachelor of Finance Core",
      },
    ])
    .returning()
    .all();

  // Real ANU course codes and titles, used for a prototype-only chain of
  // prerequisite/offering relationships below — not a reproduction of ANU's
  // actual rules for these codes.
  db.insert(courses)
    .values([
      { code: "COMP1130", title: "Programming as Problem Solving (Advanced)" },
      { code: "COMP2100", title: "Software Design Methodologies" },
      { code: "COMP3600", title: "Algorithms" },
      { code: "FINM1001", title: "Foundations of Finance" },
      { code: "FINM2001", title: "Corporate Finance" },
      { code: "ECON1101", title: "Microeconomics 1" },
    ])
    .run();

  // COMP1130 -> COMP2100 -> COMP3600: a chain long enough to show a course
  // completed, the next one available (and unlocking a future course), and
  // the one after that still blocked, all at once. FINM1001 → FINM2001 is the
  // same pattern, one step shorter, on the Finance side. These prerequisite
  // links are simplified prototype relationships for demo purposes, not a
  // reproduction of ANU's actual prerequisite rules for these codes.
  db.insert(coursePrerequisites)
    .values([
      { courseCode: "COMP2100", prerequisiteCode: "COMP1130" },
      { courseCode: "COMP3600", prerequisiteCode: "COMP2100" },
      { courseCode: "FINM2001", prerequisiteCode: "FINM1001" },
    ])
    .run();

  // ECON1101 has no row here: it belongs to neither degree, which is exactly
  // what should later surface under Browse Electives.
  db.insert(requirementCourses)
    .values([
      { requirementId: bacCore.id, courseCode: "COMP1130", mandatory: 1 },
      { requirementId: bacCore.id, courseCode: "COMP2100", mandatory: 1 },
      { requirementId: bacCore.id, courseCode: "COMP3600", mandatory: 1 },
      { requirementId: bfinCore.id, courseCode: "FINM1001", mandatory: 1 },
      { requirementId: bfinCore.id, courseCode: "FINM2001", mandatory: 1 },
    ])
    .run();

  const everySemester = (courseCode: string) =>
    [2024, 2025].flatMap((year) => [
      { courseCode, year, semester: "S1" },
      { courseCode, year, semester: "S2" },
    ]);
  // COMP2100 and FINM2001 run S1 only, while COMP3600 runs the other way —
  // S2 only — so the chain also demonstrates that a future required course
  // isn't always available every semester either. This offering pattern is
  // clearly simplified demo data for the prototype, not sourced from real
  // ANU historical scheduling.
  const s1Only = (courseCode: string) =>
    [2024, 2025].map((year) => ({ courseCode, year, semester: "S1" }));
  const s2Only = (courseCode: string) =>
    [2024, 2025].map((year) => ({ courseCode, year, semester: "S2" }));

  db.insert(courseOfferings)
    .values([
      ...everySemester("COMP1130"),
      ...s1Only("COMP2100"),
      ...s2Only("COMP3600"),
      ...everySemester("FINM1001"),
      ...s1Only("FINM2001"),
      ...everySemester("ECON1101"),
    ])
    .run();
}
