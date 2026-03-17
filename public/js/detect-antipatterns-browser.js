/**
 * Anti-Pattern Browser Detector for Impeccable
 *
 * Drop this script into any page to visually highlight UI anti-patterns.
 *
 * Two detection modes:
 *   - "static"   (default): regex on HTML source — same logic as the CLI script,
 *                 so fixture pages test exactly what the CLI tests.
 *   - "computed": getComputedStyle() — catches CSS cascade, inherited styles.
 *                 More accurate but may diverge from CLI results.
 *
 * Set mode via data attribute on the script tag:
 *   <script src="detect-antipatterns-browser.js" data-mode="computed"></script>
 *
 * Or call: window.impeccableScan({ mode: 'computed' })
 */
(function () {
  if (typeof window === 'undefined') return;

  const LABEL_BG = 'oklch(55% 0.25 350)';
  const OUTLINE_COLOR = 'oklch(60% 0.25 350)';

  // Read mode from script tag data attribute (default: static)
  const scriptTag = document.currentScript;
  const defaultMode = scriptTag?.dataset?.mode || 'static';

  // -----------------------------------------------------------------------
  // Static detection (mirrors CLI regex logic)
  // -----------------------------------------------------------------------

  const SAFE_ELEMENTS_RE = /^(blockquote|nav|a|input|textarea|select|pre|code|span|th|td|tr|li|label|button|hr)$/i;

  function hasRoundedClass(str) { return /\brounded(?:-\w+)?\b/.test(str); }


  /**
   * Scan <style> blocks for CSS rules with anti-pattern border properties.
   * Returns a Map of element → findings[] for elements matching those selectors.
   */
  function scanStyleBlocks() {
    const elementFindings = new Map();
    const styleTags = document.querySelectorAll('style');

    for (const styleTag of styleTags) {
      const css = styleTag.textContent;
      // Simple CSS rule parser: extract selector { ... } blocks
      const ruleRe = /([^{}]+)\{([^}]+)\}/g;
      let rule;
      while ((rule = ruleRe.exec(css)) !== null) {
        const selector = rule[1].trim();
        const body = rule[2];

        const findings = [];
        let m;

        // Check for border-radius in the same rule
        const ruleHasRadius = /border-radius/i.test(body);

        // Collect border patterns from this rule (as templates — radius check deferred to element)
        const borderPatterns = [];

        // Side borders: border-left/right shorthand
        const cssSide = /border-(?:left|right)\s*:\s*(\d+)px\s+solid[^;]*/gi;
        while ((m = cssSide.exec(body)) !== null) {
          const n = parseInt(m[1], 10);
          const neutral = isNeutralInline(m[0]);
          borderPatterns.push({ n, text: m[0].trim(), direction: 'side', neutral });
        }

        // Side borders: longhand
        const cssLong = /border-(?:left|right)-width\s*:\s*(\d+)px/gi;
        while ((m = cssLong.exec(body)) !== null) {
          borderPatterns.push({ n: parseInt(m[1], 10), text: m[0], direction: 'side', neutral: false });
        }

        // Side borders: logical
        const cssLogical = /border-inline-(?:start|end)\s*:\s*(\d+)px\s+solid/gi;
        while ((m = cssLogical.exec(body)) !== null) {
          borderPatterns.push({ n: parseInt(m[1], 10), text: m[0], direction: 'side', neutral: false });
        }

        // Side borders: logical longhand
        const cssLogLong = /border-inline-(?:start|end)-width\s*:\s*(\d+)px/gi;
        while ((m = cssLogLong.exec(body)) !== null) {
          borderPatterns.push({ n: parseInt(m[1], 10), text: m[0], direction: 'side', neutral: false });
        }

        // Top/bottom borders
        const cssTB = /border-(?:top|bottom)\s*:\s*(\d+)px\s+solid[^;]*/gi;
        while ((m = cssTB.exec(body)) !== null) {
          borderPatterns.push({ n: parseInt(m[1], 10), text: m[0].trim(), direction: 'tb', neutral: false });
        }

        if (borderPatterns.length === 0) continue;

        // Map findings to matching DOM elements, using computed radius for context
        try {
          const els = document.querySelectorAll(selector);
          for (const el of els) {
            if (SAFE_ELEMENTS_RE.test(el.tagName.toLowerCase())) continue;
            const elRadius = ruleHasRadius || (parseFloat(getComputedStyle(el).borderRadius) || 0) > 0;

            const findings = [];
            for (const bp of borderPatterns) {
              if (bp.direction === 'side') {
                if (bp.neutral) continue;
                if (elRadius && bp.n >= 1) {
                  findings.push({ type: 'side-tab', detail: `${bp.text} + border-radius` });
                } else if (bp.n >= 3) {
                  findings.push({ type: 'side-tab', detail: bp.text });
                }
              } else {
                // top/bottom: only with radius
                if (elRadius && bp.n >= 1) {
                  findings.push({ type: 'border-accent-on-rounded', detail: `${bp.text} + border-radius` });
                }
              }
            }

            if (findings.length > 0) {
              const existing = elementFindings.get(el) || [];
              existing.push(...findings);
              elementFindings.set(el, existing);
            }
          }
        } catch {
          // Invalid selector, skip
        }
      }
    }

    return elementFindings;
  }

  /** Check if an inline CSS color value looks neutral (gray/white/black) */
  function isNeutralInline(cssText) {
    // Extract the color from "Npx solid #color" or "Npx solid rgb(...)"
    const colorMatch = cssText.match(/solid\s+(#[0-9a-f]{3,8}|rgba?\([^)]+\)|\w+)/i);
    if (!colorMatch) return false;
    const color = colorMatch[1].toLowerCase();
    // Named grays
    if (['gray', 'grey', 'silver', 'white', 'black', 'transparent', 'currentcolor'].includes(color)) return true;
    // Hex grays: all channels within 30 of each other
    const hex = color.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    if (hex) {
      const [r, g, b] = [parseInt(hex[1], 16), parseInt(hex[2], 16), parseInt(hex[3], 16)];
      return (Math.max(r, g, b) - Math.min(r, g, b)) < 30;
    }
    // Short hex
    const shex = color.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i);
    if (shex) {
      const [r, g, b] = [parseInt(shex[1] + shex[1], 16), parseInt(shex[2] + shex[2], 16), parseInt(shex[3] + shex[3], 16)];
      return (Math.max(r, g, b) - Math.min(r, g, b)) < 30;
    }
    return false;
  }

  function scanElementStatic(el) {
    const findings = [];
    const tag = el.tagName.toLowerCase();

    // Get the raw class list and inline style as strings to regex against
    const classList = el.getAttribute('class') || '';
    const inlineStyle = el.getAttribute('style') || '';

    const hasRounded = hasRoundedClass(classList);
    const isSafe = SAFE_ELEMENTS_RE.test(tag);

    // Use computed style for border-radius — catches radius from CSS classes
    const computedRadius = parseFloat(getComputedStyle(el).borderRadius) || 0;
    const hasRadius = hasRounded || computedRadius > 0;

    // --- Tailwind side borders: border-[lrse]-N ---
    const twSide = /\bborder-([lrse])-(\d+)\b/g;
    let m;
    while ((m = twSide.exec(classList)) !== null) {
      const n = parseInt(m[2], 10);
      if (hasRadius && n >= 1) {
        findings.push({ type: 'side-tab', detail: `${m[0]} + rounded` });
      } else if (n >= 4) {
        findings.push({ type: 'side-tab', detail: m[0] });
      }
    }

    // --- Tailwind top/bottom borders: border-[tb]-N ---
    const twTB = /\bborder-([tb])-(\d+)\b/g;
    while ((m = twTB.exec(classList)) !== null) {
      const n = parseInt(m[2], 10);
      if (hasRadius && n >= 1) {
        findings.push({ type: 'border-accent-on-rounded', detail: `${m[0]} + rounded` });
      }
    }

    // --- CSS shorthand: border-left/right: Npx solid ---
    if (!isSafe) {
      const cssSide = /border-(?:left|right)\s*:\s*(\d+)px\s+solid[^;]*/gi;
      while ((m = cssSide.exec(inlineStyle)) !== null) {
        const n = parseInt(m[1], 10);
        if (isNeutralInline(m[0])) continue; // skip gray/structural borders
        if (hasRadius && n >= 1) {
          findings.push({ type: 'side-tab', detail: `${m[0].split(';')[0].trim()} + border-radius` });
        } else if (n >= 3) {
          findings.push({ type: 'side-tab', detail: m[0].split(';')[0].trim() });
        }
      }
    }

    // --- CSS shorthand: border-top/bottom + border-radius ---
    const cssTB = /border-(?:top|bottom)\s*:\s*(\d+)px\s+solid[^;]*/gi;
    while ((m = cssTB.exec(inlineStyle)) !== null) {
      const n = parseInt(m[1], 10);
      if (hasRadius && n >= 1) {
        findings.push({ type: 'border-accent-on-rounded', detail: `${m[0].split(';')[0].trim()} + border-radius` });
      }
    }

    // --- CSS longhand: border-left/right-width ---
    if (!isSafe) {
      const cssLong = /border-(?:left|right)-width\s*:\s*(\d+)px/gi;
      while ((m = cssLong.exec(inlineStyle)) !== null) {
        if (parseInt(m[1], 10) >= 3) {
          findings.push({ type: 'side-tab', detail: m[0] });
        }
      }
    }

    // --- CSS logical: border-inline-start/end ---
    if (!isSafe) {
      const cssLogical = /border-inline-(?:start|end)\s*:\s*(\d+)px\s+solid/gi;
      while ((m = cssLogical.exec(inlineStyle)) !== null) {
        if (parseInt(m[1], 10) >= 3) {
          findings.push({ type: 'side-tab', detail: m[0] });
        }
      }
    }

    return findings;
  }

  // -----------------------------------------------------------------------
  // Computed style detection (more accurate, for skill/production use)
  // -----------------------------------------------------------------------

  const SAFE_TAGS_COMPUTED = new Set(['blockquote', 'nav', 'a', 'input', 'textarea', 'select', 'pre', 'code', 'span', 'th', 'td', 'tr', 'li', 'label', 'button', 'hr']);

  function parseColor(color) {
    const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!m) return null;
    return { r: +m[1], g: +m[2], b: +m[3], a: m[4] !== undefined ? +m[4] : 1 };
  }

  function isTransparent(color) {
    const c = parseColor(color);
    return !c || c.a === 0;
  }

  function isNeutral(color) {
    const c = parseColor(color);
    if (!c || c.a === 0) return true;
    return (Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b)) < 30;
  }

  function scanElementComputed(el) {
    const findings = [];
    const tag = el.tagName.toLowerCase();
    if (SAFE_TAGS_COMPUTED.has(tag)) return findings;
    const rect = el.getBoundingClientRect();
    if (rect.width < 20 || rect.height < 20) return findings;

    const style = getComputedStyle(el);
    const sides = ['Top', 'Right', 'Bottom', 'Left'];
    const widths = {};
    const colors = {};
    for (const s of sides) {
      widths[s] = parseFloat(style[`border${s}Width`]) || 0;
      colors[s] = style[`border${s}Color`];
    }

    const radius = parseFloat(style.borderRadius) || 0;

    for (const side of sides) {
      const w = widths[side];
      if (w < 1 || isTransparent(colors[side])) continue;

      const otherSides = sides.filter(s => s !== side);
      const maxOther = Math.max(...otherSides.map(s => widths[s]));
      const isAccent = w >= 2 && (maxOther <= 1 || w >= maxOther * 2);
      if (!isAccent) continue;

      const isSide = side === 'Left' || side === 'Right';

      if (isSide) {
        if (radius > 0) {
          findings.push({ side, type: 'side-tab', detail: `border-${side.toLowerCase()}: ${w}px + border-radius: ${radius}px` });
        } else if (w >= 3 && !isNeutral(colors[side])) {
          findings.push({ side, type: 'side-tab', detail: `border-${side.toLowerCase()}: ${w}px (colored)` });
        } else if (w >= 4) {
          findings.push({ side, type: 'side-tab', detail: `border-${side.toLowerCase()}: ${w}px` });
        }
      } else {
        if (radius > 0) {
          findings.push({ side, type: 'border-accent-on-rounded', detail: `border-${side.toLowerCase()}: ${w}px + border-radius: ${radius}px` });
        }
      }
    }

    return findings;
  }

  // -----------------------------------------------------------------------
  // Highlighting
  // -----------------------------------------------------------------------

  const overlays = [];

  function highlight(el, findings) {
    const rect = el.getBoundingClientRect();
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    const outline = document.createElement('div');
    outline.className = 'impeccable-overlay';
    Object.assign(outline.style, {
      position: 'absolute',
      top: `${rect.top + scrollY - 2}px`,
      left: `${rect.left + scrollX - 2}px`,
      width: `${rect.width + 4}px`,
      height: `${rect.height + 4}px`,
      border: `2px solid ${OUTLINE_COLOR}`,
      borderRadius: '4px',
      pointerEvents: 'none',
      zIndex: '99999',
      boxSizing: 'border-box',
    });

    const label = document.createElement('div');
    label.className = 'impeccable-label';
    const text = findings.map(f => f.type === 'side-tab' ? 'side-tab' : 'accent+rounded').join(', ');
    label.textContent = text;
    Object.assign(label.style, {
      position: 'absolute',
      top: '-20px',
      left: '0',
      background: LABEL_BG,
      color: 'white',
      fontSize: '11px',
      fontFamily: 'system-ui, sans-serif',
      fontWeight: '600',
      padding: '2px 8px',
      borderRadius: '3px',
      whiteSpace: 'nowrap',
      lineHeight: '16px',
      letterSpacing: '0.02em',
    });
    outline.appendChild(label);

    const tooltip = document.createElement('div');
    tooltip.className = 'impeccable-tooltip';
    tooltip.innerHTML = findings.map(f => f.detail).join('<br>');
    Object.assign(tooltip.style, {
      position: 'absolute',
      bottom: '-28px',
      left: '0',
      background: 'rgba(0,0,0,0.85)',
      color: '#e5e5e5',
      fontSize: '11px',
      fontFamily: 'ui-monospace, monospace',
      padding: '4px 8px',
      borderRadius: '3px',
      whiteSpace: 'nowrap',
      lineHeight: '16px',
      display: 'none',
      zIndex: '100000',
    });
    outline.appendChild(tooltip);

    outline.addEventListener('mouseenter', () => {
      outline.style.pointerEvents = 'auto';
      tooltip.style.display = 'block';
      outline.style.background = 'oklch(60% 0.25 350 / 0.08)';
    });
    outline.addEventListener('mouseleave', () => {
      outline.style.pointerEvents = 'none';
      tooltip.style.display = 'none';
      outline.style.background = 'none';
    });

    document.body.appendChild(outline);
    overlays.push(outline);
  }

  // -----------------------------------------------------------------------
  // Console summary
  // -----------------------------------------------------------------------

  function printSummary(allFindings, mode) {
    if (allFindings.length === 0) {
      console.log('%c[impeccable] No anti-patterns found.', 'color: #22c55e; font-weight: bold');
      return;
    }
    console.group(
      `%c[impeccable] ${allFindings.length} anti-pattern${allFindings.length === 1 ? '' : 's'} found (${mode} mode)`,
      'color: oklch(60% 0.25 350); font-weight: bold'
    );
    for (const { el, findings } of allFindings) {
      for (const f of findings) {
        console.log(`%c${f.type}%c ${f.detail}`, 'color: oklch(55% 0.25 350); font-weight: bold', 'color: inherit', el);
      }
    }
    console.groupEnd();
  }

  // -----------------------------------------------------------------------
  // Main scan
  // -----------------------------------------------------------------------

  function scan(opts = {}) {
    const mode = opts.mode || defaultMode;
    const scanner = mode === 'computed' ? scanElementComputed : scanElementStatic;

    // Remove previous overlays
    for (const o of overlays) o.remove();
    overlays.length = 0;

    // In static mode, pre-scan <style> blocks to find CSS-rule-based findings
    const styleBlockFindings = (mode === 'static') ? scanStyleBlocks() : new Map();

    const allFindings = [];
    const elements = document.querySelectorAll('*');

    for (const el of elements) {
      if (el.classList.contains('impeccable-overlay') ||
          el.classList.contains('impeccable-label') ||
          el.classList.contains('impeccable-tooltip')) continue;

      // Merge per-element findings with style-block findings
      const findings = scanner(el);
      const fromStyles = styleBlockFindings.get(el);
      if (fromStyles) findings.push(...fromStyles);

      if (findings.length > 0) {
        highlight(el, findings);
        allFindings.push({ el, findings });
      }
    }

    printSummary(allFindings, mode);
    return allFindings;
  }

  // Run after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(scan, 100));
  } else {
    setTimeout(scan, 100);
  }

  // Expose for manual re-scan (supports mode override)
  window.impeccableScan = scan;
})();
