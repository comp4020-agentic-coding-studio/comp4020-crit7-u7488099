import {
  getCourse,
  getSelectedDegrees,
  listCompletedCourses,
  listCoursePrerequisites,
  listRequirementCourses,
} from "./db";

export interface CourseRecommendation {
  courseCode: string;
  courseTitle: string;
  status: "completed" | "available" | "blocked";
  unlocks: string[]; // relevant, not-yet-completed courses this one is a prerequisite for
  missing: string[]; // prerequisites not yet completed
}

// The core "what can I take next?" computation: which courses relevant to
// the selected degree(s) are already done, which are available now (and
// worth taking because they unlock a later required course), and which are
// still blocked on a missing prerequisite.
export function getRecommendations(): CourseRecommendation[] {
  const selectedDegreeIds = new Set(getSelectedDegrees().map((degree) => degree.id));
  if (selectedDegreeIds.size === 0) return [];

  const relevantCodes = new Set(
    listRequirementCourses()
      .filter((rc) => selectedDegreeIds.has(rc.degreeId))
      .map((rc) => rc.courseCode),
  );

  const completed = new Set(listCompletedCourses().map((course) => course.code));

  const prerequisitesByCourse = new Map<string, string[]>();
  for (const { courseCode, prerequisiteCode } of listCoursePrerequisites()) {
    const list = prerequisitesByCourse.get(courseCode) ?? [];
    list.push(prerequisiteCode);
    prerequisitesByCourse.set(courseCode, list);
  }

  const recommendations: CourseRecommendation[] = [];

  for (const courseCode of relevantCodes) {
    const course = getCourse(courseCode);
    if (!course) continue;

    if (completed.has(courseCode)) {
      recommendations.push({ courseCode, courseTitle: course.title, status: "completed", unlocks: [], missing: [] });
      continue;
    }

    const prerequisites = prerequisitesByCourse.get(courseCode) ?? [];
    const missing = prerequisites.filter((code) => !completed.has(code));

    if (missing.length > 0) {
      recommendations.push({ courseCode, courseTitle: course.title, status: "blocked", unlocks: [], missing });
      continue;
    }

    const unlocks = [...relevantCodes].filter((otherCode) => {
      if (otherCode === courseCode || completed.has(otherCode)) return false;
      return (prerequisitesByCourse.get(otherCode) ?? []).includes(courseCode);
    });
    recommendations.push({ courseCode, courseTitle: course.title, status: "available", unlocks, missing: [] });
  }

  recommendations.sort((a, b) => a.courseCode.localeCompare(b.courseCode));
  return recommendations;
}
