// Deletes the local database and uploads. The app re-creates and re-seeds them on the next request.
import { rmSync } from "node:fs";
import path from "node:path";

const dir = process.env.ARRIVE_DATA_DIR ?? path.join(process.cwd(), ".data");
rmSync(dir, { recursive: true, force: true });
console.log(`Removed ${dir}. Restart the server; it will seed fresh data on the first request.`);
