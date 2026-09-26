import { sql } from "drizzle-orm";
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

// The schema is the ground truth for the database. To change it: edit here,
// run `pnpm db:generate` to turn the diff into a migration under drizzle/,
// and commit both — the migration applies automatically when the server
// boots (see src/lib/db.ts), locally and deployed. Never edit the database
// by hand: state on the deployed volume outlives every deploy, and the
// migration trail is what keeps old state and new code compatible.
export const messages = sqliteTable("messages", {
  id: int().primaryKey({ autoIncrement: true }),
  body: text().notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type Message = typeof messages.$inferSelect;

// --- degree planner catalogue -----------------------------------------------
// Reference data only: degrees, their requirements, courses, prerequisites
// and historical offerings. Seeded once at boot (see seed.ts) and never
// written to by the app. `planEntries` is the one table a student's own
// actions write to.

export const degrees = sqliteTable("degrees", {
  id: int().primaryKey({ autoIncrement: true }),
  code: text().notNull().unique(),
  name: text().notNull(),
});

export type Degree = typeof degrees.$inferSelect;

// A named component of a degree a plan entry can count towards — the
// "side" of a double degree a planned course is associated with.
export const requirements = sqliteTable("requirements", {
  id: int().primaryKey({ autoIncrement: true }),
  degreeId: int("degree_id")
    .notNull()
    .references(() => degrees.id),
  code: text().notNull().unique(),
  name: text().notNull(),
});

export type Requirement = typeof requirements.$inferSelect;

export const courses = sqliteTable("courses", {
  code: text().primaryKey(),
  title: text().notNull(),
  units: int().notNull().default(6),
});

export type Course = typeof courses.$inferSelect;

// One row per semester a course has historically run (or is scheduled to
// run) — the offering-pattern data future planning reads.
export const courseOfferings = sqliteTable("course_offerings", {
  id: int().primaryKey({ autoIncrement: true }),
  courseCode: text("course_code")
    .notNull()
    .references(() => courses.code),
  year: int().notNull(),
  semester: text().notNull(), // "S1" | "S2"
});

export type CourseOffering = typeof courseOfferings.$inferSelect;

// Self-referential: a course and the course it requires.
export const coursePrerequisites = sqliteTable("course_prerequisites", {
  id: int().primaryKey({ autoIncrement: true }),
  courseCode: text("course_code")
    .notNull()
    .references(() => courses.code),
  prerequisiteCode: text("prerequisite_code")
    .notNull()
    .references(() => courses.code),
});

export type CoursePrerequisite = typeof coursePrerequisites.$inferSelect;

// Which courses count towards which requirement. A course with no row here
// belongs to no selected degree — exactly the future Browse Electives set.
export const requirementCourses = sqliteTable("requirement_courses", {
  id: int().primaryKey({ autoIncrement: true }),
  requirementId: int("requirement_id")
    .notNull()
    .references(() => requirements.id),
  courseCode: text("course_code")
    .notNull()
    .references(() => courses.code),
  mandatory: int().notNull().default(1),
});

export type RequirementCourse = typeof requirementCourses.$inferSelect;

// The persisted study plan: a planned course, when it's planned for, and
// which requirement it counts towards. Nullable requirementId leaves room
// for planning a course that isn't tied to any requirement (an elective).
export const planEntries = sqliteTable("plan_entries", {
  id: int().primaryKey({ autoIncrement: true }),
  courseCode: text("course_code")
    .notNull()
    .references(() => courses.code),
  year: int().notNull(),
  semester: text().notNull(),
  requirementId: int("requirement_id").references(() => requirements.id),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type PlanEntry = typeof planEntries.$inferSelect;

// Which degree(s) the student is currently pursuing — one row for a single
// degree, two for a double degree. No separate "mode" column: the row count
// is the source of truth, and the UI is what presents it as a Single/Double
// Degree choice.
export const selectedDegrees = sqliteTable("selected_degrees", {
  degreeId: int("degree_id")
    .primaryKey()
    .references(() => degrees.id),
});

export type SelectedDegree = typeof selectedDegrees.$inferSelect;

// Courses the student has already completed. Manually entered for this
// prototype; a real product would source this from ANU's student records.
export const completedCourses = sqliteTable("completed_courses", {
  courseCode: text("course_code")
    .primaryKey()
    .references(() => courses.code),
  completedAt: text("completed_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type CompletedCourse = typeof completedCourses.$inferSelect;
