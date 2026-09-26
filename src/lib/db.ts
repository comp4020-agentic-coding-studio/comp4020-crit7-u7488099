import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { asc, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { seedCatalogue } from "./seed";
import {
  type Course,
  courses,
  degrees,
  type Message,
  messages,
  planEntries,
  type Requirement,
  requirements,
} from "./schema";

// One SQLite file is the app's whole persistent state. In production
// fly.toml points DATABASE_PATH at the machine's volume (/data), which is
// how state survives a reload and a redeploy; locally it defaults to an
// untracked file in .data/.
const path = process.env.DATABASE_PATH ?? "./.data/app.db";
mkdirSync(dirname(path), { recursive: true });

const client = new Database(path);
client.pragma("journal_mode = WAL");
client.pragma("foreign_keys = ON");

export const db = drizzle(client);

// Migrations run at boot, on whatever machine holds the volume — the
// recommended shape for SQLite on Fly, where there's no separate machine to
// run them from. The flow: edit src/lib/schema.ts, `pnpm db:generate`,
// commit the migration it writes to drizzle/.
migrate(db, { migrationsFolder: "./drizzle" });

// The degree/course catalogue is reference data, not a student's own state,
// so it seeds itself on first boot rather than needing a separate step —
// including in the throwaway database the spec tests boot against.
// plan_entries stays untouched: the study plan starts empty.
seedCatalogue(db);

export type { Message };

export function listMessages(): Message[] {
  return db.select().from(messages).orderBy(desc(messages.id)).limit(50).all();
}

export function addMessage(body: string): Message {
  return db.insert(messages).values({ body }).returning().get();
}

// --- degree planner ----------------------------------------------------

export function listCourses(): Course[] {
  return db.select().from(courses).orderBy(asc(courses.code)).all();
}

export function getCourse(code: string): Course | undefined {
  return db.select().from(courses).where(eq(courses.code, code)).get();
}

export function listRequirements(): (Requirement & { degreeName: string })[] {
  return db
    .select({
      id: requirements.id,
      degreeId: requirements.degreeId,
      code: requirements.code,
      name: requirements.name,
      degreeName: degrees.name,
    })
    .from(requirements)
    .innerJoin(degrees, eq(requirements.degreeId, degrees.id))
    .orderBy(asc(requirements.code))
    .all();
}

export function getRequirementByCode(code: string): Requirement | undefined {
  return db.select().from(requirements).where(eq(requirements.code, code)).get();
}

export interface PlanEntryView {
  id: number;
  courseCode: string;
  courseTitle: string | null;
  year: number;
  semester: string;
  requirementCode: string | null;
  requirementName: string | null;
}

export function listPlanEntries(): PlanEntryView[] {
  return db
    .select({
      id: planEntries.id,
      courseCode: planEntries.courseCode,
      courseTitle: courses.title,
      year: planEntries.year,
      semester: planEntries.semester,
      requirementCode: requirements.code,
      requirementName: requirements.name,
    })
    .from(planEntries)
    .leftJoin(courses, eq(planEntries.courseCode, courses.code))
    .leftJoin(requirements, eq(planEntries.requirementId, requirements.id))
    .orderBy(asc(planEntries.year), asc(planEntries.semester))
    .all();
}

export function addPlanEntry(entry: {
  courseCode: string;
  year: number;
  semester: string;
  requirementId: number | null;
}) {
  return db.insert(planEntries).values(entry).returning().get();
}
