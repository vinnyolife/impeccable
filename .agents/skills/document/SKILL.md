# Skill: Document

Automatically generate or improve documentation for code — JSDoc comments, README sections, inline explanations, and API references.

## When to Use

- Functions or modules are missing JSDoc/TSDoc comments
- A README is outdated or missing sections
- Code logic is non-obvious and needs inline explanation
- Public APIs lack usage examples

## Process

### 1. Scan for Gaps

Identify undocumented or poorly documented targets:

```js
// Look for:
// - exported functions without JSDoc
// - complex logic blocks without comments
// - modules missing a top-level description
// - parameters without type annotations or descriptions
```

### 2. Generate JSDoc

For each function, produce a complete JSDoc block:

```js
/**
 * Merges two animation keyframe sets, resolving conflicts by preferring the latter.
 *
 * @param {Keyframe[]} base - The base keyframes to merge into.
 * @param {Keyframe[]} overrides - Keyframes that take precedence on conflict.
 * @returns {Keyframe[]} A new merged keyframe array.
 *
 * @example
 * const merged = mergeKeyframes(baseFrames, overrideFrames);
 */
function mergeKeyframes(base, overrides) { ... }
```

Rules:
- Always document `@param` and `@returns`
- Include `@example` for public-facing utilities
- Use `@throws` if the function can throw
- Keep descriptions concise — one sentence preferred

### 3. Inline Comments

Add inline comments for non-obvious logic only. Do NOT comment obvious code.

```js
// BAD — obvious
const x = a + b; // add a and b

// GOOD — explains why
// Clamp to 1 to avoid division by zero in the easing calculation
const progress = Math.max(elapsed / duration, 1);
```

### 4. README Sections

When updating a README, follow this structure if not already present:

```markdown
## Overview
What this project does and why.

## Installation
Step-by-step setup.

## Usage
Minimal working example.

## API
Key exports with signatures and descriptions.

## Contributing
How to run tests, submit PRs.
```

### 5. Review Output

Before finalizing:
- Verify all `@param` names match actual parameter names
- Confirm examples actually run without error
- Check that descriptions match current behavior (not intended/future behavior)

## Output Format

Return documented code as a diff or full file replacement. Prefer full file when changes are extensive.

## Constraints

- Do not alter logic while documenting
- Do not add comments that restate the code literally
- Preserve existing valid documentation — only update if inaccurate
- Match the existing comment style in the file (single-line vs block)
