Launch interactive live variant mode: select elements in the browser, pick a design action, and get AI-generated HTML+CSS variants hot-swapped via the dev server's HMR.

## Prerequisites

- A running development server with hot module replacement (Vite, Next.js, Bun, etc.), OR a static HTML file open in the browser
- The impeccable CLI installed (`npm i -g impeccable`)

## Start the Server

1. Read `.impeccable.md` if it exists. Keep the design context in mind for variant generation.
2. Start the live variant server:
   ```bash
   npx impeccable live &
   ```
3. Note the **port** and **token** printed to stdout.

## Inject the Browser Script

Find the project's main HTML entry point. This varies by framework:

| Framework | Typical file |
|-----------|-------------|
| Plain HTML | `index.html` |
| Vite / React | `index.html` (project root) |
| Next.js (App Router) | `app/layout.tsx` (add a `<Script>` component) |
| Next.js (Pages) | `pages/_document.tsx` |
| Nuxt | `app.vue` or `nuxt.config.ts` |
| Svelte / SvelteKit | `src/app.html` |

Add the script tag between comment markers (replace PORT with the actual port):

**HTML / Vue / Svelte:**
```html
<!-- impeccable-live-start -->
<script src="http://localhost:PORT/live.js"></script>
<!-- impeccable-live-end -->
```

**JSX / TSX (React, Next.js):**
```jsx
{/* impeccable-live-start */}
<script src="http://localhost:PORT/live.js"></script>
{/* impeccable-live-end */}
```

Place it before the closing `</body>` or at the end of the layout component. Save the file. The dev server will reload and the element picker will activate.

If browser automation tools are available, also navigate to the page so the user can see it.

## Enter the Poll Loop

Run a blocking poll loop. On each iteration, wait for a browser event and respond:

```
LOOP:
  Run: npx impeccable poll
  Read the JSON output. Dispatch based on the "type" field:

  TYPE "generate":
    → See "Handle Generate" below

  TYPE "accept":
    → See "Handle Accept" below

  TYPE "discard":
    → See "Handle Discard" below

  TYPE "exit":
    → Break the loop

  TYPE "timeout":
    → Continue (re-poll)

END LOOP
```

## Handle Generate

The event contains: `{id, action, freeformPrompt, count, pageUrl, element}`.

**Speed matters.** The user is watching a spinner. Minimize tool calls by using the `wrap` helper and writing all variants in a single edit.

### Step 1: Wrap the element (one CLI call)

Use the `wrap` helper to find the element and create the variant container:

```bash
npx impeccable wrap --id EVENT_ID --count EVENT_COUNT --element-id "ELEMENT_ID" --classes "class1,class2" --tag "div"
```

Pass the element's id (`event.element.id`), classes (`event.element.classes` joined with commas), and tag name. The command searches in priority order: ID match first, then class names, then tag+class combo. If `event.pageUrl` hints at the file (e.g., `/` is usually `index.html`), pass `--file PATH` to skip the search.

The command outputs JSON with the file path and the insert line:
```json
{"file": "public/index.html", "insertLine": 93, "commentSyntax": {"open": "<!--", "close": "-->"}}
```

If `wrap` fails, fall back to manual grep + edit.

### Step 2: Generate all variants and write them in a SINGLE edit

1. **Load the design command's reference file.** If `event.action` is "bolder", load `reference/bolder.md`. If "impeccable" (the default), use the main design principles from this skill without loading a sub-command reference.

2. **Generate ALL variants at once.** For each variant, create a complete HTML replacement of the original element. Consider the element's context (computed styles, parent structure, CSS custom properties from `event.element`).

3. **Diversify across variants.** Each variant should take a distinctly different approach. For "bolder", one might focus on type weight, another on color saturation, another on spatial scale, another on structural change. Do NOT generate N variations on the same idea.

4. **If a freeform prompt was provided** (`event.freeformPrompt`), use it as additional guidance for all variants.

5. **Write all variants in a single file edit** at the insert line reported by `wrap`. Use the comment syntax from the `wrap` output:

```html
<!-- Variants: insert below this line -->
<div data-impeccable-variant="1">
  <!-- variant 1: full element replacement -->
</div>
<div data-impeccable-variant="2" style="display: none">
  <!-- variant 2: full element replacement -->
</div>
<div data-impeccable-variant="3" style="display: none">
  <!-- variant 3: full element replacement -->
</div>
```

The first variant should NOT have `style="display: none"` (it should be visible by default). All others should.

6. **Write scoped CSS** if the variants need styles beyond inline:
   ```css
   /* impeccable-variants-css-start SESSION_ID */
   @scope ([data-impeccable-variant="1"]) { ... }
   @scope ([data-impeccable-variant="2"]) { ... }
   /* impeccable-variants-css-end SESSION_ID */
   ```

**IMPORTANT**: Write all variants in ONE edit call, not one per variant. This saves multiple round-trips and the browser's MutationObserver will pick up all variants at once.

### Step 3: Signal completion

Include `--file` so the browser can fetch variants directly if the dev server lacks HMR:

```bash
npx impeccable poll --reply EVENT_ID done --file RELATIVE_PATH
```

The file path should be relative to the project root (e.g., `public/index.html`, `src/App.tsx`).

## Handle Accept

The event contains: `{id, variantId}`.

The user accepted a specific variant. For v1 (inspection mode):
1. Read the accepted variant's HTML from the source (the content inside `[data-impeccable-variant="VARIANT_ID"]`).
2. Present the variant code to the user in the conversation.
3. Clean up the source: remove the entire variant wrapper (everything between `impeccable-variants-start` and `impeccable-variants-end` markers), and restore the original element.
4. Remove any scoped CSS blocks (between `impeccable-variants-css-start` and `impeccable-variants-css-end` markers).
5. Reply:
   ```bash
   npx impeccable poll --reply SESSION_ID done
   ```

## Handle Discard

The event contains: `{id}`.

1. Remove the variant wrapper from the source file.
2. Restore the original element (the content inside `[data-impeccable-variant="original"]`).
3. Remove any scoped CSS blocks for this session.
4. Reply:
   ```bash
   npx impeccable poll --reply SESSION_ID done
   ```

## Cleanup (on exit)

When the loop ends:

1. **Remove the injected script tag** from the source file. Delete everything between `<!-- impeccable-live-start -->` and `<!-- impeccable-live-end -->` (inclusive). Use the appropriate comment syntax for the framework.
2. **Remove any leftover variant wrappers** (search for `impeccable-variants-start` markers and clean up).
3. **Stop the server**:
   ```bash
   npx impeccable live stop
   ```

## Variant Generation Guidelines

- Each variant must be a **complete element replacement**, not a CSS-only patch. Rewrite the entire element with the design transformation applied.
- Use **`@scope`** for CSS isolation. This is supported in Chrome 118+, Firefox 128+, Safari 17.4+, which covers all modern dev browsers.
- Follow the design principles from this skill (typography, color, spatial design, etc.) and the `.impeccable.md` project context if available.
- If no `.impeccable.md` exists, generate brand-agnostic variants. The live UI will show a warning to the user.
- **Non-interactive mode**: do NOT ask the user for clarification during generation. If context is missing, proceed with reasonable defaults.
