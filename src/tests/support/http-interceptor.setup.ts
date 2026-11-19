import { afterAll, afterEach, beforeAll } from "vitest";
import { httpInterceptor } from "./http-interceptor.ts";

beforeAll(() => httpInterceptor.listen({ onUnhandledRequest: "error" }));
afterEach(() => httpInterceptor.resetHandlers());
afterAll(() => httpInterceptor.close());
