import { posix } from "node:path";
import { exportedNamesOf, repoPathOf, type Rule } from "./rule-context.ts";

export const noComments: Rule = {
  create(context) {
    return {
      Program() {
        context.sourceCode
          .getAllComments()
          .filter((comment) => !ALLOWED_COMMENT.test(comment.value))
          .forEach((comment) => {
            context.report({
              loc: comment.loc,
              message:
                "No comments. Rename or restructure instead, or link the spec (specs/…/spec.md) or ADR (docs/adr/…) that explains it.",
            });
          });
      },
    };
  },
};

export const noReservedWords: Rule = {
  create(context) {
    return {
      Identifier(node) {
        const reserved = RESERVED_WORDS.find(({ word }) => node.name.toLowerCase().includes(word));
        if (reserved) {
          context.report({
            node,
            message: `Don't use "${reserved.word}" in code names: ${reserved.reason}. See GLOSSARY.md.`,
          });
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

export const clientNames: Rule = {
  create(context) {
    const fileName = posix.basename(repoPathOf(context));
    const expectedExports = clientExportsFor(fileName);
    const exported = new Set<string>();
    return {
      ExportNamedDeclaration(node) {
        for (const name of exportedNamesOf(node)) exported.add(name);
      },
      FunctionDeclaration(node) {
        const name = node.id?.name ?? "";
        const system = CLIENT_FACTORY.exec(name)?.[1];
        if (system !== undefined && fileName !== `${kebabCase(system)}-client.ts`) {
          context.report({
            node,
            message: `${name} belongs in ${kebabCase(system)}-client.ts, the one module that calls that system.`,
          });
        }
      },
      "Program:exit"(node) {
        const missing = expectedExports.filter((name) => !exported.has(name));
        if (missing.length > 0) {
          context.report({
            node,
            message: `${fileName} must export ${missing.join(" and ")}, so its name says which system it calls.`,
          });
        }
      },
    };
  },
};

const ALLOWED_COMMENT =
  /^\s*(?:(?:oxlint|eslint)-(?:disable|enable)|@ts-expect-error)|specs\/\S+\/spec\.md|docs\/adr\/\S+\.md/u;

const RESERVED_WORDS = [
  { word: "service", reason: "it already means this repo and a test level" },
] as const;

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

const CLIENT_FACTORY = /^create([A-Z]\w*)Client$/u;

const CLIENT_FILE = /^(?<prefix>fake-)?(?<system>[a-z][a-z-]*)-client\.ts$/u;

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
  if (role === "setup" && subject === "vitest") {
    return "Name a setup file after what it sets up, such as http-interceptor.setup.ts, not vitest.setup.ts.";
  }
  if (subject.startsWith("fake-") && !CLIENT_FILE.test(fileName)) {
    return `Name a fake of one of our clients fake-<system>-client.ts: not ${fileName}.`;
  }
  return undefined;
}

function clientExportsFor(fileName: string): string[] {
  const groups = CLIENT_FILE.exec(fileName)?.groups;
  if (!groups?.["system"]) return [];
  const system = pascalCase(groups["system"]);
  return groups["prefix"] ? [`fake${system}Client`] : [`create${system}Client`, `${system}Client`];
}

function pascalCase(kebab: string): string {
  return kebab
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

function kebabCase(pascal: string): string {
  return pascal.replaceAll(/(?<!^)([A-Z])/gu, "-$1").toLowerCase();
}
