import { http, HttpResponse } from "msw";
import { network } from "./network.ts";

export const CATALOGUE_URL = "http://catalogue.test";

type CopyState = "available" | "withdrawn";

export function fakeCatalogue(copies: Record<string, CopyState>) {
  const requests: string[] = [];
  network.use(
    http.get(`${CATALOGUE_URL}/copies/:copyId`, ({ params }) => {
      const copyId = String(params["copyId"]);
      requests.push(copyId);
      const state = copies[copyId];
      if (!state) return new HttpResponse(null, { status: 404 });
      return HttpResponse.json({ id: copyId, title: `Title of ${copyId}`, state });
    }),
  );
  return { requests };
}

export function catalogueAnswering(status: number) {
  const requests: string[] = [];
  network.use(
    http.get(`${CATALOGUE_URL}/copies/:copyId`, ({ params }) => {
      requests.push(String(params["copyId"]));
      return new HttpResponse(null, { status });
    }),
  );
  return { requests };
}
