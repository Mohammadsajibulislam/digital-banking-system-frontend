import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // npx prisma db seed chalale ei command cholbe
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migration-er jonno Neon-er DIRECT (non-pooled) connection string bhalo.
    // DIRECT_URL na thakle DATABASE_URL use hobe.
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});