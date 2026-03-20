---
name: critique
description: Evaluate design effectiveness from a UX perspective. Assesses visual hierarchy, information architecture, emotional resonance, and overall design quality with actionable feedback. Use when the user wants a design review, UX feedback, asks to evaluate visual quality, or wants to check for AI-generated design tells.
user-invokable: true
args:
  - name: area
    description: The feature or area to critique (optional)
    required: false
allowed-tools:
  - Bash(python3 -m http.server 8384 *)
  - Bash(kill $(lsof -ti:8384)*)
  - Bash(lsof -ti:8384*)
  - Bash(node *detect-antipatterns*)
---

## STEPS

### Step 1: Invoke the frontend-design skill

Invoke the frontend-design skill (using the Skill tool, not by reading the file). It contains design principles, anti-patterns, and the **Context Gathering Protocol**. Follow the protocol before proceeding -- if no design context exists yet, you MUST run teach-impeccable first. Additionally gather: what the interface is trying to accomplish.

### Step 2: Gather assessments

Launch two independent assessments. **Neither must see the other's output** to avoid bias.

If your system supports sub-agents (e.g., Claude Code's Agent tool), delegate each assessment to a separate agent. The sub-agents should return their findings as structured text -- do NOT output findings to the user yet. If sub-agents are not available, complete each assessment sequentially, writing findings to internal notes before proceeding.

#### Assessment A: LLM Design Review

Read the relevant source files (HTML, CSS, JS/TS) and, if browser automation is available, visually inspect the live page. Think like a design director. Evaluate:

**AI Slop Detection (CRITICAL)**: Does this look like every other AI-generated interface? Review against ALL **DON'T** guidelines in the frontend-design skill. Check for AI color palette, gradient text, dark glows, glassmorphism, hero metric layouts, identical card grids, generic fonts, and all other tells. **The test**: If someone said "AI made this," would you believe them immediately?

**Holistic Design Review**: visual hierarchy (eye flow, primary action clarity), information architecture (structure, grouping, cognitive load), emotional resonance (does it match brand and audience?), discoverability (are interactive elements obvious?), composition (balance, whitespace, rhythm), typography (hierarchy, readability, font choices), color (purposeful use, cohesion, accessibility), states & edge cases (empty, loading, error, success), microcopy (clarity, tone, helpfulness).

Return structured findings covering: AI slop verdict, what's working (2-3 items), priority issues (3-5 with what/why/fix), minor observations, and provocative questions.

#### Assessment B: Automated Detection

Run the bundled deterministic detector, which flags 25 specific patterns (AI slop tells + general design quality).

**CLI scan**:
```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/detect-antipatterns.mjs --json [--fast] [target]
```

- Pass HTML/JSX/TSX/Vue/Svelte files or directories as `[target]` (anything with markup). Do not pass CSS-only files.
- For URLs, skip the CLI scan (it requires Puppeteer). Use browser visualization instead.
- For large directories (200+ scannable files), use `--fast` (regex-only, skips jsdom)
- For 500+ files, narrow scope or ask the user
- Exit code 0 = clean, 2 = findings

**Browser visualization** (when browser automation tools are available AND the target is a viewable page):

The overlay is a **visual aid for the user** -- it highlights issues directly in their browser. Do NOT scroll through the page to screenshot overlays. Instead, read the console output to get the results programmatically.

1. **Serve the script**:
   ```bash
   python3 -m http.server 8384 -d ${CLAUDE_PLUGIN_ROOT}/scripts/ &
   ```
2. **Navigate** to the page (use dev server URL for local files, or direct URL)
3. **Scroll to top** -- ensure the page is scrolled to the very top before injection
4. **Inject** via `javascript_tool`:
   ```javascript
   const s = document.createElement('script'); s.src = 'http://localhost:8384/detect-antipatterns-browser.js'; document.head.appendChild(s);
   ```
5. Wait 2-3 seconds for the detector to render overlays
6. **Read results from console** using `read_console_messages` with pattern `impeccable` -- the detector logs all findings with the `[impeccable]` prefix. Do NOT scroll through the page to take screenshots of the overlays.
7. **Cleanup**: Kill the HTTP server when done:
   ```bash
   kill $(lsof -ti:8384) 2>/dev/null; echo "done"
   ```

For multi-view targets, inject on 3-5 representative pages. If injection fails, continue with CLI results only.

Return: CLI findings (JSON), browser console findings (if applicable), and any false positives noted.

### Step 3: Generate Combined Critique Report

Synthesize both assessments into a single report. Do NOT simply concatenate -- weave the findings together, noting where the LLM review and detector agree, where the detector caught issues the LLM missed, and where detector findings are false positives.

Structure your feedback as a design director would:

#### Anti-Patterns Verdict

**Start here.** Does this look AI-generated?

**LLM assessment**: Your own evaluation of AI slop tells. Cover overall aesthetic feel, layout sameness, generic composition, missed opportunities for personality.

**Deterministic scan**: Summarize what the automated detector found, with counts and file locations. Note any additional issues the detector caught that you missed, and flag any false positives.

**Visual overlays** (if browser was used): Tell the user that overlays are now visible in their browser, highlighting the detected issues. Summarize what the console output reported.

#### Overall Impression
A brief gut reaction -- what works, what doesn't, and the single biggest opportunity.

#### What's Working
Highlight 2-3 things done well. Be specific about why they work.

#### Priority Issues
The 3-5 most impactful design problems, ordered by importance:

For each issue:
- **What**: Name the problem clearly
- **Why it matters**: How this hurts users or undermines goals
- **Fix**: What to do about it (be concrete)
- **Command**: Which command to use (prefer: /animate, /quieter, /optimize, /adapt, /clarify, /distill, /delight, /onboard, /normalize, /audit, /harden, /polish, /extract, /bolder, /arrange, /typeset, /critique, /colorize, /overdrive -- or other installed skills you're sure exist)

#### Minor Observations
Quick notes on smaller issues worth addressing.

#### Questions to Consider
Provocative questions that might unlock better solutions:
- "What if the primary action were more prominent?"
- "Does this need to feel this complex?"
- "What would a confident version of this look like?"

**Remember**:
- Be direct -- vague feedback wastes everyone's time
- Be specific -- "the submit button" not "some elements"
- Say what's wrong AND why it matters to users
- Give concrete suggestions, not just "consider exploring..."
- Prioritize ruthlessly -- if everything is important, nothing is
- Don't soften criticism -- developers need honest feedback to ship great design