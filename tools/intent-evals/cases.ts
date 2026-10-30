import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

export const CASES_FOLDER = "tools/intent-evals/cases";

export const KINDS = [
  "unchecked",
  "wrong thing checked",
  "setup can't show it",
  "contradicted",
  "unasked",
] as const;

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;

const edit = z.strictObject({
  file: z.string().min(1),
  find: z.array(z.string()).min(1),
  replace: z.array(z.string()),
});

const planted = {
  gap: z.string().min(1),
  difficulty: z.enum(DIFFICULTIES),
  scenario: z.string().regex(/^B\d+$/u),
  plant: z.array(edit).min(1),
};

// A bug shows a planted gap is real: the tests catch it until the gap is planted. A contradiction
// needs none, and an unasked check can't be shown by one, so its writer says why it's unasked.
const caseFile = z.discriminatedUnion("kind", [
  z.strictObject({
    ...planted,
    kind: z.enum(["unchecked", "wrong thing checked", "setup can't show it"]),
    quote: z.string().min(1),
    bug: edit,
  }),
  z.strictObject({ ...planted, kind: z.literal("contradicted"), quote: z.string().min(1) }),
  z.strictObject({ ...planted, kind: z.literal("unasked"), reason: z.string().min(1) }),
]);

export type Edit = z.infer<typeof edit>;

export type EvalCase = z.infer<typeof caseFile> & { id: string; example: string };

export type CaseFile =
  | { path: string; evalCase: EvalCase }
  | { path: string; evalCase: undefined; invalid: string };

/** Every case file under `cases/<example>/`, parsed or with why it isn't valid. */
export function readCaseFiles(root: string): CaseFile[] {
  const folder = join(root, CASES_FOLDER);
  return readdirSync(folder, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .toSorted((a, b) => a.name.localeCompare(b.name))
    .flatMap(({ name: example }) =>
      readdirSync(join(folder, example))
        .filter((file) => file.endsWith(".json"))
        .map((file) => file.replace(/\.json$/u, ""))
        .toSorted()
        .map((stem) => {
          const file = `${stem}.json`;
          const path = `${CASES_FOLDER}/${example}/${file}`;
          const parsed = caseFile.safeParse(parseJson(readFileSync(join(root, path), "utf8")));
          if (!parsed.success) {
            return { path, evalCase: undefined, invalid: z.prettifyError(parsed.error) };
          }
          const id = `${example}/${stem}`;
          return { path, evalCase: { ...parsed.data, id, example } };
        }),
    );
}

export type CaseFilter = { example: string | undefined; id: string | undefined };

export function matching(cases: EvalCase[], { example, id }: CaseFilter): EvalCase[] {
  return cases.filter(
    (evalCase) =>
      (example === undefined || evalCase.example === example) &&
      (id === undefined || evalCase.id === id || evalCase.id === `${evalCase.example}/${id}`),
  );
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
