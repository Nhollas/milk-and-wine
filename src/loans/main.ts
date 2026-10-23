import { serve } from "@hono/node-server";
import { z } from "zod";
import { systemClock } from "../clock.ts";
import { openDatabase } from "../database.ts";
import { stdoutLog } from "../log.ts";
import { createLoansApp } from "./loans-app.ts";

const env = z
  .object({
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_PATH: z.string().min(1),
    CATALOGUE_URL: z.url(),
  })
  .parse(process.env);

const app = createLoansApp({
  db: openDatabase(env.DATABASE_PATH),
  catalogueUrl: env.CATALOGUE_URL,
  clock: systemClock,
});

serve({ fetch: app.fetch, port: env.PORT }, ({ port }) => stdoutLog("info", "loans.listening", { port }));
