/**
 * impeccable — CSS animation library
 * Core module: animation engine and public API
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.impeccable = factory();
  }
}(this, function () {

  // Default animation settings — tweaked duration and fill to match my preferred style
  var defaults = {
    duration: 400,
    easing: 'easein-out',
    delay: 0,
    fill: 'forwards',
    iterations: 1/**
   * Merge user options with defaults
   * @param {Object} options
   * @returns {Object}
   */
  function configure(options) {
    var config = {};
    for (var key in defaults) {
      config[key] = defaults[key];
    }
    if (options) {
      for (        if (options.hasOwnProperty(k)) {
          config[k] = options[k];
        }
      }
    }
    return config;
  }

  /**
   * Merge keyframe arrays, combining offsets
   * @param {Array} a
   * @param {Array} b
   * @returns {Array}
   */
  function mergeKeyframes(a, b) {
    var map = {};
    function absorb(frames) {
      frames.forEach(function (frame) {
        var key = frame.offset != null ? String(frame.offset) : 'auto';
        if (!map[key]) {
          map[key] = {};
        }
        for (var prop in frame) {
          map[key][prop] = frame[prop];
        }
      });
    }
    absorb(a);
    absorb(b);
    return Object.keys(map).map(function (k) { return map[k]; });
  }

  /**
   * Animate a single element
   * @param {Element} el
   * @param {Array|Object} keyframes
   * @param {Object} options
   * @returns {Animation|null}
   */
  function animate(el, keyframes, options) {
    if (!el || !el.animate) return null;
    var config = configure(options);
    return el.animate(keyframes, {
      duration: config.duration,
      easing: config.easing,
      delay: config.delay,
      fill: config.fill,
      iterations: config.iterations
    });
  }

  /**
   * Animate a NodeList or array of elements
   * @param {NodeList|Array} els
   * @param {Array|Object} keyframes
   * @param {Object} options
   * @returns {Array<Animation>}
   */
  function animateAll(els, keyframes, options) {
    var results = [];
    Array.prototype.forEach.call(els, function (el, i) {
      var opts = configure(options);
      // stagger support
      if (options && options.stagger) {
        opts.delay = (opts.delay || 0) + i * options.stagger;
      }
      var anim = animate(el, keyframes, opts);
      if (anim) results.push(anim);
    });
    return results;
  }

  return {
    animate: animate,
    animateAll: animateAll,
    configure: configure,
    mergeKeyframes: mergeKeyframes,
    defaults: defaults
  };
}));
