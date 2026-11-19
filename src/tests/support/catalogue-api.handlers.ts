import { http, HttpResponse } from "msw";

export const CATALOGUE_URL = "http://catalogue.test";

export const COPY_PATH = `${CATALOGUE_URL}/copies/:copyId`;

type CopyState = "available" | "withdrawn";

export function copyResponse(copyId: string, state: CopyState) {
  return HttpResponse.json({ id: copyId, title: `Title of ${copyId}`, state });
}

export function copyLookupHandler(copies: Record<string, CopyState>) {
  return http.get(COPY_PATH, ({ params }) => {
    const copyId = String(params["copyId"]);
    const state = copies[copyId];
    if (!state) return new HttpResponse(null, { status: 404 });
    return copyResponse(copyId, state);
  });
}
