import { serve } from "@hono/node-server";
import { z } from "zod";
import { createCatalogueClient } from "@milk-and-wine/catalogue-client";
import { systemClock } from "@milk-and-wine/platform/clock";
import { openDatabase } from "@milk-and-wine/platform/database";
import { logger } from "@milk-and-wine/platform/logger";
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
  catalogueClient: createCatalogueClient(env.CATALOGUE_URL),
  clock: systemClock,
});

serve({ fetch: app.fetch, port: env.PORT }, ({ port }) => logger.info("loans.listening", { port }));
