import type { EvalCase } from "./cases.ts";
import type { Judgement, VerdictPart } from "./intent-judge.ts";

const FLAGGED = new Set(["weak", "missing"]);

export type Flag = { row: string; side: "given" | "then"; part: VerdictPart };

export type Found = {
  /** The judgement had verdicts to score. */
  scored: boolean;
  /** It flagged the part the case is about. */
  part: boolean;
  /** It flagged some part of the case's row. */
  row: boolean;
};

export function flagsIn(judgement: Judgement): Flag[] {
  return Object.entries(judgement.verdicts ?? {}).flatMap(([row, sides]) =>
    (["given", "then"] as const).flatMap((side) =>
      sides[side].filter((part) => FLAGGED.has(part.verdict)).map((part) => ({ row, side, part })),
    ),
  );
}

export function foundGap(evalCase: EvalCase, judgement: Judgement): Found {
  if (judgement.verdicts === undefined) return { scored: false, part: false, row: false };
  const flags = flagsIn(judgement).filter((flag) => flag.row === evalCase.row);
  const wanted = plain(evalCase.part);
  return {
    scored: true,
    part: flags.some((flag) => plain(flag.part.part).includes(wanted)),
    row: flags.length > 0,
  };
}

// The judge quotes the row's words, so compare them without markdown and spacing.
function plain(text: string): string {
  return text.replaceAll(/[`"*]/gu, "").replaceAll(/\s+/gu, " ").trim().toLowerCase();
}
