import type { APIRoute } from "astro";
import { addPlanEntry, getCourse, getRequirementByCode } from "../../lib/db";

const SEMESTERS = new Set(["S1", "S2"]);

// A plain HTML form POSTs here. courseCode and requirementCode are natural
// keys (not raw ids) resolved against the seeded catalogue, so a bad value
// can never reach the database as a dangling foreign key — it just isn't
// added. The 303 redirect makes the form work with no client-side
// JavaScript: the submitting tab re-renders the plan from SQLite.
export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const courseCode = String(form.get("courseCode") ?? "").trim();
  const requirementCode = String(form.get("requirementCode") ?? "").trim();
  const semester = String(form.get("semester") ?? "").trim();
  const year = Number(form.get("year"));

  const course = getCourse(courseCode);
  const requirement = requirementCode ? getRequirementByCode(requirementCode) : undefined;

  const valid =
    course !== undefined &&
    (!requirementCode || requirement !== undefined) &&
    SEMESTERS.has(semester) &&
    Number.isInteger(year);

  if (valid) {
    addPlanEntry({
      courseCode: course.code,
      year,
      semester,
      requirementId: requirement?.id ?? null,
    });
  }

  return redirect("/", 303);
};
