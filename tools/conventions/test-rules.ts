import { existsSync } from "node:fs";
import { join, posix } from "node:path";
import { isTestLevel } from "../spec-trace/specs.ts";
import { exportedNamesOf, importedNameOf, repoPathOf, type Rule } from "./rule-context.ts";

export const testPlacement: Rule = {
  create(context) {
    return {
      Program(node) {
        const path = repoPathOf(context);
        const expectedFolder = expectedTestFolderOf(posix.basename(path), context.cwd);
        if (expectedFolder !== undefined && posix.dirname(path) !== expectedFolder) {
          context.report({
            node,
            message: `This test belongs in ${expectedFolder}/. A subject's tests sit beside its code; journeys and environments have none, so theirs go in tests/<level>/.`,
          });
        }
      },
    };
  },
};

export const helperPlacement: Rule = {
  create(context) {
    const folder = posix.dirname(repoPathOf(context));
    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (!source.startsWith(".")) return;
        const imported = posix.join(folder, source);
        const importedFolder = posix.dirname(imported);
        if (
          isTestHelper(imported) &&
          importedFolder !== folder &&
          importedFolder !== SHARED_HELPERS
        ) {
          context.report({
            node,
            message: `${posix.basename(imported)} is used outside ${importedFolder}/, so move it to ${SHARED_HELPERS}/.`,
          });
        }
      },
    };
  },
};

export const interceptorUsePlacement: Rule = {
  create(context) {
    if (/\.(?:test|setup)\.ts$/u.test(context.filename)) return {};
    return {
      CallExpression(node) {
        const { callee } = node;
        if (
          callee.type === "MemberExpression" &&
          callee.object.type === "Identifier" &&
          callee.object.name === "httpInterceptor" &&
          callee.property.type === "Identifier" &&
          callee.property.name === "use"
        ) {
          context.report({
            node,
            message:
              "Return the handler instead. Tests call httpInterceptor.use(...) themselves, so a reader sees the interception in the test.",
          });
        }
      },
    };
  },
};

export const supportModules: Rule = {
  create(context) {
    const fileName = posix.basename(context.filename);
    if (fileName.endsWith(".test.ts")) return {};
    const isFixtures = fileName.endsWith(".fixtures.ts");
    const isHandlers = fileName.endsWith(".handlers.ts");
    return {
      ImportDeclaration(node) {
        const names = new Set(
          node.specifiers.flatMap((specifier) =>
            specifier.type === "ImportSpecifier" ? [importedNameOf(specifier)] : [],
          ),
        );
        if (!isFixtures && node.source.value === "vitest" && names.has("test")) {
          context.report({
            node,
            message: "A module that extends Vitest's test is a <subject>.fixtures.ts.",
          });
        }
        if (!isHandlers && node.source.value === "msw" && names.has("http")) {
          context.report({
            node,
            message: "MSW handlers for an external API go in <system>-api.handlers.ts.",
          });
        }
      },
      ExportNamedDeclaration(node) {
        const extra = exportedNamesOf(node).filter((name) => name !== "test");
        if (isFixtures && extra.length > 0) {
          context.report({
            node,
            message: `A fixtures module exports only test, not ${extra.join(", ")}. Provide objects through the fixture instead.`,
          });
        }
      },
    };
  },
};

export const testImports: Rule = {
  create(context) {
    if (!context.filename.endsWith(".test.ts")) return {};
    return {
      ImportSpecifier(node) {
        const parent = node.parent;
        if (parent.type !== "ImportDeclaration") return;
        const source = parent.source.value;
        const fromTestModule = source === "vitest" || source.endsWith(".fixtures.ts");
        const importsTest = importedNameOf(node) === "test";
        if ((importsTest && !fromTestModule) || (importsTest && node.local.name !== "test")) {
          context.report({
            node,
            message:
              'Import test, by that name, from vitest or a .fixtures.ts module. spec:check finds tests by the text test("…").',
          });
        }
        if (!importsTest && node.local.name === "test") {
          context.report({
            node,
            message:
              'Only test itself may be called test. spec:check finds tests by the text test("…").',
          });
        }
      },
    };
  },
};

const SHARED_HELPERS = "tests/support";

function expectedTestFolderOf(fileName: string, root: string): string | undefined {
  const parts = fileName.split(".");
  const level = parts.at(-3);
  const subject = parts[0];
  if (parts.length < 4 || !isTestLevel(level) || subject === undefined) return undefined;
  const codeFolder = ["src", "tools"]
    .map((top) => `${top}/${subject}`)
    .find((folder) => existsSync(join(root, folder)));
  return codeFolder ?? `tests/${level}`;
}

function isTestHelper(path: string): boolean {
  const fileName = posix.basename(path);
  return (
    /\.(?:fixtures|handlers|setup)\.ts$/u.test(fileName) ||
    fileName.startsWith("fake-") ||
    (path.startsWith("tests/") && !fileName.endsWith(".test.ts"))
  );
}
