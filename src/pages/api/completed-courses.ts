import type { APIRoute } from "astro";
import { getCourse, markCourseCompleted } from "../../lib/db";

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const courseCode = String(form.get("courseCode") ?? "").trim();

  if (getCourse(courseCode)) {
    markCourseCompleted(courseCode);
  }

  return redirect("/", 303);
};
