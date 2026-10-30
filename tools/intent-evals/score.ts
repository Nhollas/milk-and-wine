import type { EvalCase } from "./cases.ts";
import type { Judgement } from "./intent-judge.ts";

export type Found = {
  /** The judgement had a list of misalignments to score. */
  scored: boolean;
  /** A misalignment on the case's scenario quotes the words the case is about. */
  part: boolean;
};

export function foundGap(evalCase: EvalCase, judgement: Judgement): Found {
  if (judgement.misalignments === undefined) return { scored: false, part: false };
  // An unasked case has no words of the scenario to quote, so any extra on its scenario counts for now.
  const wanted = "quote" in evalCase ? plain(evalCase.quote) : "nothing about this";
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
