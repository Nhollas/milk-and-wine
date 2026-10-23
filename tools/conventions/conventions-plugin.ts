import { clientNames, fileNames, noComments, noReservedWords } from "./naming-rules.ts";
import {
  helperPlacement,
  interceptorUsePlacement,
  noSqlInTests,
  supportModules,
  testImports,
  testPlacement,
  urlsInHandlers,
} from "./test-rules.ts";

export default {
  meta: { name: "conventions" },
  rules: {
    "client-names": clientNames,
    "file-names": fileNames,
    "helper-placement": helperPlacement,
    "interceptor-use-placement": interceptorUsePlacement,
    "no-comments": noComments,
    "no-reserved-words": noReservedWords,
    "no-sql-in-tests": noSqlInTests,
    "support-modules": supportModules,
    "test-imports": testImports,
    "test-placement": testPlacement,
    "urls-in-handlers": urlsInHandlers,
  },
};
