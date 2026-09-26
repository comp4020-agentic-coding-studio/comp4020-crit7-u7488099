# Process overview

## What I built

An ANU Degree Planner, grounded in a double degree I picked on purpose rather
than an abstract example: Bachelor of Advanced Computing + Bachelor of
Finance. Given the degree(s) a student has selected and the courses they've
already completed, it answers "what can I take next?" — separating available,
blocked, and completed courses, showing what an available course unlocks, and
letting the student plan it directly into a semester-by-semester study plan
backed by SQLite. Alongside that it surfaces each course's historical offering
pattern (which semesters it has actually run in, not a forecast) and a Browse
Electives section for courses that sit outside either degree.

## How I got here

The repo starts from the course's dynamic template — Astro, Drizzle, SQLite —
reset to the cohort's shared starting point in
[`aa984e6`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-u7488099/commit/aa984e6bba9a7b8a5f9fd444d6da49d08f14cd05)
before I'd touched the repo. Before writing the first line of schema, I had to
settle what the app was actually persisting. My first instinct was to model a
planned course as an "enrolment" — the wrong abstraction for a prototype that
never enrols anyone in anything, and that framing didn't survive contact with
what the spec actually asks for. I corrected it to a **study plan entry**:
something a student puts on a future plan, independent of whether it ever
actually happens. The same scoping pass replaced an early instinct to store
the requirement as plain text next to the plan entry with a proper
`requirement_id` foreign key onto a `requirements` table, so a plan entry
counts towards something real rather than a string that happens to match. That
correction predates the first commit — the schema in
[`978f558`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-u7488099/commit/978f558aea2681368e3a74038be6e64db0db5b21)
already reflects it — so it's a decision I made in the design conversation
rather than one visible as a diff.

`978f558` is the schema-first commit: a six-table catalogue (degrees,
requirements, courses, course_offerings, course_prerequisites,
requirement_courses) plus `plan_entries`, seeded with a small BAC + BFIN
dataset before any UI existed. Seeding deliberately leaves `plan_entries`
empty — the catalogue is reference data the app ships with, the study plan is
something only the student's own actions should ever populate. The same commit
adds `spec/plan-entry.test.ts` red, on purpose: it posts a plan entry and
asserts it survives a reload, and there was no feature yet to make it pass.
[`6a7af99`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-u7488099/commit/6a7af99a3be4c1c4cfe015f2f405ed77280c5959)
turns it green with the smallest thing that could: one form, one route, one
redirect — no degree selection, no recommendations, nothing beyond what the
red test demanded.

Degree selection and completed courses only show up in
[`34a8742`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-u7488099/commit/34a8742733502e213a748681e66d9a32c26f8329),
introduced because prerequisite-aware recommendations couldn't be computed
without them, not before. That commit also extends the seeded chain to
COMP1100 → COMP2100 → COMP3100 specifically so a single "mark completed"
action demonstrates all three recommendation states at once: COMP1100 done,
COMP2100 available and shown as unlocking something, COMP3100 still blocked.
[`171f846`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-u7488099/commit/171f846ccf48ed5398c45c2cd936e08d5be4f6ff)
wires "Plan course" on a recommendation into the same `plan_entries` table the
manual form already used, rather than standing up a second planning path.
[`12f4971`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-u7488099/commit/12f4971fbaf15b73f4cbccfe64f74aa6fda8bff9)
derives the historical offering pattern straight from the seeded
`course_offerings` rows — deliberately not a prediction of future
availability, hence the disclaimer next to it — and adds Browse Electives as
courses with no `requirement_courses` row for the selected degree(s), planned
through the same mechanism with a null requirement rather than a parallel one.

By that point the suite was 38/38 green and I told the agent functionality was
frozen: "The application functionality is now frozen. All Stage 1–5
functionality works and the suite is 38/38 green. This stage is about making
the existing prototype feel like a cohesive, presentation-ready ANU Degree
Planner, not adding features." — the brief behind
[`3b79061`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-u7488099/commit/3b7906113eb71fba974927dc2851a0fd2df2c936).
Mid-visual-pass, adding a `class` attribute to the recommendations/electives
`<ul>` elements broke one spec assertion — the test's section-isolation regex
matches the literal `<ul id="...">` and stops working the moment another
attribute sits on that tag. Rather than loosen the test to tolerate it, I
dropped the class attributes and moved that layout CSS onto the IDs directly,
re-ran the suite back to 38/38, and only then committed.

Throughout, the scope decisions — what to build first, when a table earned
its place, when functionality was actually done — were mine; the agent's job
was implementing each one against a test I'd already decided should exist.
