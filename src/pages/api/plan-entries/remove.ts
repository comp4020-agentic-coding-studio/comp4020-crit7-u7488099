import type { APIRoute } from "astro";
import { removePlanEntry } from "../../../lib/db";

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const courseCode = String(form.get("courseCode") ?? "").trim();

  if (courseCode) {
    removePlanEntry(courseCode);
  }

  return redirect("/", 303);
};
