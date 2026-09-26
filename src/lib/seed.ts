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

  db.insert(courses)
    .values([
      { code: "COMP1100", title: "Introduction to Programming and Algorithms" },
      { code: "COMP2100", title: "Software Design (Advanced)" },
      { code: "FIN1101", title: "Introduction to Finance" },
      { code: "FIN2101", title: "Corporate Finance" },
      { code: "ANTH1001", title: "Introduction to Anthropology" },
    ])
    .run();

  // COMP1100 is available now and unlocks COMP2100, a future required BAC
  // Core course; FIN1101 → FIN2101 is the same pattern on the Finance side.
  db.insert(coursePrerequisites)
    .values([
      { courseCode: "COMP2100", prerequisiteCode: "COMP1100" },
      { courseCode: "FIN2101", prerequisiteCode: "FIN1101" },
    ])
    .run();

  // ANTH1001 has no row here: it belongs to neither degree, which is exactly
  // what should later surface under Browse Electives.
  db.insert(requirementCourses)
    .values([
      { requirementId: bacCore.id, courseCode: "COMP1100", mandatory: 1 },
      { requirementId: bacCore.id, courseCode: "COMP2100", mandatory: 1 },
      { requirementId: bfinCore.id, courseCode: "FIN1101", mandatory: 1 },
      { requirementId: bfinCore.id, courseCode: "FIN2101", mandatory: 1 },
    ])
    .run();

  const everySemester = (courseCode: string) =>
    [2024, 2025].flatMap((year) => [
      { courseCode, year, semester: "S1" },
      { courseCode, year, semester: "S2" },
    ]);
  // COMP2100 and FIN2101 have historically only run in S1 — the "future
  // required course" half of the unlock chain isn't available every semester.
  const s1Only = (courseCode: string) =>
    [2024, 2025].map((year) => ({ courseCode, year, semester: "S1" }));

  db.insert(courseOfferings)
    .values([
      ...everySemester("COMP1100"),
      ...s1Only("COMP2100"),
      ...everySemester("FIN1101"),
      ...s1Only("FIN2101"),
      ...everySemester("ANTH1001"),
    ])
    .run();
}
