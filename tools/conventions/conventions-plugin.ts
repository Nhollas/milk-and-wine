import { fileNames, maxCommentLines } from "./naming-rules.ts";
import {
  helperPlacement,
  interceptorUsePlacement,
  supportModules,
  testImports,
  testPlacement,
} from "./test-rules.ts";

export default {
  meta: { name: "conventions" },
  rules: {
    "file-names": fileNames,
    "helper-placement": helperPlacement,
    "interceptor-use-placement": interceptorUsePlacement,
    "max-comment-lines": maxCommentLines,
    "support-modules": supportModules,
    "test-imports": testImports,
    "test-placement": testPlacement,
  },
};
