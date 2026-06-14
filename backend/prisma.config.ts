import * as dotenv from "dotenv";
import { resolve } from "path";
import { defineConfig } from "prisma/config";

dotenv.config({ path: resolve(__dirname, "../.env") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"]!,
  },
});
