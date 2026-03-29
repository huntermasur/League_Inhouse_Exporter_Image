---
agent: agent
description: Write tests for existing code using Vitest and React Testing Library
---

# Write Tests

Write tests for an existing file or feature.

## Steps

1. Ask which file or feature needs tests, then read the source before writing anything.
2. Identify what to test:
   - **Logic / hooks**: state transitions, side effects, error paths, edge cases
   - **Components**: renders correctly, responds to user interactions, conditional rendering
   - **Utils**: pure functions with a range of inputs including edge cases and invalid input
3. Create or update the `.test.ts` / `.test.tsx` file co-located with the source file.
4. Follow these conventions:
   - Use `describe` blocks to group related tests
   - Test names start with `it('...')` and read as plain English documentation
   - Prefer `userEvent` over `fireEvent` for interaction testing
   - Mock only at the boundary — prefer real implementations for internal logic
   - Use `vi.fn()` for mocks, `vi.spyOn()` to assert calls without replacing implementations
5. Cover at minimum:
   - Happy path
   - Error / failure path
   - Empty / null / undefined inputs where applicable
   - Any conditional branches visible in the source

## Constraints

- No `any` in test files
- Do not test implementation details (internal state, private methods) — test behavior
- Clean up side effects: reset mocks between tests with `beforeEach(() => vi.clearAllMocks())`
- Do not snapshot entire component trees — snapshot only stable, meaningful output
