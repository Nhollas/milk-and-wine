import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";
import {
  benchInstructions,
  commandsUnder,
  git,
  newRepositoryOnMain,
  run,
} from "../../tests/support/bench-tracker.ts";

test("B13: merges a ticket into main when it goes up for review, which closes the ticket", () => {
  const branch = "ticket/shop/01-add-cart";
  const ticketFile = ".issues/shop/tickets/01-add-cart.md";
  const repository = newRepositoryOnMain();
  appendFileSync(join(repository, ".git/info/exclude"), ".issues/\n");
  mkdirSync(join(repository, ".issues/shop/tickets"), { recursive: true });
  writeFileSync(join(repository, ticketFile), "# Add cart\nBlocked by: none\n");
  git(repository, "switch", "--create", branch);
  git(repository, "commit", "--allow-empty", "-m", "feat: add cart");

  run(
    repository,
    commandsUnder(benchInstructions(), "Put a change up for review", {
      branch,
      "ticket-file": ticketFile,
    }),
  );

  const review = readFileSync(join(repository, ticketFile), "utf8").split(/^## Review$/mu)[1] ?? "";
  expect(review).toContain(branch);
  expect(() => git(repository, "merge-base", "--is-ancestor", branch, "main")).not.toThrow();
  expect(git(repository, "rev-list", "--parents", "-n", "1", "main").split(" ")).toHaveLength(3);
});
