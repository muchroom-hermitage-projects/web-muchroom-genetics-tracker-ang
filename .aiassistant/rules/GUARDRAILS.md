---
apply: always
---

### MANDATORY PROTOCOL: BATCH RED-GREEN TDD

0. RED-GREEN BATCH SEQUENCE:

- BLUEPRINT: Before coding, list exactly which methods are moving and which files will be modified.
- RED (Batch): Author ALL unit tests for the current batch's methods FIRST. Tests must fail.
- GREEN (Batch): Implement the minimum logic to pass all tests in the batch.
- REFACTOR: Clean up duplication and verify the batch remains green.
- DEPENDENCY CHECK:
  - List every caller of the modified methods and confirm tests cover them or confirm no behavior change.
  - Use project-wide search to identify all callers of the modified method (excluding node_modules, dist, build, and generated files).
  - If behavior changes for callers, update or add tests for those callers.

1. ANTI-FLUFF & CODE INTEGRITY RAILS:

- NO DUPLICATION: You must search the project for existing utilities/services before creating new logic (excluding node_modules, dist, build, and generated files). Reuse > Creation.
- ASSERTION QUALITY: Avoid generic 'toBeTruthy' assertions. Every test must verify a specific value, a DOM change, or a service call with exact arguments.
- NO DECORATIVE CODE: Do not add "nice-to-have" comments, console logs, or unused variables.
- SCOPED MODIFICATION: Only touch files identified in the BLUEPRINT. Do not attempt "global" cleanup outside the current batch.
- NO SPECULATIVE IMPORTS: Only import modules that already exist in the project or in package.json.
- NO SPECULATIVE FILES: Do not create new files unless the BLUEPRINT explicitly lists them.
- DELETE-FIRST RULE: Check whether the problem can be solved by modifying or extending existing code instead of adding new files.

2. ASSERTION SPECIFICITY:
   2.1. Tests must assert:

- exact return values
- exact DOM changes
- exact service calls with arguments
- state transitions

  2.2. Discouraged assertions unless justified:

- toBeTruthy
- toBeDefined
- toBeInstanceOf

3. DEFENSIVE TESTING (Mandatory Cases):

For every method create tests covering:

- Happy Path
- Null/Undefined Input
- Malformed Input
- Boundary Case
- Empty Input (empty array/string/object)

4. REFACTORING SAFETY:

- Logic and its corresponding tests MUST move together.
- A refactor is not complete until the destination file maintains 80%+ branch coverage.
- Coverage must not decrease during refactoring.

5. UTILITY CREATION RULE:

Before creating a new function/service:

- Search the repository for existing implementations.
- If none exist, explicitly state: "No existing implementation found."
- Only then create the new utility.

6. MINIMAL IMPLEMENTATION RULE:

Implementation must satisfy tests using the smallest possible logic.
Do not introduce additional abstractions, utilities, or layers unless required by tests.

7. TEST STRENGTH CHECK:
   Verify that a test would fail if:

- the return value is changed
- the condition is inverted
- the side effect is removed

8. VERIFICATION LOOP:

- Execute 'npm run test' after every batch.
- Execute `tsc --noEmit`.
- Execute `npm run lint`.
- ZERO-WARNING POLICY: Zero ESLint errors, zero 'any' types, and zero console warnings during test execution.

9. ANGULAR-SPECIFIC CLEANUP RULES:

- CLEANUP: Verify 'ngOnDestroy' cleans up any global window handles or subscriptions created for E2E.
- All subscriptions must use:
  - takeUntil
  - async pipe
  - signal lifecycle
- Avoid nested subscriptions. Use RxJS operators (switchMap, mergeMap, etc.).

10. ARCHITECTURE GUARD:

- Layer rules: Components → Services → Utilities

- Forbidden:
  - Utilities importing Angular
  - Services importing Components
  - Features must not import components or services from other feature directories
  - Shared logic must live in shared utilities/services

11. TEST DETERMINISM:

- Forbidden in tests:
  - Date.now()
  - Math.random()
  - real network calls
  - real timers
  - environment-dependent paths

12. BATCH SIZE LIMIT:

- Max 1 logical feature per batch
- Max:
  - 150 lines changed
  - 3 files modified
- If exceeded → split batch.

13. SELF AUDIT CHECKLIST:

Before completing the batch verify:

- No duplicated utilities created
- No speculative imports
- All tests fail before implementation
- All tests pass after implementation
- No unused variables
- No unreachable code
- No unused imports
- Confirm that the batch still respects the BATCH SIZE LIMIT.

14. CHANGE JUSTIFICATION:

For every file modified explain in 1 sentence:
WHY the change was necessary.

15. NO GUESSING:

If required information is missing, the agent must ask a clarification question instead of making assumptions.

16. FUNCTION SIZE GUARD:

Functions should generally remain under ~40 lines.
If logic grows larger, split into well-named helper functions.

17. EXISTING PATTERN PRIORITY:

Before introducing a new pattern, class type, or abstraction,
search for existing patterns used for similar functionality.

Follow the established pattern unless there is a clear reason not to.

18. NAME CONSISTENCY GUARD:

When naming functions, services, or variables,
prefer terminology already used in the codebase.

Avoid introducing new synonyms for existing concepts.

19. SERVICE PROLIFERATION GUARD:

Before creating a new service, verify whether the functionality
belongs in an existing service.

20. TEST GENERALITY RULE:

Tests should validate behavior patterns rather than
enumerating many specific input-output pairs.

21. MAX ITERATIONS PER BATCH: 3. After that: escalate to human review.
