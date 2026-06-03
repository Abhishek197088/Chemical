import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";
import fs from "fs";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let databaseUrl = process.env.DATABASE_URL || "file:./prisma/dev.db";

if (databaseUrl.startsWith("file:")) {
  const relativePath = databaseUrl.replace(/^file:/, "");
  // Resolve path relative to process.cwd() (project root)
  const sourcePath = path.resolve(/*turbopackIgnore: true*/ process.cwd(), relativePath);
  let targetPath = sourcePath;

  // On Vercel, the filesystem under /var/task is read-only.
  // We copy the database to /tmp to make it writable and avoid path resolution errors.
  if (process.env.VERCEL || process.env.NOW_BUILDER) {
    const tmpDir = "/tmp";
    targetPath = path.join(tmpDir, path.basename(sourcePath));
    
    // Copy the database file if it does not exist in /tmp
    if (!fs.existsSync(targetPath)) {
      try {
        if (fs.existsSync(sourcePath)) {
          fs.copyFileSync(sourcePath, targetPath);
          console.log(`Successfully copied database from ${sourcePath} to ${targetPath}`);
        } else {
          console.error(`Source database file not found at ${sourcePath}`);
        }
      } catch (err) {
        console.error("Failed to copy database to /tmp:", err);
      }
    }
  }

  databaseUrl = `file:${targetPath}`;
}

const adapter = new PrismaBetterSqlite3({ url: databaseUrl });

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
export default prisma;
