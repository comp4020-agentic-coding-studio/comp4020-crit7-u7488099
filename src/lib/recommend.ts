import {
  getCourse,
  getSelectedDegrees,
  listCompletedCourses,
  listCourseOfferings,
  listCoursePrerequisites,
  listCourses,
  listRequirementCourses,
} from "./db";

export interface CourseRecommendation {
  courseCode: string;
  courseTitle: string;
  status: "completed" | "available" | "blocked";
  unlocks: string[]; // relevant, not-yet-completed courses this one is a prerequisite for
  missing: string[]; // prerequisites not yet completed
  requirementCode: string | null; // which selected degree's requirement this counts towards
  offeringPattern: OfferingPattern | null;
}

export interface ElectiveRecommendation {
  courseCode: string;
  courseTitle: string;
  units: number;
  status: "completed" | "available" | "blocked";
  missing: string[]; // prerequisites not yet completed
  offeringPattern: OfferingPattern | null;
}

// A simple historical pattern derived straight from course_offerings — never
// a prediction of future availability, just what the seeded history shows.
export type OfferingPattern = "S1" | "S2" | "S1 & S2";

function buildPrerequisiteMap(): Map<string, string[]> {
  const prerequisitesByCourse = new Map<string, string[]>();
  for (const { courseCode, prerequisiteCode } of listCoursePrerequisites()) {
    const list = prerequisitesByCourse.get(courseCode) ?? [];
    list.push(prerequisiteCode);
    prerequisitesByCourse.set(courseCode, list);
  }
  return prerequisitesByCourse;
}

function buildOfferingPatterns(): Map<string, OfferingPattern> {
  const semestersByCourse = new Map<string, Set<string>>();
  for (const offering of listCourseOfferings()) {
    const semesters = semestersByCourse.get(offering.courseCode) ?? new Set<string>();
    semesters.add(offering.semester);
    semestersByCourse.set(offering.courseCode, semesters);
  }

  const patterns = new Map<string, OfferingPattern>();
  for (const [courseCode, semesters] of semestersByCourse) {
    if (semesters.has("S1") && semesters.has("S2")) patterns.set(courseCode, "S1 & S2");
    else if (semesters.has("S1")) patterns.set(courseCode, "S1");
    else if (semesters.has("S2")) patterns.set(courseCode, "S2");
  }
  return patterns;
}

// Display text for a historical offering pattern. Deliberately framed as
// history, not a forecast — see the disclaimer shown alongside it in the UI.
export function offeringPatternLabel(pattern: OfferingPattern | null): string | null {
  if (pattern === null) return null;
  if (pattern === "S1 & S2") return "Historically offered: Semesters 1 & 2";
  return `Historically offered: Semester ${pattern === "S1" ? "1" : "2"}`;
}

// A short, rule-based nudge for the courses where the pattern actually
// matters for planning: one that only ever runs in a single semester. Not a
// scheduler — just a restatement of the fact above, for courses where it's
// worth calling out explicitly.
export function planningNote(pattern: OfferingPattern | null): string | null {
  if (pattern === "S1") return "Planning note: historically S1 only";
  if (pattern === "S2") return "Planning note: historically S2 only";
  return null;
}

// The core "what can I take next?" computation: which courses relevant to
// the selected degree(s) are already done, which are available now (and
// worth taking because they unlock a later required course), and which are
// still blocked on a missing prerequisite.
export function getRecommendations(): CourseRecommendation[] {
  const selectedDegreeIds = new Set(getSelectedDegrees().map((degree) => degree.id));
  if (selectedDegreeIds.size === 0) return [];

  const relevantRequirementCourses = listRequirementCourses().filter((rc) => selectedDegreeIds.has(rc.degreeId));
  const relevantCodes = new Set(relevantRequirementCourses.map((rc) => rc.courseCode));
  const requirementCodeByCourse = new Map(
    relevantRequirementCourses.map((rc) => [rc.courseCode, rc.requirementCode]),
  );

  const completed = new Set(listCompletedCourses().map((course) => course.code));
  const prerequisitesByCourse = buildPrerequisiteMap();
  const offeringPatterns = buildOfferingPatterns();

  const recommendations: CourseRecommendation[] = [];

  for (const courseCode of relevantCodes) {
    const course = getCourse(courseCode);
    if (!course) continue;
    const requirementCode = requirementCodeByCourse.get(courseCode) ?? null;
    const offeringPattern = offeringPatterns.get(courseCode) ?? null;

    if (completed.has(courseCode)) {
      recommendations.push({
        courseCode,
        courseTitle: course.title,
        status: "completed",
        unlocks: [],
        missing: [],
        requirementCode,
        offeringPattern,
      });
      continue;
    }

    const prerequisites = prerequisitesByCourse.get(courseCode) ?? [];
    const missing = prerequisites.filter((code) => !completed.has(code));

    if (missing.length > 0) {
      recommendations.push({
        courseCode,
        courseTitle: course.title,
        status: "blocked",
        unlocks: [],
        missing,
        requirementCode,
        offeringPattern,
      });
      continue;
    }

    const unlocks = [...relevantCodes].filter((otherCode) => {
      if (otherCode === courseCode || completed.has(otherCode)) return false;
      return (prerequisitesByCourse.get(otherCode) ?? []).includes(courseCode);
    });
    recommendations.push({
      courseCode,
      courseTitle: course.title,
      status: "available",
      unlocks,
      missing: [],
      requirementCode,
      offeringPattern,
    });
  }

  recommendations.sort((a, b) => a.courseCode.localeCompare(b.courseCode));
  return recommendations;
}

// Electives: seeded courses that don't count towards any requirement of the
// currently selected degree(s) — ANTH1001 in the seeded catalogue. Same
// completed/available/blocked classification as recommendations, but no
// "unlocks" (electives aren't a required chain) and no requirement code
// (they're planned with a null requirement unless the student explicitly
// assigns one through the manual plan-entry form).
export function getElectives(): ElectiveRecommendation[] {
  const selectedDegreeIds = new Set(getSelectedDegrees().map((degree) => degree.id));
  const relevantCodes = new Set(
    listRequirementCourses()
      .filter((rc) => selectedDegreeIds.has(rc.degreeId))
      .map((rc) => rc.courseCode),
  );

  const completed = new Set(listCompletedCourses().map((course) => course.code));
  const prerequisitesByCourse = buildPrerequisiteMap();
  const offeringPatterns = buildOfferingPatterns();

  const electives: ElectiveRecommendation[] = [];

  for (const course of listCourses()) {
    if (relevantCodes.has(course.code)) continue;

    const missing = (prerequisitesByCourse.get(course.code) ?? []).filter((code) => !completed.has(code));
    const status: ElectiveRecommendation["status"] = completed.has(course.code)
      ? "completed"
      : missing.length > 0
        ? "blocked"
        : "available";

    electives.push({
      courseCode: course.code,
      courseTitle: course.title,
      units: course.units,
      status,
      missing,
      offeringPattern: offeringPatterns.get(course.code) ?? null,
    });
  }

  electives.sort((a, b) => a.courseCode.localeCompare(b.courseCode));
  return electives;
}
