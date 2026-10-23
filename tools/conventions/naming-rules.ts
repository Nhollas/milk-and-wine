import { posix } from "node:path";
import { type Comment, repoPathOf, type Rule } from "./rule-context.ts";

export const maxCommentLines: Rule = {
  create(context) {
    return {
      Program() {
        for (const group of commentGroupsOf(context.sourceCode.getAllComments())) {
          const lines = group.flatMap((comment) => textLinesOf(comment.value)).length;
          const first = group[0];
          const last = group.at(-1);
          if (lines > MAX_COMMENT_LINES && first && last) {
            context.report({
              loc: { start: first.loc.start, end: last.loc.end },
              message: `Keep a comment to ${MAX_COMMENT_LINES} lines. Rename or restructure instead, or link the spec (specs/…/spec.md) or ADR (docs/adr/…) that explains it.`,
            });
          }
        }
      },
    };
  },
};

export const fileNames: Rule = {
  create(context) {
    return {
      Program(node) {
        const problem = fileNameProblemOf(posix.basename(repoPathOf(context)));
        if (problem) context.report({ node, message: problem });
      },
    };
  },
};

const MAX_COMMENT_LINES = 2;

const SUPPORT_ROLES = ["setup", "fixtures", "handlers"];

const KIND_ONLY_NAMES = new Set([
  "common",
  "fixtures",
  "handlers",
  "helper",
  "helpers",
  "misc",
  "setup",
  "shared",
  "types",
  "util",
  "utils",
]);

const FAKE_CLIENT_FILE = /^fake-[a-z][a-z-]*-client\.ts$/u;

function fileNameProblemOf(fileName: string): string | undefined {
  if (fileName.endsWith(".test.ts")) return undefined;
  const [subject = "", role, ...extra] = fileName.slice(0, -".ts".length).split(".");
  if (KIND_ONLY_NAMES.has(subject)) {
    return `Name ${fileName} for what it holds, not only its kind, so it can be told apart in an import, a search or an editor tab.`;
  }
  if (extra.length > 0 || (role !== undefined && !SUPPORT_ROLES.includes(role))) {
    return `Name support files <subject>.<role>.ts, with a role of ${SUPPORT_ROLES.join(", ")}: not ${fileName}.`;
  }
  if (role === "handlers" && !subject.endsWith("-api")) {
    return `Name MSW handlers for one external API <system>-api.handlers.ts: not ${fileName}.`;
  }
  if (subject.startsWith("fake-") && !FAKE_CLIENT_FILE.test(fileName)) {
    return `Name a fake of one of our clients fake-<system>-client.ts: not ${fileName}.`;
  }
  return undefined;
}

function commentGroupsOf(comments: Comment[]): Comment[][] {
  const groups: Comment[][] = [];
  for (const comment of comments) {
    const group = groups.at(-1);
    const previous = group?.at(-1);
    const continuesLineComments =
      previous?.type === "Line" &&
      comment.type === "Line" &&
      comment.loc.start.line === previous.loc.end.line + 1;
    if (group && continuesLineComments) group.push(comment);
    else groups.push([comment]);
  }
  return groups;
}

function textLinesOf(commentValue: string): string[] {
  return commentValue
    .split("\n")
    .map((line) => line.replace(/^\s*\*?/u, "").trim())
    .filter((line) => line !== "");
}
