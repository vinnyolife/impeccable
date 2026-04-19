# Skill: Refactor

Refactor existing code for clarity, maintainability, and performance without changing behavior.

## Usage

```
@agent refactor [target] [--strategy <strategy>]
```

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `target` | Yes | File, function, or module to refactor |
| `--strategy` | No | Refactoring strategy to apply (see below) |

## Strategies

- `extract` — Extract repeated logic into reusable functions
- `simplify` — Reduce complexity, flatten nesting, shorten chains
- `naming` — Improve variable, function, and class names
- `decompose` — Break large functions into smaller focused ones
- `dry` — Eliminate duplication (Don't Repeat Yourself)
- `modernize` — Upgrade to current JS/TS idioms and syntax

Defaults to running all strategies if none specified.

## What It Does

1. Parses the target file or function
2. Identifies code smells and improvement opportunities
3. Applies the selected strategy
4. Validates that behavior is preserved (runs existing tests if available)
5. Outputs a diff with inline comments explaining each change

## Code Smells Detected

- Functions longer than 40 lines
- Nesting deeper than 3 levels
- Magic numbers and strings
- Repeated logic blocks (>3 lines duplicated)
- Poorly named identifiers (`data`, `temp`, `x`, `foo`)
- Callback hell / unflattened promise chains
- Unused variables or imports
- Overly complex conditionals

## Output

```
Refactoring: src/utils/parser.js
Strategy: decompose, dry

[extract] Lines 42–67 → parseTokenStream()
[dry] Merged 3 duplicate error handlers → handleParseError()
[naming] Renamed `d` → `delimiter`, `res` → `parsedResult`

Changes: 3 functions extracted, 18 lines removed
Tests: 12 passed, 0 failed
```

## Examples

```bash
# Refactor a single file
@agent refactor src/components/Header.js

# Apply only the simplify strategy
@agent refactor src/utils/format.js --strategy simplify

# Modernize legacy callback-based code
@agent refactor src/api/legacy.js --strategy modernize
```

## Notes

- Always runs a behavior diff before and after to confirm no logic changes
- Will not refactor auto-generated files
- Respects `.eslintrc` and `.prettierrc` formatting rules
- Creates a git stash before applying changes so you can revert easily
