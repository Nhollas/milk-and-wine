import { readFileSync } from "node:fs";

/**
 * Grades one trial: `node grade.ts <claude-code stream> <expected.json>` prints Harbor's rewards.
 *
 * It runs inside the trial's container, which has Node and nothing else, so it imports nothing.
 */

/** What a gap or a fair finding is known by: a requirement's words, or an added check's line. */
type Mark = { requirement: string } | { test_line: number };

/** A fair finding with the verdict that is true of it. An added check's is `adds_requirement`. */
type Fair = { requirement: string; verdict: string } | { test_line: number };

type Expected =
  | { scenario: string; verdict: "aligned" }
  | ({ scenario: string; verdict: string; fair?: Fair[] } & Mark);

type Finding = {
  scenario?: unknown;
  requirement?: unknown;
  test_line?: unknown;
  verdict?: unknown;
};

type Reply = { requirements?: Finding[]; additional_checks?: Finding[] };

/** A finding with a wrong verdict, and the list of the reply it came from. */
type WrongFinding = Finding & { list: "requirements" | "additional_checks" };

/** A trial's rewards. Only a task with a gap has `noticed` and `labelled`. */
export type Rewards = { reward: number; false_alarms: number; noticed?: number; labelled?: number };

/** Verdicts that say something is wrong with a scenario's tests. */
const WRONG = new Set(["misses_requirement", "contradicts_requirement", "adds_requirement"]);

/**
 * What the judge's reply earns on a task. `noticed` is 1 when it gives the task's gap a wrong
 * verdict, and `labelled` when that verdict is the expected one. `false_alarms` counts its other
 * wrong verdicts on the scenario: those not on the gap under one verdict, nor on a fair finding
 * under its own. `reward` is 1 when nothing stops a reader acting on the reply: no false alarm, and
 * the gap, if the task has one, under its verdict.
 */
export function rewardsOf(replyText: string, expected: Expected): Rewards {
  const reply = replyOf(replyText);
  const wrong = reply === undefined ? [] : wrongFindingsOn(expected.scenario, reply);

  if (!("requirement" in expected) && !("test_line" in expected)) {
    return {
      reward: reply !== undefined && wrong.length === 0 ? 1 : 0,
      false_alarms: wrong.length,
    };
  }
  const ofGap = wrong.filter((finding) => bears(finding, expected));
  const noticed = ofGap.length > 0 ? 1 : 0;
  const labelled = ofGap.some((finding) => finding.verdict === expected.verdict) ? 1 : 0;
  // The gap under two verdicts tells the reader two things, so only one of them is the gap.
  const gapVerdict = labelled === 1 ? expected.verdict : ofGap[0]?.verdict;
  const fair = expected.fair ?? [];
  const falseAlarms = wrong.filter(
    (finding) =>
      !(bears(finding, expected) && finding.verdict === gapVerdict) &&
      !fair.some((mark) => bears(finding, mark) && finding.verdict === verdictOf(mark)),
  ).length;
  return {
    reward: labelled === 1 && falseAlarms === 0 ? 1 : 0,
    noticed,
    labelled,
    false_alarms: falseAlarms,
  };
}

function verdictOf(fair: Fair): string {
  return "verdict" in fair ? fair.verdict : "adds_requirement";
}

function wrongFindingsOn(scenario: string, reply: Reply): WrongFinding[] {
  const from = (list: WrongFinding["list"]) =>
    (reply[list] ?? []).map((finding) => ({ ...finding, list }));
  return [...from("requirements"), ...from("additional_checks")].filter(
    (finding) => finding.scenario === scenario && WRONG.has(String(finding.verdict)),
  );
}

/** Whether a finding quotes the mark's words as a requirement, or is an added check at its line. */
function bears(finding: WrongFinding, mark: Mark): boolean {
  return "requirement" in mark
    ? finding.list === "requirements" &&
        String(finding.requirement).toLowerCase().includes(mark.requirement.toLowerCase())
    : finding.list === "additional_checks" && finding.test_line === mark.test_line;
}

/** The JSON object in the judge's reply, fenced or not. */
function replyOf(text: string): Reply | undefined {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end < start) return undefined;
  try {
    return JSON.parse(text.slice(start, end + 1)) as Reply;
  } catch {
    return undefined;
  }
}

/** The text of the session's final `result` event in Claude Code's stream-json output. */
export function finalReplyOf(stream: string): string {
  const results = stream.split("\n").flatMap((line) => {
    try {
      const event = JSON.parse(line) as { type?: unknown; result?: unknown };
      return event.type === "result" && typeof event.result === "string" ? [event.result] : [];
    } catch {
      return [];
    }
  });
  return results.at(-1) ?? "";
}

if (import.meta.main) {
  const [streamPath = "", expectedPath = ""] = process.argv.slice(2);
  const expected = JSON.parse(readFileSync(expectedPath, "utf8")) as Expected;
  const rewards = rewardsOf(finalReplyOf(readFileSync(streamPath, "utf8")), expected);
  process.stdout.write(`${JSON.stringify(rewards)}\n`);
}
