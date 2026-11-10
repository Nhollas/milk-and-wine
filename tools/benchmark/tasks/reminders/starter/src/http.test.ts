import { expect, test } from "vitest";
import { endpoint } from "./http.ts";

test("keeps a base URL's path, with or without a trailing slash", () => {
  expect(endpoint("http://api.test/v2", "copies/1").href).toBe("http://api.test/v2/copies/1");
  expect(endpoint("http://api.test/v2/", "copies/1").href).toBe("http://api.test/v2/copies/1");
});
