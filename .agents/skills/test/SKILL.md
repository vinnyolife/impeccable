# Skill: Test

Generate and run tests for JavaScript/CSS animation and UI code.

## Purpose

Helps write unit tests, integration tests, and visual regression tests for impeccable components, animations, and utilities.

## Usage

```
skill: test
target: <file or module to test>
type: unit | integration | visual
framework: jest | vitest | playwright
```

## Behavior

1. Analyze the target file to understand exports, functions, and side effects
2. Identify testable units (pure functions, class methods, DOM interactions)
3. Generate test cases covering:
   - Happy path
   - Edge cases (empty input, null, zero duration)
   - Error conditions
4. For animation code, mock `requestAnimationFrame` and timing APIs
5. For DOM-dependent code, use jsdom or happy-dom environment

## Test Patterns

### Animation Timing
```js
beforeEach(() => {
  jest.useFakeTimers();
  global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
});

afterEach(() => {
  jest.useRealTimers();
});
```

### Keyframe Validation
```js
test('mergeKeyframes combines offset ranges', () => {
  const a = [{ offset: 0, opacity: 0 }, { offset: 1, opacity: 1 }];
  const b = [{ offset: 0, transform: 'scale(0)' }, { offset: 1, transform: 'scale(1)' }];
  const result = mergeKeyframes(a, b);
  expect(result[0]).toMatchObject({ offset: 0, opacity: 0, transform: 'scale(0)' });
});
```

### CSS Property Assertions
```js
test('colorize applies valid hex color', () => {
  const el = document.createElement('div');
  colorize(el, '#ff6b6b');
  expect(el.style.color).toBe('rgb(255, 107, 107)');
});
```

## Configuration

```js
// configure test environment
function configure(options = {}) {
  return {
    environment: options.environment ?? 'jsdom',
    timeout: options.timeout ?? 5000,
    coverage: options.coverage ?? false,
    coverageThreshold: options.coverageThreshold ?? 80,
  };
}
```

## Output Format

Generated test files should:
- Mirror source file path under `__tests__/` or `.test.js` suffix
- Import only what is needed
- Use `describe` blocks grouped by function name
- Include a comment block at top referencing the source file

## Constraints

- Do not test implementation details, test behavior
- Avoid snapshot tests for dynamic animation values
- Keep each test focused on a single assertion where possible
- Mock external dependencies (fetch, localStorage, Web Animations API)
