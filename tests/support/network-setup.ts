import { afterAll, afterEach, beforeAll } from "vitest";
import { network } from "./network.ts";

beforeAll(() => network.listen({ onUnhandledRequest: "error" }));
afterEach(() => network.resetHandlers());
afterAll(() => network.close());
