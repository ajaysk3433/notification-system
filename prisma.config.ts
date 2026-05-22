import dotenv from "dotenv";
dotenv.config({ path: process.cwd() + "/config.env" });

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "src",
  migrations: {
    path: "src/db/prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
