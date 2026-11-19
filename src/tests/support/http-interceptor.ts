import { setupServer } from "msw/node";

export const httpInterceptor = setupServer();
