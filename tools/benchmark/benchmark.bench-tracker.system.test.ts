import { expect, test } from "vitest";
import {
  benchInstructions,
  commandsUnder,
  git,
  newRepositoryOnMain,
  run,
} from "../../tests/support/bench-tracker.ts";

test("B13: merges a ticket into main when it goes up for review", () => {
  const repository = newRepositoryOnMain();
  git(repository, "switch", "--create", "ticket/shop/01-add-cart");
  git(repository, "commit", "--allow-empty", "-m", "feat: add cart");
  git(repository, "switch", "main");
  git(repository, "commit", "--allow-empty", "-m", "chore: move main on");

  run(
    repository,
    commandsUnder(benchInstructions(), "Put a change up for review", {
      branch: "ticket/shop/01-add-cart",
    }),
  );

  expect(() =>
    git(repository, "merge-base", "--is-ancestor", "ticket/shop/01-add-cart", "main"),
  ).not.toThrow();
  expect(git(repository, "rev-list", "--parents", "-n", "1", "main").split(" ")).toHaveLength(3);
});
