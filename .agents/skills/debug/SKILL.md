# Debug Skill

Analyze and fix bugs in JavaScript/CSS code with clear explanations.

## Trigger Phrases

- "debug this"
- "fix the bug"
- "why is this broken"
- "something's wrong with"
- "not working"
- "broken"

## Behavior

When invoked, this skill:

1. Reads the relevant file(s) to understand the code
2. Identifies the root cause of the issue
3. Proposes a minimal fix that doesn't introduce side effects
4. Explains what was wrong and why the fix works

## Process

### Step 1: Reproduce the Problem

Before fixing anything, understand what's actually broken:

- What is the expected behavior?
- What is the actual behavior?
- Is there an error message or just wrong output?
- Is it reproducible consistently or intermittent?

### Step 2: Isolate the Cause

Narrow down where the bug lives:

- Check recent changes — most bugs live close to the last edit
- Look for off-by-one errors, null/undefined access, wrong scope
- Check async timing issues (missing await, race conditions)
- Verify CSS specificity or cascade conflicts for visual bugs

### Step 3: Apply Minimal Fix

Fix only what's broken:

- Don't refactor while fixing — separate concerns
- Prefer the simplest change that corrects the behavior
- If a workaround is needed, comment why

### Step 4: Explain

Always explain:

```
Root cause: [what was wrong]
Fix: [what changed]
Why it works: [brief reasoning]
```

## Common Bug Patterns

### JavaScript

```js
// BAD: mutating shared state
const defaults = { color: 'red' };
function configure(opts) {
  defaults.color = opts.color; // mutates original
}

// GOOD: merge into new object
function configure(opts) {
  return { ...defaults, ...opts };
}
```

```js
// BAD: async without await
function loadData() {
  const data = fetch('/api/data'); // returns Promise, not data
  return data.json();
}

// GOOD
async function loadData() {
  const res = await fetch('/api/data');
  return res.json();
}
```

### CSS

```css
/* BAD: z-index without positioning */
.tooltip {
  z-index: 100; /* has no effect without position set */
}

/* GOOD */
.tooltip {
  position: relative;
  z-index: 100;
}
```

## Output Format

Return a diff or the corrected code block, followed by the explanation section.

If multiple bugs exist, address them in order of severity — crashes first, visual glitches last.

## Constraints

- Do not introduce new dependencies to fix a bug
- Do not change function signatures unless the signature itself is the bug
- Flag if the fix is a workaround vs a proper solution
