import "server-only";
import { tmpdir } from "node:os";
import path from "node:path";

// Where the database and uploaded files live. Serverless hosts (Vercel, AWS Lambda) mount the
// app read-only, so only the temp folder is writable there. Everything that writes files
// (database, seed, uploads) must take its location from here.
const SERVERLESS = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
export const DATA_DIR = process.env.ARRIVE_DATA_DIR ?? (SERVERLESS ? path.join(tmpdir(), "arrive") : path.join(process.cwd(), ".data"));
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
