# Contributing to Persona

## Branches and pull requests

Create a short-lived branch from `dev` and open a focused pull request back to `dev`. Use `feature/`, `fix/`, `chore/`, `docs/`, `refactor/`, or `test/` followed by a short descriptive name.

Only `dev` may be merged into `main`, through a pull request. Do not push directly to either protected branch. Link the relevant issue, describe the intended behavior, and report checks actually run. Keep unrelated changes in separate pull requests.

## Testing

For each behavior change, write a focused test first and confirm that it fails for the expected reason. Implement the behavior, make the test pass, then refactor. Choose the smallest useful scope: unit tests for isolated rules, integration tests for component and HTTP boundaries, and a few end-to-end tests for complete API flows. Once the stack is chosen, keep these suites independently runnable.

Use plausible fixtures and assert product behavior rather than duplicating implementation details. Cover meaningful boundaries and failure modes without repeating the same scenario at every scope. State the checks actually run in the pull request.

## Repository content

Keep code, tests, assets, and durable product or contributor documentation in the repository. Track planning work in GitHub Issues and Projects. Do not commit local reports, drafts, generated builds, secrets, or unreviewed assets. Record the provenance and usage rights of added datasets and images.

Write repository documentation, code identifiers, commit messages, and pull request descriptions in English. Localize user-facing product content when applicable.
