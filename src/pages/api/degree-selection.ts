import type { APIRoute } from "astro";
import { listDegrees, setSelectedDegrees } from "../../lib/db";

// The row count in selected_degrees is the source of truth for single vs
// double degree — mode here just caps how many of the submitted codes are
// kept, matching what the UI presented as a Single/Double Degree choice. An
// unrecognised mode leaves the current selection untouched.
export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const mode = String(form.get("mode") ?? "");

  if (mode === "single" || mode === "double") {
    const maxDegrees = mode === "single" ? 1 : 2;
    const degrees = listDegrees();
    const validCodes = new Set(degrees.map((degree) => degree.code));
    const codes = form
      .getAll("degreeCode")
      .map(String)
      .filter((code) => validCodes.has(code))
      .slice(0, maxDegrees);

    const degreeIds = degrees.filter((degree) => codes.includes(degree.code)).map((degree) => degree.id);
    setSelectedDegrees(degreeIds);
  }

  return redirect("/", 303);
};
