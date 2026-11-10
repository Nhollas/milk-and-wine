import { readFileSync } from "node:fs";

/**
 * Grades one trial: `node grade.ts <claude-code stream> <expected.json>` prints Harbor's reward.
 *
 * It runs inside the trial's container, which has Node and nothing else, so it imports nothing.
 */

type Expected =
  | { scenario: string; verdict: "aligned" }
  | { scenario: string; verdict: string; requirement: string }
  | { scenario: string; verdict: "adds_requirement"; test_line: number };

type Finding = {
  scenario?: unknown;
  requirement?: unknown;
  test_line?: unknown;
  verdict?: unknown;
};

type Reply = { requirements?: Finding[]; additional_checks?: Finding[] };

/** Verdicts that say something is wrong with a scenario's tests. */
const WRONG = new Set([
  "misses_requirement",
  "checks_something_else",
  "setup_hides_requirement",
  "contradicts_requirement",
  "adds_requirement",
]);

/**
 * 1 when the judge's reply reports what the task expects, else 0. For `aligned`, that means it
 * reports nothing wrong with the scenario; otherwise one finding on the scenario with the verdict,
 * quoting the requirement or pointing at the added test's line.
 */
export function rewardOf(replyText: string, expected: Expected): number {
  const reply = replyOf(replyText);
  if (reply === undefined) return 0;
  const onScenario = (findings: Finding[] = []) =>
    findings.filter((finding) => finding.scenario === expected.scenario);
  const requirements = onScenario(reply.requirements);
  const additions = onScenario(reply.additional_checks);

  if (!("requirement" in expected) && !("test_line" in expected)) {
    const wrong = [...requirements, ...additions].some((finding) =>
      WRONG.has(String(finding.verdict)),
    );
    return wrong ? 0 : 1;
  }
  if ("test_line" in expected) {
    const found = additions.some(
      (finding) => finding.verdict === expected.verdict && finding.test_line === expected.test_line,
    );
    return found ? 1 : 0;
  }
  const quote = expected.requirement.toLowerCase();
  const found = requirements.some(
    (finding) =>
      finding.verdict === expected.verdict &&
      String(finding.requirement).toLowerCase().includes(quote),
  );
  return found ? 1 : 0;
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
  const reward = rewardOf(finalReplyOf(readFileSync(streamPath, "utf8")), expected);
  process.stdout.write(`${JSON.stringify({ reward })}\n`);
}
