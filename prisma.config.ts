// import { definePrismaConfig } from "prisma/config";

// export default definePrismaConfig({
//   skills: {
//     agents: ["claude", "cursor", "agents", "devin"],
//   },
// });

import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});