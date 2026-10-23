import { posix, relative, sep } from "node:path";
import type { RuleTester } from "oxlint/plugins-dev";

export type Rule = Parameters<RuleTester["run"]>[1];

export type Context = Parameters<NonNullable<Rule["create"]>>[0];

type Visitor = ReturnType<NonNullable<Rule["create"]>>;

export type NodeOf<Type extends keyof Visitor> = Parameters<NonNullable<Visitor[Type]>>[0];

export function repoPathOf(context: Context): string {
  return relative(context.cwd, context.filename).split(sep).join(posix.sep);
}

export function importedNameOf(specifier: NodeOf<"ImportSpecifier">): string {
  return specifier.imported.type === "Identifier"
    ? specifier.imported.name
    : specifier.imported.value;
}

export function exportedNamesOf(node: NodeOf<"ExportNamedDeclaration">): string[] {
  const declaration = node.declaration;
  const declaredIds =
    declaration === null
      ? []
      : declaration.type === "VariableDeclaration"
        ? declaration.declarations.map((declarator) => declarator.id)
        : [declaration.id];
  const declared = declaredIds.flatMap((id) => (id?.type === "Identifier" ? [id.name] : []));
  const specified = node.specifiers.map((specifier) =>
    specifier.exported.type === "Identifier" ? specifier.exported.name : specifier.exported.value,
  );
  return [...declared, ...specified];
}
