import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import prisma from "@/lib/prisma";

export async function GET() {
  const diagnostics: any = {
    cwd: process.cwd(),
    env: {
      VERCEL: process.env.VERCEL,
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL,
    },
    paths: {},
  };

  // Check expected paths
  const relativeDb = "./prisma/dev.db";
  const absDb = path.resolve(process.cwd(), relativeDb);
  const varTaskDb = "/var/task/prisma/dev.db";
  const tmpDb = "/tmp/dev.db";

  diagnostics.paths[relativeDb] = {
    resolved: path.resolve(relativeDb),
    exists: fs.existsSync(path.resolve(relativeDb)),
  };

  diagnostics.paths[absDb] = {
    exists: fs.existsSync(absDb),
  };

  diagnostics.paths[varTaskDb] = {
    exists: fs.existsSync(varTaskDb),
  };

  diagnostics.paths[tmpDb] = {
    exists: fs.existsSync(tmpDb),
  };

  // If tmp database exists, show size
  if (fs.existsSync(tmpDb)) {
    diagnostics.paths[tmpDb].size = fs.statSync(tmpDb).size;
  }

  // Try querying database
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
      },
    });
    diagnostics.dbQuery = {
      success: true,
      usersCount: users.length,
      users: users,
    };
  } catch (err: any) {
    diagnostics.dbQuery = {
      success: false,
      error: err.message || err.toString(),
      stack: err.stack,
    };
  }

  return NextResponse.json(diagnostics);
}
