import type { EvalCase } from "./cases.ts";
import type { Judgement } from "./intent-judge.ts";

export type Found = {
  /** The judgement had a list of misalignments to score. */
  scored: boolean;
  /** A misalignment on the case's scenario names the part the case is about. */
  part: boolean;
};

export function foundGap(evalCase: EvalCase, judgement: Judgement): Found {
  if (judgement.misalignments === undefined) return { scored: false, part: false };
  const wanted = plain(evalCase.part);
  return {
    scored: true,
    part: judgement.misalignments.some(
      (each) => each.scenario === evalCase.scenario && plain(each.says).includes(wanted),
    ),
  };
}

// The judge quotes the scenario's words, so compare them without markdown and spacing.
function plain(text: string): string {
  return text.replaceAll(/[`"*]/gu, "").replaceAll(/\s+/gu, " ").trim().toLowerCase();
}
