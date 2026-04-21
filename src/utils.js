/**
 * Utility functions for impeccable animation library
 */

/**
 * Checks if a value is a plain object
 * @param {*} val
 * @returns {boolean}
 */
export function isPlainObject(val) {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}

/**
 * Deep merges two objects, with source values taking priority
 * @param {Object} target
 * @param {Object} source
 * @returns {Object}
 */
export function deepMerge(target, source) {
  const result = Object.assign({}, target);
  for (const key of Object.keys(source)) {
    if (isPlainObject(source[key]) && isPlainObject(target[key])) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

/**
 * Normalizes a CSS property name to camelCase
 * @param {string} prop - e.g. 'background-color'
 * @returns {string} - e.g. 'backgroundColor'
 */
export function toCamelCase(prop) {
  return prop.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}

/**
 * Normalizes a camelCase property to kebab-case
 * @param {string} prop - e.g. 'backgroundColor'
 * @returns {string} - e.g. 'background-color'
 */
export function toKebabCase(prop) {
  return prop.replace(/([A-Z])/g, (char) => `-${char.toLowerCase()}`);
}

/**
 * Clamps a number between min and max
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Linear interpolation between two values
 * @param {number} a - start value
 * @param {number} b - end value
 * @param {number} t - progress (0 to 1)
 * @returns {number}
 */
export function lerp(a, b, t) {
  return a + (b - a) * clamp(t, 0, 1);
}

/**
 * Parses a CSS value string into its numeric value and unit
 * @param {string} val - e.g. '100px', '50%', '1.5rem'
 * @returns {{ value: number, unit: string }}
 */
export function parseCSSValue(val) {
  if (typeof val === 'number') return { value: val, unit: '' };
  const match = String(val).match(/^(-?[\d.]+)([a-z%]*)$/i);
  if (!match) return { value: 0, unit: '' };
  return { value: parseFloat(match[1]), unit: match[2] || '' };
}

/**
 * Converts a NodeList or HTMLCollection to a plain Array
 * @param {NodeList|HTMLCollection|Array} list
 * @returns {Array}
 */
export function toArray(list) {
  return Array.from(list);
}

/**
 * Resolves an element selector to an array of DOM elements
 * @param {string|Element|NodeList|Array} target
 * @returns {Element[]}
 */
export function resolveElements(target) {
  if (typeof target === 'string') {
    return toArray(document.querySelectorAll(target));
  }
  if (target instanceof Element) {
    return [target];
  }
  if (target instanceof NodeList || target instanceof HTMLCollection) {
    return toArray(target);
  }
  if (Array.isArray(target)) {
    return target.filter((el) => el instanceof Element);
  }
  return [];
}

/**
 * Returns a promise that resolves after a given number of milliseconds
 * @param {number} ms - delay in milliseconds (defaults to 0 for next tick)
 * @returns {Promise<void>}
 */
export function delay(ms = 0) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
