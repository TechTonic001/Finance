import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDirectory = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(appDirectory, "..", ".env") });

function getDatasourceUrl() {
  if (process.env.DIRECT_URL) return process.env.DIRECT_URL;

  const url = new URL(env("DATABASE_URL"));
  url.hostname = url.hostname.replace("-pooler", "");
  return url.toString();
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: getDatasourceUrl(),
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});