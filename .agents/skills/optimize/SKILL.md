# Optimize Skill

Reduces file size, improves performance, and removes redundancy in CSS animations and keyframes.

## Usage

```
optimize [target] [--level=1|2|3]
```

## What it does

- Merges duplicate keyframe definitions
- Removes vendor prefixes where no longer needed
- Collapses redundant `from`/`to` keyframes when they match element defaults
- Shortens animation shorthand properties
- Deduplicates identical animation curves
- Strips `0%` keyframes that only restate initial values

## Levels

| Level | Description |
|-------|-------------|
| 1 | Safe: remove exact duplicates and whitespace |
| 2 | Moderate: collapse redundant keyframes, merge curves |
| 3 | Aggressive: rewrite animations using minimal syntax |

## Examples

### Before

```css
@keyframes fadeIn {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.element {
  -webkit-animation: fadeIn 0.3s ease;
  -moz-animation: fadeIn 0.3s ease;
  animation: fadeIn 0.3s ease;
}
```

### After (level 2)

```css
@keyframes fadeIn {
  from { opacity: 0; }
}

.element {
  animation: fadeIn 0.3s ease;
}
```

## Functions

### `deduplicateKeyframes(cssAST)`

Walks the CSS AST and removes duplicate `@keyframes` blocks, keeping the last definition.

```js
deduplicateKeyframes(ast)
// returns: cleaned AST with unique keyframe names
```

### `stripRedundantStops(keyframe)`

Removes keyframe stops where all properties match the element's CSS initial values or the adjacent stop is identical.

```js
stripRedundantStops(keyframe)
// returns: keyframe with minimal stops
```

### `removeVendorPrefixes(cssAST, targetBrowsers)`

Drops `-webkit-`, `-moz-`, `-ms-` prefixed animation properties based on target browser support matrix.

```js
removeVendorPrefixes(ast, ['last 2 versions'])
// returns: AST without unnecessary prefixes
```

### `collapseAnimationShorthand(declarations)`

Converts verbose animation properties into a single `animation` shorthand.

```js
collapseAnimationShorthand([
  'animation-name: slideIn',
  'animation-duration: 0.4s',
  'animation-timing-function: ease-out'
])
// returns: 'animation: slideIn 0.4s ease-out'
```

## Notes

- Level 3 optimization may change visual output in edge cases involving `animation-fill-mode`
- Always run `audit` after `optimize --level=3` to verify no regressions
- Works best after running `refactor` to normalize property order first
