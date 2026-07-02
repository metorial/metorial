import './sourcemap-register.cjs';
import { createRequire as r } from 'module';
var u = {
  9802: (r, u, m) => {
    u.formatArgs = formatArgs;
    u.save = save;
    u.load = load;
    u.useColors = useColors;
    u.storage = localstorage();
    u.destroy = (() => {
      let r = false;
      return () => {
        if (!r) {
          r = true;
          console.warn(
            'Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.'
          );
        }
      };
    })();
    u.colors = [
      '#0000CC',
      '#0000FF',
      '#0033CC',
      '#0033FF',
      '#0066CC',
      '#0066FF',
      '#0099CC',
      '#0099FF',
      '#00CC00',
      '#00CC33',
      '#00CC66',
      '#00CC99',
      '#00CCCC',
      '#00CCFF',
      '#3300CC',
      '#3300FF',
      '#3333CC',
      '#3333FF',
      '#3366CC',
      '#3366FF',
      '#3399CC',
      '#3399FF',
      '#33CC00',
      '#33CC33',
      '#33CC66',
      '#33CC99',
      '#33CCCC',
      '#33CCFF',
      '#6600CC',
      '#6600FF',
      '#6633CC',
      '#6633FF',
      '#66CC00',
      '#66CC33',
      '#9900CC',
      '#9900FF',
      '#9933CC',
      '#9933FF',
      '#99CC00',
      '#99CC33',
      '#CC0000',
      '#CC0033',
      '#CC0066',
      '#CC0099',
      '#CC00CC',
      '#CC00FF',
      '#CC3300',
      '#CC3333',
      '#CC3366',
      '#CC3399',
      '#CC33CC',
      '#CC33FF',
      '#CC6600',
      '#CC6633',
      '#CC9900',
      '#CC9933',
      '#CCCC00',
      '#CCCC33',
      '#FF0000',
      '#FF0033',
      '#FF0066',
      '#FF0099',
      '#FF00CC',
      '#FF00FF',
      '#FF3300',
      '#FF3333',
      '#FF3366',
      '#FF3399',
      '#FF33CC',
      '#FF33FF',
      '#FF6600',
      '#FF6633',
      '#FF9900',
      '#FF9933',
      '#FFCC00',
      '#FFCC33'
    ];
    function useColors() {
      if (
        typeof window !== 'undefined' &&
        window.process &&
        (window.process.type === 'renderer' || window.process.__nwjs)
      ) {
        return true;
      }
      if (
        typeof navigator !== 'undefined' &&
        navigator.userAgent &&
        navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)
      ) {
        return false;
      }
      let r;
      return (
        (typeof document !== 'undefined' &&
          document.documentElement &&
          document.documentElement.style &&
          document.documentElement.style.WebkitAppearance) ||
        (typeof window !== 'undefined' &&
          window.console &&
          (window.console.firebug || (window.console.exception && window.console.table))) ||
        (typeof navigator !== 'undefined' &&
          navigator.userAgent &&
          (r = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) &&
          parseInt(r[1], 10) >= 31) ||
        (typeof navigator !== 'undefined' &&
          navigator.userAgent &&
          navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/))
      );
    }
    function formatArgs(u) {
      u[0] =
        (this.useColors ? '%c' : '') +
        this.namespace +
        (this.useColors ? ' %c' : ' ') +
        u[0] +
        (this.useColors ? '%c ' : ' ') +
        '+' +
        r.exports.humanize(this.diff);
      if (!this.useColors) {
        return;
      }
      const m = 'color: ' + this.color;
      u.splice(1, 0, m, 'color: inherit');
      let v = 0;
      let b = 0;
      u[0].replace(/%[a-zA-Z%]/g, r => {
        if (r === '%%') {
          return;
        }
        v++;
        if (r === '%c') {
          b = v;
        }
      });
      u.splice(b, 0, m);
    }
    u.log = console.debug || console.log || (() => {});
    function save(r) {
      try {
        if (r) {
          u.storage.setItem('debug', r);
        } else {
          u.storage.removeItem('debug');
        }
      } catch (r) {}
    }
    function load() {
      let r;
      try {
        r = u.storage.getItem('debug') || u.storage.getItem('DEBUG');
      } catch (r) {}
      if (!r && typeof process !== 'undefined' && 'env' in process) {
        r = process.env.DEBUG;
      }
      return r;
    }
    function localstorage() {
      try {
        return localStorage;
      } catch (r) {}
    }
    r.exports = m(4213)(u);
    const { formatters: v } = r.exports;
    v.j = function (r) {
      try {
        return JSON.stringify(r);
      } catch (r) {
        return '[UnexpectedJSONParseError]: ' + r.message;
      }
    };
  },
  4213: (r, u, m) => {
    function setup(r) {
      createDebug.debug = createDebug;
      createDebug.default = createDebug;
      createDebug.coerce = coerce;
      createDebug.disable = disable;
      createDebug.enable = enable;
      createDebug.enabled = enabled;
      createDebug.humanize = m(5900);
      createDebug.destroy = destroy;
      Object.keys(r).forEach(u => {
        createDebug[u] = r[u];
      });
      createDebug.names = [];
      createDebug.skips = [];
      createDebug.formatters = {};
      function selectColor(r) {
        let u = 0;
        for (let m = 0; m < r.length; m++) {
          u = (u << 5) - u + r.charCodeAt(m);
          u |= 0;
        }
        return createDebug.colors[Math.abs(u) % createDebug.colors.length];
      }
      createDebug.selectColor = selectColor;
      function createDebug(r) {
        let u;
        let m = null;
        let v;
        let b;
        function debug(...r) {
          if (!debug.enabled) {
            return;
          }
          const m = debug;
          const v = Number(new Date());
          const b = v - (u || v);
          m.diff = b;
          m.prev = u;
          m.curr = v;
          u = v;
          r[0] = createDebug.coerce(r[0]);
          if (typeof r[0] !== 'string') {
            r.unshift('%O');
          }
          let x = 0;
          r[0] = r[0].replace(/%([a-zA-Z%])/g, (u, v) => {
            if (u === '%%') {
              return '%';
            }
            x++;
            const b = createDebug.formatters[v];
            if (typeof b === 'function') {
              const v = r[x];
              u = b.call(m, v);
              r.splice(x, 1);
              x--;
            }
            return u;
          });
          createDebug.formatArgs.call(m, r);
          const w = m.log || createDebug.log;
          w.apply(m, r);
        }
        debug.namespace = r;
        debug.useColors = createDebug.useColors();
        debug.color = createDebug.selectColor(r);
        debug.extend = extend;
        debug.destroy = createDebug.destroy;
        Object.defineProperty(debug, 'enabled', {
          enumerable: true,
          configurable: false,
          get: () => {
            if (m !== null) {
              return m;
            }
            if (v !== createDebug.namespaces) {
              v = createDebug.namespaces;
              b = createDebug.enabled(r);
            }
            return b;
          },
          set: r => {
            m = r;
          }
        });
        if (typeof createDebug.init === 'function') {
          createDebug.init(debug);
        }
        return debug;
      }
      function extend(r, u) {
        const m = createDebug(this.namespace + (typeof u === 'undefined' ? ':' : u) + r);
        m.log = this.log;
        return m;
      }
      function enable(r) {
        createDebug.save(r);
        createDebug.namespaces = r;
        createDebug.names = [];
        createDebug.skips = [];
        const u = (typeof r === 'string' ? r : '')
          .trim()
          .replace(/\s+/g, ',')
          .split(',')
          .filter(Boolean);
        for (const r of u) {
          if (r[0] === '-') {
            createDebug.skips.push(r.slice(1));
          } else {
            createDebug.names.push(r);
          }
        }
      }
      function matchesTemplate(r, u) {
        let m = 0;
        let v = 0;
        let b = -1;
        let x = 0;
        while (m < r.length) {
          if (v < u.length && (u[v] === r[m] || u[v] === '*')) {
            if (u[v] === '*') {
              b = v;
              x = m;
              v++;
            } else {
              m++;
              v++;
            }
          } else if (b !== -1) {
            v = b + 1;
            x++;
            m = x;
          } else {
            return false;
          }
        }
        while (v < u.length && u[v] === '*') {
          v++;
        }
        return v === u.length;
      }
      function disable() {
        const r = [...createDebug.names, ...createDebug.skips.map(r => '-' + r)].join(',');
        createDebug.enable('');
        return r;
      }
      function enabled(r) {
        for (const u of createDebug.skips) {
          if (matchesTemplate(r, u)) {
            return false;
          }
        }
        for (const u of createDebug.names) {
          if (matchesTemplate(r, u)) {
            return true;
          }
        }
        return false;
      }
      function coerce(r) {
        if (r instanceof Error) {
          return r.stack || r.message;
        }
        return r;
      }
      function destroy() {
        console.warn(
          'Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.'
        );
      }
      createDebug.enable(createDebug.load());
      return createDebug;
    }
    r.exports = setup;
  },
  7674: (r, u, m) => {
    if (
      typeof process === 'undefined' ||
      process.type === 'renderer' ||
      process.browser === true ||
      process.__nwjs
    ) {
      r.exports = m(9802);
    } else {
      r.exports = m(5040);
    }
  },
  5040: (r, u, m) => {
    const v = m(2018);
    const b = m(9023);
    u.init = init;
    u.log = log;
    u.formatArgs = formatArgs;
    u.save = save;
    u.load = load;
    u.useColors = useColors;
    u.destroy = b.deprecate(
      () => {},
      'Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.'
    );
    u.colors = [6, 2, 3, 4, 5, 1];
    try {
      const r = m(3662);
      if (r && (r.stderr || r).level >= 2) {
        u.colors = [
          20, 21, 26, 27, 32, 33, 38, 39, 40, 41, 42, 43, 44, 45, 56, 57, 62, 63, 68, 69, 74,
          75, 76, 77, 78, 79, 80, 81, 92, 93, 98, 99, 112, 113, 128, 129, 134, 135, 148, 149,
          160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 178, 179, 184,
          185, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 214, 215,
          220, 221
        ];
      }
    } catch (r) {}
    u.inspectOpts = Object.keys(process.env)
      .filter(r => /^debug_/i.test(r))
      .reduce((r, u) => {
        const m = u
          .substring(6)
          .toLowerCase()
          .replace(/_([a-z])/g, (r, u) => u.toUpperCase());
        let v = process.env[u];
        if (/^(yes|on|true|enabled)$/i.test(v)) {
          v = true;
        } else if (/^(no|off|false|disabled)$/i.test(v)) {
          v = false;
        } else if (v === 'null') {
          v = null;
        } else {
          v = Number(v);
        }
        r[m] = v;
        return r;
      }, {});
    function useColors() {
      return 'colors' in u.inspectOpts
        ? Boolean(u.inspectOpts.colors)
        : v.isatty(process.stderr.fd);
    }
    function formatArgs(u) {
      const { namespace: m, useColors: v } = this;
      if (v) {
        const v = this.color;
        const b = '[3' + (v < 8 ? v : '8;5;' + v);
        const x = `  ${b};1m${m} [0m`;
        u[0] = x + u[0].split('\n').join('\n' + x);
        u.push(b + 'm+' + r.exports.humanize(this.diff) + '[0m');
      } else {
        u[0] = getDate() + m + ' ' + u[0];
      }
    }
    function getDate() {
      if (u.inspectOpts.hideDate) {
        return '';
      }
      return new Date().toISOString() + ' ';
    }
    function log(...r) {
      return process.stderr.write(b.formatWithOptions(u.inspectOpts, ...r) + '\n');
    }
    function save(r) {
      if (r) {
        process.env.DEBUG = r;
      } else {
        delete process.env.DEBUG;
      }
    }
    function load() {
      return process.env.DEBUG;
    }
    function init(r) {
      r.inspectOpts = {};
      const m = Object.keys(u.inspectOpts);
      for (let v = 0; v < m.length; v++) {
        r.inspectOpts[m[v]] = u.inspectOpts[m[v]];
      }
    }
    r.exports = m(4213)(u);
    const { formatters: x } = r.exports;
    x.o = function (r) {
      this.inspectOpts.colors = this.useColors;
      return b
        .inspect(r, this.inspectOpts)
        .split('\n')
        .map(r => r.trim())
        .join(' ');
    };
    x.O = function (r) {
      this.inspectOpts.colors = this.useColors;
      return b.inspect(r, this.inspectOpts);
    };
  },
  5900: r => {
    var u = 1e3;
    var m = u * 60;
    var v = m * 60;
    var b = v * 24;
    var x = b * 7;
    var w = b * 365.25;
    r.exports = function (r, u) {
      u = u || {};
      var m = typeof r;
      if (m === 'string' && r.length > 0) {
        return parse(r);
      } else if (m === 'number' && isFinite(r)) {
        return u.long ? fmtLong(r) : fmtShort(r);
      }
      throw new Error(
        'val is not a non-empty string or a valid number. val=' + JSON.stringify(r)
      );
    };
    function parse(r) {
      r = String(r);
      if (r.length > 100) {
        return;
      }
      var $ =
        /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
          r
        );
      if (!$) {
        return;
      }
      var k = parseFloat($[1]);
      var S = ($[2] || 'ms').toLowerCase();
      switch (S) {
        case 'years':
        case 'year':
        case 'yrs':
        case 'yr':
        case 'y':
          return k * w;
        case 'weeks':
        case 'week':
        case 'w':
          return k * x;
        case 'days':
        case 'day':
        case 'd':
          return k * b;
        case 'hours':
        case 'hour':
        case 'hrs':
        case 'hr':
        case 'h':
          return k * v;
        case 'minutes':
        case 'minute':
        case 'mins':
        case 'min':
        case 'm':
          return k * m;
        case 'seconds':
        case 'second':
        case 'secs':
        case 'sec':
        case 's':
          return k * u;
        case 'milliseconds':
        case 'millisecond':
        case 'msecs':
        case 'msec':
        case 'ms':
          return k;
        default:
          return undefined;
      }
    }
    function fmtShort(r) {
      var x = Math.abs(r);
      if (x >= b) {
        return Math.round(r / b) + 'd';
      }
      if (x >= v) {
        return Math.round(r / v) + 'h';
      }
      if (x >= m) {
        return Math.round(r / m) + 'm';
      }
      if (x >= u) {
        return Math.round(r / u) + 's';
      }
      return r + 'ms';
    }
    function fmtLong(r) {
      var x = Math.abs(r);
      if (x >= b) {
        return plural(r, x, b, 'day');
      }
      if (x >= v) {
        return plural(r, x, v, 'hour');
      }
      if (x >= m) {
        return plural(r, x, m, 'minute');
      }
      if (x >= u) {
        return plural(r, x, u, 'second');
      }
      return r + ' ms';
    }
    function plural(r, u, m, v) {
      var b = u >= m * 1.5;
      return Math.round(r / m) + ' ' + v + (b ? 's' : '');
    }
  },
  3662: r => {
    var u = process.argv;
    var m = u.indexOf('--');
    var hasFlag = function (r) {
      r = '--' + r;
      var v = u.indexOf(r);
      return v !== -1 && (m !== -1 ? v < m : true);
    };
    r.exports = (function () {
      if ('FORCE_COLOR' in process.env) {
        return true;
      }
      if (hasFlag('no-color') || hasFlag('no-colors') || hasFlag('color=false')) {
        return false;
      }
      if (
        hasFlag('color') ||
        hasFlag('colors') ||
        hasFlag('color=true') ||
        hasFlag('color=always')
      ) {
        return true;
      }
      if (process.stdout && !process.stdout.isTTY) {
        return false;
      }
      if (process.platform === 'win32') {
        return true;
      }
      if ('COLORTERM' in process.env) {
        return true;
      }
      if (process.env.TERM === 'dumb') {
        return false;
      }
      if (/^screen|^xterm|^vt100|color|ansi|cygwin|linux/i.test(process.env.TERM)) {
        return true;
      }
      return false;
    })();
  },
  3191: (r, u, m) => {
    r.exports = { parallel: m(1072), serial: m(2959), serialOrdered: m(1298) };
  },
  9737: r => {
    r.exports = abort;
    function abort(r) {
      Object.keys(r.jobs).forEach(clean.bind(r));
      r.jobs = {};
    }
    function clean(r) {
      if (typeof this.jobs[r] == 'function') {
        this.jobs[r]();
      }
    }
  },
  4911: (r, u, m) => {
    var v = m(6167);
    r.exports = async;
    function async(r) {
      var u = false;
      v(function () {
        u = true;
      });
      return function async_callback(m, b) {
        if (u) {
          r(m, b);
        } else {
          v(function nextTick_callback() {
            r(m, b);
          });
        }
      };
    }
  },
  6167: r => {
    r.exports = defer;
    function defer(r) {
      var u =
        typeof setImmediate == 'function'
          ? setImmediate
          : typeof process == 'object' && typeof process.nextTick == 'function'
            ? process.nextTick
            : null;
      if (u) {
        u(r);
      } else {
        setTimeout(r, 0);
      }
    }
  },
  7281: (r, u, m) => {
    var v = m(4911),
      b = m(9737);
    r.exports = iterate;
    function iterate(r, u, m, v) {
      var x = m['keyedList'] ? m['keyedList'][m.index] : m.index;
      m.jobs[x] = runJob(u, x, r[x], function (r, u) {
        if (!(x in m.jobs)) {
          return;
        }
        delete m.jobs[x];
        if (r) {
          b(m);
        } else {
          m.results[x] = u;
        }
        v(r, m.results);
      });
    }
    function runJob(r, u, m, b) {
      var x;
      if (r.length == 2) {
        x = r(m, v(b));
      } else {
        x = r(m, u, v(b));
      }
      return x;
    }
  },
  2554: r => {
    r.exports = state;
    function state(r, u) {
      var m = !Array.isArray(r),
        v = {
          index: 0,
          keyedList: m || u ? Object.keys(r) : null,
          jobs: {},
          results: m ? {} : [],
          size: m ? Object.keys(r).length : r.length
        };
      if (u) {
        v.keyedList.sort(
          m
            ? u
            : function (m, v) {
                return u(r[m], r[v]);
              }
        );
      }
      return v;
    }
  },
  6530: (r, u, m) => {
    var v = m(9737),
      b = m(4911);
    r.exports = terminator;
    function terminator(r) {
      if (!Object.keys(this.jobs).length) {
        return;
      }
      this.index = this.size;
      v(this);
      b(r)(null, this.results);
    }
  },
  1072: (r, u, m) => {
    var v = m(7281),
      b = m(2554),
      x = m(6530);
    r.exports = parallel;
    function parallel(r, u, m) {
      var w = b(r);
      while (w.index < (w['keyedList'] || r).length) {
        v(r, u, w, function (r, u) {
          if (r) {
            m(r, u);
            return;
          }
          if (Object.keys(w.jobs).length === 0) {
            m(null, w.results);
            return;
          }
        });
        w.index++;
      }
      return x.bind(w, m);
    }
  },
  2959: (r, u, m) => {
    var v = m(1298);
    r.exports = serial;
    function serial(r, u, m) {
      return v(r, u, null, m);
    }
  },
  1298: (r, u, m) => {
    var v = m(7281),
      b = m(2554),
      x = m(6530);
    r.exports = serialOrdered;
    r.exports.ascending = ascending;
    r.exports.descending = descending;
    function serialOrdered(r, u, m, w) {
      var $ = b(r, m);
      v(r, u, $, function iteratorHandler(m, b) {
        if (m) {
          w(m, b);
          return;
        }
        $.index++;
        if ($.index < ($['keyedList'] || r).length) {
          v(r, u, $, iteratorHandler);
          return;
        }
        w(null, $.results);
      });
      return x.bind($, w);
    }
    function ascending(r, u) {
      return r < u ? -1 : r > u ? 1 : 0;
    }
    function descending(r, u) {
      return -1 * ascending(r, u);
    }
  },
  8598: (r, u, m) => {
    var v = m(8637);
    var b = m(6310);
    var x = m(9986);
    var w = m(7337);
    r.exports = w || v.call(x, b);
  },
  6310: r => {
    r.exports = Function.prototype.apply;
  },
  9986: r => {
    r.exports = Function.prototype.call;
  },
  8452: (r, u, m) => {
    var v = m(8637);
    var b = m(6381);
    var x = m(9986);
    var w = m(8598);
    r.exports = function callBindBasic(r) {
      if (r.length < 1 || typeof r[0] !== 'function') {
        throw new b('a function is required');
      }
      return w(v, x, r);
    };
  },
  7337: r => {
    r.exports = typeof Reflect !== 'undefined' && Reflect && Reflect.apply;
  },
  7867: (r, u, m) => {
    var v = m(9023);
    var b = m(2203).Stream;
    var x = m(2879);
    r.exports = CombinedStream;
    function CombinedStream() {
      this.writable = false;
      this.readable = true;
      this.dataSize = 0;
      this.maxDataSize = 2 * 1024 * 1024;
      this.pauseStreams = true;
      this._released = false;
      this._streams = [];
      this._currentStream = null;
      this._insideLoop = false;
      this._pendingNext = false;
    }
    v.inherits(CombinedStream, b);
    CombinedStream.create = function (r) {
      var u = new this();
      r = r || {};
      for (var m in r) {
        u[m] = r[m];
      }
      return u;
    };
    CombinedStream.isStreamLike = function (r) {
      return (
        typeof r !== 'function' &&
        typeof r !== 'string' &&
        typeof r !== 'boolean' &&
        typeof r !== 'number' &&
        !Buffer.isBuffer(r)
      );
    };
    CombinedStream.prototype.append = function (r) {
      var u = CombinedStream.isStreamLike(r);
      if (u) {
        if (!(r instanceof x)) {
          var m = x.create(r, { maxDataSize: Infinity, pauseStream: this.pauseStreams });
          r.on('data', this._checkDataSize.bind(this));
          r = m;
        }
        this._handleErrors(r);
        if (this.pauseStreams) {
          r.pause();
        }
      }
      this._streams.push(r);
      return this;
    };
    CombinedStream.prototype.pipe = function (r, u) {
      b.prototype.pipe.call(this, r, u);
      this.resume();
      return r;
    };
    CombinedStream.prototype._getNext = function () {
      this._currentStream = null;
      if (this._insideLoop) {
        this._pendingNext = true;
        return;
      }
      this._insideLoop = true;
      try {
        do {
          this._pendingNext = false;
          this._realGetNext();
        } while (this._pendingNext);
      } finally {
        this._insideLoop = false;
      }
    };
    CombinedStream.prototype._realGetNext = function () {
      var r = this._streams.shift();
      if (typeof r == 'undefined') {
        this.end();
        return;
      }
      if (typeof r !== 'function') {
        this._pipeNext(r);
        return;
      }
      var u = r;
      u(
        function (r) {
          var u = CombinedStream.isStreamLike(r);
          if (u) {
            r.on('data', this._checkDataSize.bind(this));
            this._handleErrors(r);
          }
          this._pipeNext(r);
        }.bind(this)
      );
    };
    CombinedStream.prototype._pipeNext = function (r) {
      this._currentStream = r;
      var u = CombinedStream.isStreamLike(r);
      if (u) {
        r.on('end', this._getNext.bind(this));
        r.pipe(this, { end: false });
        return;
      }
      var m = r;
      this.write(m);
      this._getNext();
    };
    CombinedStream.prototype._handleErrors = function (r) {
      var u = this;
      r.on('error', function (r) {
        u._emitError(r);
      });
    };
    CombinedStream.prototype.write = function (r) {
      this.emit('data', r);
    };
    CombinedStream.prototype.pause = function () {
      if (!this.pauseStreams) {
        return;
      }
      if (
        this.pauseStreams &&
        this._currentStream &&
        typeof this._currentStream.pause == 'function'
      )
        this._currentStream.pause();
      this.emit('pause');
    };
    CombinedStream.prototype.resume = function () {
      if (!this._released) {
        this._released = true;
        this.writable = true;
        this._getNext();
      }
      if (
        this.pauseStreams &&
        this._currentStream &&
        typeof this._currentStream.resume == 'function'
      )
        this._currentStream.resume();
      this.emit('resume');
    };
    CombinedStream.prototype.end = function () {
      this._reset();
      this.emit('end');
    };
    CombinedStream.prototype.destroy = function () {
      this._reset();
      this.emit('close');
    };
    CombinedStream.prototype._reset = function () {
      this.writable = false;
      this._streams = [];
      this._currentStream = null;
    };
    CombinedStream.prototype._checkDataSize = function () {
      this._updateDataSize();
      if (this.dataSize <= this.maxDataSize) {
        return;
      }
      var r = 'DelayedStream#maxDataSize of ' + this.maxDataSize + ' bytes exceeded.';
      this._emitError(new Error(r));
    };
    CombinedStream.prototype._updateDataSize = function () {
      this.dataSize = 0;
      var r = this;
      this._streams.forEach(function (u) {
        if (!u.dataSize) {
          return;
        }
        r.dataSize += u.dataSize;
      });
      if (this._currentStream && this._currentStream.dataSize) {
        this.dataSize += this._currentStream.dataSize;
      }
    };
    CombinedStream.prototype._emitError = function (r) {
      this._reset();
      this.emit('error', r);
    };
  },
  2879: (r, u, m) => {
    var v = m(2203).Stream;
    var b = m(9023);
    r.exports = DelayedStream;
    function DelayedStream() {
      this.source = null;
      this.dataSize = 0;
      this.maxDataSize = 1024 * 1024;
      this.pauseStream = true;
      this._maxDataSizeExceeded = false;
      this._released = false;
      this._bufferedEvents = [];
    }
    b.inherits(DelayedStream, v);
    DelayedStream.create = function (r, u) {
      var m = new this();
      u = u || {};
      for (var v in u) {
        m[v] = u[v];
      }
      m.source = r;
      var b = r.emit;
      r.emit = function () {
        m._handleEmit(arguments);
        return b.apply(r, arguments);
      };
      r.on('error', function () {});
      if (m.pauseStream) {
        r.pause();
      }
      return m;
    };
    Object.defineProperty(DelayedStream.prototype, 'readable', {
      configurable: true,
      enumerable: true,
      get: function () {
        return this.source.readable;
      }
    });
    DelayedStream.prototype.setEncoding = function () {
      return this.source.setEncoding.apply(this.source, arguments);
    };
    DelayedStream.prototype.resume = function () {
      if (!this._released) {
        this.release();
      }
      this.source.resume();
    };
    DelayedStream.prototype.pause = function () {
      this.source.pause();
    };
    DelayedStream.prototype.release = function () {
      this._released = true;
      this._bufferedEvents.forEach(
        function (r) {
          this.emit.apply(this, r);
        }.bind(this)
      );
      this._bufferedEvents = [];
    };
    DelayedStream.prototype.pipe = function () {
      var r = v.prototype.pipe.apply(this, arguments);
      this.resume();
      return r;
    };
    DelayedStream.prototype._handleEmit = function (r) {
      if (this._released) {
        this.emit.apply(this, r);
        return;
      }
      if (r[0] === 'data') {
        this.dataSize += r[1].length;
        this._checkIfMaxDataSizeExceeded();
      }
      this._bufferedEvents.push(r);
    };
    DelayedStream.prototype._checkIfMaxDataSizeExceeded = function () {
      if (this._maxDataSizeExceeded) {
        return;
      }
      if (this.dataSize <= this.maxDataSize) {
        return;
      }
      this._maxDataSizeExceeded = true;
      var r = 'DelayedStream#maxDataSize of ' + this.maxDataSize + ' bytes exceeded.';
      this.emit('error', new Error(r));
    };
  },
  2578: (r, u, m) => {
    var v = m(8452);
    var b = m(6729);
    var x;
    try {
      x = [].__proto__ === Array.prototype;
    } catch (r) {
      if (!r || typeof r !== 'object' || !('code' in r) || r.code !== 'ERR_PROTO_ACCESS') {
        throw r;
      }
    }
    var w = !!x && b && b(Object.prototype, '__proto__');
    var $ = Object;
    var k = $.getPrototypeOf;
    r.exports =
      w && typeof w.get === 'function'
        ? v([w.get])
        : typeof k === 'function'
          ? function getDunder(r) {
              return k(r == null ? r : $(r));
            }
          : false;
  },
  5: r => {
    var u = Object.defineProperty || false;
    if (u) {
      try {
        u({}, 'a', { value: 1 });
      } catch (r) {
        u = false;
      }
    }
    r.exports = u;
  },
  3267: r => {
    r.exports = EvalError;
  },
  5449: r => {
    r.exports = Error;
  },
  644: r => {
    r.exports = RangeError;
  },
  5760: r => {
    r.exports = ReferenceError;
  },
  630: r => {
    r.exports = SyntaxError;
  },
  6381: r => {
    r.exports = TypeError;
  },
  2723: r => {
    r.exports = URIError;
  },
  3370: r => {
    r.exports = Object;
  },
  9387: (r, u, m) => {
    var v = m(7039);
    var b = v('%Object.defineProperty%', true);
    var x = m(9534)();
    var w = m(5659);
    var $ = m(6381);
    var k = x ? Symbol.toStringTag : null;
    r.exports = function setToStringTag(r, u) {
      var m = arguments.length > 2 && !!arguments[2] && arguments[2].force;
      var v = arguments.length > 2 && !!arguments[2] && arguments[2].nonConfigurable;
      if (
        (typeof m !== 'undefined' && typeof m !== 'boolean') ||
        (typeof v !== 'undefined' && typeof v !== 'boolean')
      ) {
        throw new $(
          'if provided, the `overrideIfSet` and `nonConfigurable` options must be booleans'
        );
      }
      if (k && (m || !w(r, k))) {
        if (b) {
          b(r, k, { configurable: !v, enumerable: false, value: u, writable: false });
        } else {
          r[k] = u;
        }
      }
    };
  },
  4933: (r, u, m) => {
    var v;
    r.exports = function () {
      if (!v) {
        try {
          v = m(7674)('follow-redirects');
        } catch (r) {}
        if (typeof v !== 'function') {
          v = function () {};
        }
      }
      v.apply(null, arguments);
    };
  },
  7058: (r, u, m) => {
    var v = m(7016);
    var b = v.URL;
    var x = m(8611);
    var w = m(5692);
    var $ = m(2203).Writable;
    var k = m(2613);
    var S = m(4933);
    (function detectUnsupportedEnvironment() {
      var r = typeof process !== 'undefined';
      var u = typeof window !== 'undefined' && typeof document !== 'undefined';
      var m = isFunction(Error.captureStackTrace);
      if (!r && (u || !m)) {
        console.warn('The follow-redirects package should be excluded from browser builds.');
      }
    })();
    var I = false;
    try {
      k(new b(''));
    } catch (r) {
      I = r.code === 'ERR_INVALID_URL';
    }
    var z = [
      'auth',
      'host',
      'hostname',
      'href',
      'path',
      'pathname',
      'port',
      'protocol',
      'query',
      'search',
      'hash'
    ];
    var j = ['abort', 'aborted', 'connect', 'error', 'socket', 'timeout'];
    var O = Object.create(null);
    j.forEach(function (r) {
      O[r] = function (u, m, v) {
        this._redirectable.emit(r, u, m, v);
      };
    });
    var P = createErrorType('ERR_INVALID_URL', 'Invalid URL', TypeError);
    var U = createErrorType('ERR_FR_REDIRECTION_FAILURE', 'Redirected request failed');
    var E = createErrorType(
      'ERR_FR_TOO_MANY_REDIRECTS',
      'Maximum number of redirects exceeded',
      U
    );
    var D = createErrorType(
      'ERR_FR_MAX_BODY_LENGTH_EXCEEDED',
      'Request body larger than maxBodyLength limit'
    );
    var T = createErrorType('ERR_STREAM_WRITE_AFTER_END', 'write after end');
    var A = $.prototype.destroy || noop;
    function RedirectableRequest(r, u) {
      $.call(this);
      this._sanitizeOptions(r);
      this._options = r;
      this._ended = false;
      this._ending = false;
      this._redirectCount = 0;
      this._redirects = [];
      this._requestBodyLength = 0;
      this._requestBodyBuffers = [];
      if (u) {
        this.on('response', u);
      }
      var m = this;
      this._onNativeResponse = function (r) {
        try {
          m._processResponse(r);
        } catch (r) {
          m.emit('error', r instanceof U ? r : new U({ cause: r }));
        }
      };
      this._performRequest();
    }
    RedirectableRequest.prototype = Object.create($.prototype);
    RedirectableRequest.prototype.abort = function () {
      destroyRequest(this._currentRequest);
      this._currentRequest.abort();
      this.emit('abort');
    };
    RedirectableRequest.prototype.destroy = function (r) {
      destroyRequest(this._currentRequest, r);
      A.call(this, r);
      return this;
    };
    RedirectableRequest.prototype.write = function (r, u, m) {
      if (this._ending) {
        throw new T();
      }
      if (!isString(r) && !isBuffer(r)) {
        throw new TypeError('data should be a string, Buffer or Uint8Array');
      }
      if (isFunction(u)) {
        m = u;
        u = null;
      }
      if (r.length === 0) {
        if (m) {
          m();
        }
        return;
      }
      if (this._requestBodyLength + r.length <= this._options.maxBodyLength) {
        this._requestBodyLength += r.length;
        this._requestBodyBuffers.push({ data: r, encoding: u });
        this._currentRequest.write(r, u, m);
      } else {
        this.emit('error', new D());
        this.abort();
      }
    };
    RedirectableRequest.prototype.end = function (r, u, m) {
      if (isFunction(r)) {
        m = r;
        r = u = null;
      } else if (isFunction(u)) {
        m = u;
        u = null;
      }
      if (!r) {
        this._ended = this._ending = true;
        this._currentRequest.end(null, null, m);
      } else {
        var v = this;
        var b = this._currentRequest;
        this.write(r, u, function () {
          v._ended = true;
          b.end(null, null, m);
        });
        this._ending = true;
      }
    };
    RedirectableRequest.prototype.setHeader = function (r, u) {
      this._options.headers[r] = u;
      this._currentRequest.setHeader(r, u);
    };
    RedirectableRequest.prototype.removeHeader = function (r) {
      delete this._options.headers[r];
      this._currentRequest.removeHeader(r);
    };
    RedirectableRequest.prototype.setTimeout = function (r, u) {
      var m = this;
      function destroyOnTimeout(u) {
        u.setTimeout(r);
        u.removeListener('timeout', u.destroy);
        u.addListener('timeout', u.destroy);
      }
      function startTimer(u) {
        if (m._timeout) {
          clearTimeout(m._timeout);
        }
        m._timeout = setTimeout(function () {
          m.emit('timeout');
          clearTimer();
        }, r);
        destroyOnTimeout(u);
      }
      function clearTimer() {
        if (m._timeout) {
          clearTimeout(m._timeout);
          m._timeout = null;
        }
        m.removeListener('abort', clearTimer);
        m.removeListener('error', clearTimer);
        m.removeListener('response', clearTimer);
        m.removeListener('close', clearTimer);
        if (u) {
          m.removeListener('timeout', u);
        }
        if (!m.socket) {
          m._currentRequest.removeListener('socket', startTimer);
        }
      }
      if (u) {
        this.on('timeout', u);
      }
      if (this.socket) {
        startTimer(this.socket);
      } else {
        this._currentRequest.once('socket', startTimer);
      }
      this.on('socket', destroyOnTimeout);
      this.on('abort', clearTimer);
      this.on('error', clearTimer);
      this.on('response', clearTimer);
      this.on('close', clearTimer);
      return this;
    };
    ['flushHeaders', 'getHeader', 'setNoDelay', 'setSocketKeepAlive'].forEach(function (r) {
      RedirectableRequest.prototype[r] = function (u, m) {
        return this._currentRequest[r](u, m);
      };
    });
    ['aborted', 'connection', 'socket'].forEach(function (r) {
      Object.defineProperty(RedirectableRequest.prototype, r, {
        get: function () {
          return this._currentRequest[r];
        }
      });
    });
    RedirectableRequest.prototype._sanitizeOptions = function (r) {
      if (!r.headers) {
        r.headers = {};
      }
      if (r.host) {
        if (!r.hostname) {
          r.hostname = r.host;
        }
        delete r.host;
      }
      if (!r.pathname && r.path) {
        var u = r.path.indexOf('?');
        if (u < 0) {
          r.pathname = r.path;
        } else {
          r.pathname = r.path.substring(0, u);
          r.search = r.path.substring(u);
        }
      }
    };
    RedirectableRequest.prototype._performRequest = function () {
      var r = this._options.protocol;
      var u = this._options.nativeProtocols[r];
      if (!u) {
        throw new TypeError('Unsupported protocol ' + r);
      }
      if (this._options.agents) {
        var m = r.slice(0, -1);
        this._options.agent = this._options.agents[m];
      }
      var b = (this._currentRequest = u.request(this._options, this._onNativeResponse));
      b._redirectable = this;
      for (var x of j) {
        b.on(x, O[x]);
      }
      this._currentUrl = /^\//.test(this._options.path)
        ? v.format(this._options)
        : this._options.path;
      if (this._isRedirect) {
        var w = 0;
        var $ = this;
        var k = this._requestBodyBuffers;
        (function writeNext(r) {
          if (b === $._currentRequest) {
            if (r) {
              $.emit('error', r);
            } else if (w < k.length) {
              var u = k[w++];
              if (!b.finished) {
                b.write(u.data, u.encoding, writeNext);
              }
            } else if ($._ended) {
              b.end();
            }
          }
        })();
      }
    };
    RedirectableRequest.prototype._processResponse = function (r) {
      var u = r.statusCode;
      if (this._options.trackRedirects) {
        this._redirects.push({ url: this._currentUrl, headers: r.headers, statusCode: u });
      }
      var m = r.headers.location;
      if (!m || this._options.followRedirects === false || u < 300 || u >= 400) {
        r.responseUrl = this._currentUrl;
        r.redirects = this._redirects;
        this.emit('response', r);
        this._requestBodyBuffers = [];
        return;
      }
      destroyRequest(this._currentRequest);
      r.destroy();
      if (++this._redirectCount > this._options.maxRedirects) {
        throw new E();
      }
      var b;
      var x = this._options.beforeRedirect;
      if (x) {
        b = Object.assign({ Host: r.req.getHeader('host') }, this._options.headers);
      }
      var w = this._options.method;
      if (
        ((u === 301 || u === 302) && this._options.method === 'POST') ||
        (u === 303 && !/^(?:GET|HEAD)$/.test(this._options.method))
      ) {
        this._options.method = 'GET';
        this._requestBodyBuffers = [];
        removeMatchingHeaders(/^content-/i, this._options.headers);
      }
      var $ = removeMatchingHeaders(/^host$/i, this._options.headers);
      var k = parseUrl(this._currentUrl);
      var I = $ || k.host;
      var z = /^\w+:/.test(m) ? this._currentUrl : v.format(Object.assign(k, { host: I }));
      var j = resolveUrl(m, z);
      S('redirecting to', j.href);
      this._isRedirect = true;
      spreadUrlObject(j, this._options);
      if (
        (j.protocol !== k.protocol && j.protocol !== 'https:') ||
        (j.host !== I && !isSubdomain(j.host, I))
      ) {
        removeMatchingHeaders(/^(?:(?:proxy-)?authorization|cookie)$/i, this._options.headers);
      }
      if (isFunction(x)) {
        var O = { headers: r.headers, statusCode: u };
        var P = { url: z, method: w, headers: b };
        x(this._options, O, P);
        this._sanitizeOptions(this._options);
      }
      this._performRequest();
    };
    function wrap(r) {
      var u = { maxRedirects: 21, maxBodyLength: 10 * 1024 * 1024 };
      var m = {};
      Object.keys(r).forEach(function (v) {
        var b = v + ':';
        var x = (m[b] = r[v]);
        var w = (u[v] = Object.create(x));
        function request(r, v, x) {
          if (isURL(r)) {
            r = spreadUrlObject(r);
          } else if (isString(r)) {
            r = spreadUrlObject(parseUrl(r));
          } else {
            x = v;
            v = validateUrl(r);
            r = { protocol: b };
          }
          if (isFunction(v)) {
            x = v;
            v = null;
          }
          v = Object.assign(
            { maxRedirects: u.maxRedirects, maxBodyLength: u.maxBodyLength },
            r,
            v
          );
          v.nativeProtocols = m;
          if (!isString(v.host) && !isString(v.hostname)) {
            v.hostname = '::1';
          }
          k.equal(v.protocol, b, 'protocol mismatch');
          S('options', v);
          return new RedirectableRequest(v, x);
        }
        function get(r, u, m) {
          var v = w.request(r, u, m);
          v.end();
          return v;
        }
        Object.defineProperties(w, {
          request: { value: request, configurable: true, enumerable: true, writable: true },
          get: { value: get, configurable: true, enumerable: true, writable: true }
        });
      });
      return u;
    }
    function noop() {}
    function parseUrl(r) {
      var u;
      if (I) {
        u = new b(r);
      } else {
        u = validateUrl(v.parse(r));
        if (!isString(u.protocol)) {
          throw new P({ input: r });
        }
      }
      return u;
    }
    function resolveUrl(r, u) {
      return I ? new b(r, u) : parseUrl(v.resolve(u, r));
    }
    function validateUrl(r) {
      if (/^\[/.test(r.hostname) && !/^\[[:0-9a-f]+\]$/i.test(r.hostname)) {
        throw new P({ input: r.href || r });
      }
      if (/^\[/.test(r.host) && !/^\[[:0-9a-f]+\](:\d+)?$/i.test(r.host)) {
        throw new P({ input: r.href || r });
      }
      return r;
    }
    function spreadUrlObject(r, u) {
      var m = u || {};
      for (var v of z) {
        m[v] = r[v];
      }
      if (m.hostname.startsWith('[')) {
        m.hostname = m.hostname.slice(1, -1);
      }
      if (m.port !== '') {
        m.port = Number(m.port);
      }
      m.path = m.search ? m.pathname + m.search : m.pathname;
      return m;
    }
    function removeMatchingHeaders(r, u) {
      var m;
      for (var v in u) {
        if (r.test(v)) {
          m = u[v];
          delete u[v];
        }
      }
      return m === null || typeof m === 'undefined' ? undefined : String(m).trim();
    }
    function createErrorType(r, u, m) {
      function CustomError(m) {
        if (isFunction(Error.captureStackTrace)) {
          Error.captureStackTrace(this, this.constructor);
        }
        Object.assign(this, m || {});
        this.code = r;
        this.message = this.cause ? u + ': ' + this.cause.message : u;
      }
      CustomError.prototype = new (m || Error)();
      Object.defineProperties(CustomError.prototype, {
        constructor: { value: CustomError, enumerable: false },
        name: { value: 'Error [' + r + ']', enumerable: false }
      });
      return CustomError;
    }
    function destroyRequest(r, u) {
      for (var m of j) {
        r.removeListener(m, O[m]);
      }
      r.on('error', noop);
      r.destroy(u);
    }
    function isSubdomain(r, u) {
      k(isString(r) && isString(u));
      var m = r.length - u.length - 1;
      return m > 0 && r[m] === '.' && r.endsWith(u);
    }
    function isString(r) {
      return typeof r === 'string' || r instanceof String;
    }
    function isFunction(r) {
      return typeof r === 'function';
    }
    function isBuffer(r) {
      return typeof r === 'object' && 'length' in r;
    }
    function isURL(r) {
      return b && r instanceof b;
    }
    r.exports = wrap({ http: x, https: w });
    r.exports.wrap = wrap;
  },
  2099: (r, u, m) => {
    var v = m(7867);
    var b = m(9023);
    var x = m(6928);
    var w = m(8611);
    var $ = m(5692);
    var k = m(7016).parse;
    var S = m(9896);
    var I = m(2203).Stream;
    var z = m(6982);
    var j = m(4027);
    var O = m(3191);
    var P = m(9387);
    var U = m(5659);
    var E = m(1132);
    function FormData(r) {
      if (!(this instanceof FormData)) {
        return new FormData(r);
      }
      this._overheadLength = 0;
      this._valueLength = 0;
      this._valuesToMeasure = [];
      v.call(this);
      r = r || {};
      for (var u in r) {
        this[u] = r[u];
      }
    }
    b.inherits(FormData, v);
    FormData.LINE_BREAK = '\r\n';
    FormData.DEFAULT_CONTENT_TYPE = 'application/octet-stream';
    FormData.prototype.append = function (r, u, m) {
      m = m || {};
      if (typeof m === 'string') {
        m = { filename: m };
      }
      var b = v.prototype.append.bind(this);
      if (typeof u === 'number' || u == null) {
        u = String(u);
      }
      if (Array.isArray(u)) {
        this._error(new Error('Arrays are not supported.'));
        return;
      }
      var x = this._multiPartHeader(r, u, m);
      var w = this._multiPartFooter();
      b(x);
      b(u);
      b(w);
      this._trackLength(x, u, m);
    };
    FormData.prototype._trackLength = function (r, u, m) {
      var v = 0;
      if (m.knownLength != null) {
        v += Number(m.knownLength);
      } else if (Buffer.isBuffer(u)) {
        v = u.length;
      } else if (typeof u === 'string') {
        v = Buffer.byteLength(u);
      }
      this._valueLength += v;
      this._overheadLength += Buffer.byteLength(r) + FormData.LINE_BREAK.length;
      if (!u || (!u.path && !(u.readable && U(u, 'httpVersion')) && !(u instanceof I))) {
        return;
      }
      if (!m.knownLength) {
        this._valuesToMeasure.push(u);
      }
    };
    FormData.prototype._lengthRetriever = function (r, u) {
      if (U(r, 'fd')) {
        if (r.end != undefined && r.end != Infinity && r.start != undefined) {
          u(null, r.end + 1 - (r.start ? r.start : 0));
        } else {
          S.stat(r.path, function (m, v) {
            if (m) {
              u(m);
              return;
            }
            var b = v.size - (r.start ? r.start : 0);
            u(null, b);
          });
        }
      } else if (U(r, 'httpVersion')) {
        u(null, Number(r.headers['content-length']));
      } else if (U(r, 'httpModule')) {
        r.on('response', function (m) {
          r.pause();
          u(null, Number(m.headers['content-length']));
        });
        r.resume();
      } else {
        u('Unknown stream');
      }
    };
    FormData.prototype._multiPartHeader = function (r, u, m) {
      if (typeof m.header === 'string') {
        return m.header;
      }
      var v = this._getContentDisposition(u, m);
      var b = this._getContentType(u, m);
      var x = '';
      var w = {
        'Content-Disposition': ['form-data', 'name="' + r + '"'].concat(v || []),
        'Content-Type': [].concat(b || [])
      };
      if (typeof m.header === 'object') {
        E(w, m.header);
      }
      var $;
      for (var k in w) {
        if (U(w, k)) {
          $ = w[k];
          if ($ == null) {
            continue;
          }
          if (!Array.isArray($)) {
            $ = [$];
          }
          if ($.length) {
            x += k + ': ' + $.join('; ') + FormData.LINE_BREAK;
          }
        }
      }
      return '--' + this.getBoundary() + FormData.LINE_BREAK + x + FormData.LINE_BREAK;
    };
    FormData.prototype._getContentDisposition = function (r, u) {
      var m;
      if (typeof u.filepath === 'string') {
        m = x.normalize(u.filepath).replace(/\\/g, '/');
      } else if (u.filename || (r && (r.name || r.path))) {
        m = x.basename(u.filename || (r && (r.name || r.path)));
      } else if (r && r.readable && U(r, 'httpVersion')) {
        m = x.basename(r.client._httpMessage.path || '');
      }
      if (m) {
        return 'filename="' + m + '"';
      }
    };
    FormData.prototype._getContentType = function (r, u) {
      var m = u.contentType;
      if (!m && r && r.name) {
        m = j.lookup(r.name);
      }
      if (!m && r && r.path) {
        m = j.lookup(r.path);
      }
      if (!m && r && r.readable && U(r, 'httpVersion')) {
        m = r.headers['content-type'];
      }
      if (!m && (u.filepath || u.filename)) {
        m = j.lookup(u.filepath || u.filename);
      }
      if (!m && r && typeof r === 'object') {
        m = FormData.DEFAULT_CONTENT_TYPE;
      }
      return m;
    };
    FormData.prototype._multiPartFooter = function () {
      return function (r) {
        var u = FormData.LINE_BREAK;
        var m = this._streams.length === 0;
        if (m) {
          u += this._lastBoundary();
        }
        r(u);
      }.bind(this);
    };
    FormData.prototype._lastBoundary = function () {
      return '--' + this.getBoundary() + '--' + FormData.LINE_BREAK;
    };
    FormData.prototype.getHeaders = function (r) {
      var u;
      var m = { 'content-type': 'multipart/form-data; boundary=' + this.getBoundary() };
      for (u in r) {
        if (U(r, u)) {
          m[u.toLowerCase()] = r[u];
        }
      }
      return m;
    };
    FormData.prototype.setBoundary = function (r) {
      if (typeof r !== 'string') {
        throw new TypeError('FormData boundary must be a string');
      }
      this._boundary = r;
    };
    FormData.prototype.getBoundary = function () {
      if (!this._boundary) {
        this._generateBoundary();
      }
      return this._boundary;
    };
    FormData.prototype.getBuffer = function () {
      var r = new Buffer.alloc(0);
      var u = this.getBoundary();
      for (var m = 0, v = this._streams.length; m < v; m++) {
        if (typeof this._streams[m] !== 'function') {
          if (Buffer.isBuffer(this._streams[m])) {
            r = Buffer.concat([r, this._streams[m]]);
          } else {
            r = Buffer.concat([r, Buffer.from(this._streams[m])]);
          }
          if (
            typeof this._streams[m] !== 'string' ||
            this._streams[m].substring(2, u.length + 2) !== u
          ) {
            r = Buffer.concat([r, Buffer.from(FormData.LINE_BREAK)]);
          }
        }
      }
      return Buffer.concat([r, Buffer.from(this._lastBoundary())]);
    };
    FormData.prototype._generateBoundary = function () {
      this._boundary = '--------------------------' + z.randomBytes(12).toString('hex');
    };
    FormData.prototype.getLengthSync = function () {
      var r = this._overheadLength + this._valueLength;
      if (this._streams.length) {
        r += this._lastBoundary().length;
      }
      if (!this.hasKnownLength()) {
        this._error(new Error('Cannot calculate proper length in synchronous way.'));
      }
      return r;
    };
    FormData.prototype.hasKnownLength = function () {
      var r = true;
      if (this._valuesToMeasure.length) {
        r = false;
      }
      return r;
    };
    FormData.prototype.getLength = function (r) {
      var u = this._overheadLength + this._valueLength;
      if (this._streams.length) {
        u += this._lastBoundary().length;
      }
      if (!this._valuesToMeasure.length) {
        process.nextTick(r.bind(this, null, u));
        return;
      }
      O.parallel(this._valuesToMeasure, this._lengthRetriever, function (m, v) {
        if (m) {
          r(m);
          return;
        }
        v.forEach(function (r) {
          u += r;
        });
        r(null, u);
      });
    };
    FormData.prototype.submit = function (r, u) {
      var m;
      var v;
      var b = { method: 'post' };
      if (typeof r === 'string') {
        r = k(r);
        v = E({ port: r.port, path: r.pathname, host: r.hostname, protocol: r.protocol }, b);
      } else {
        v = E(r, b);
        if (!v.port) {
          v.port = v.protocol === 'https:' ? 443 : 80;
        }
      }
      v.headers = this.getHeaders(r.headers);
      if (v.protocol === 'https:') {
        m = $.request(v);
      } else {
        m = w.request(v);
      }
      this.getLength(
        function (r, v) {
          if (r && r !== 'Unknown stream') {
            this._error(r);
            return;
          }
          if (v) {
            m.setHeader('Content-Length', v);
          }
          this.pipe(m);
          if (u) {
            var b;
            var callback = function (r, v) {
              m.removeListener('error', callback);
              m.removeListener('response', b);
              return u.call(this, r, v);
            };
            b = callback.bind(this, null);
            m.on('error', callback);
            m.on('response', b);
          }
        }.bind(this)
      );
      return m;
    };
    FormData.prototype._error = function (r) {
      if (!this.error) {
        this.error = r;
        this.pause();
        this.emit('error', r);
      }
    };
    FormData.prototype.toString = function () {
      return '[object FormData]';
    };
    P(FormData.prototype, 'FormData');
    r.exports = FormData;
  },
  1132: r => {
    r.exports = function (r, u) {
      Object.keys(u).forEach(function (m) {
        r[m] = r[m] || u[m];
      });
      return r;
    };
  },
  2115: r => {
    var u = 'Function.prototype.bind called on incompatible ';
    var m = Object.prototype.toString;
    var v = Math.max;
    var b = '[object Function]';
    var x = function concatty(r, u) {
      var m = [];
      for (var v = 0; v < r.length; v += 1) {
        m[v] = r[v];
      }
      for (var b = 0; b < u.length; b += 1) {
        m[b + r.length] = u[b];
      }
      return m;
    };
    var w = function slicy(r, u) {
      var m = [];
      for (var v = u || 0, b = 0; v < r.length; v += 1, b += 1) {
        m[b] = r[v];
      }
      return m;
    };
    var joiny = function (r, u) {
      var m = '';
      for (var v = 0; v < r.length; v += 1) {
        m += r[v];
        if (v + 1 < r.length) {
          m += u;
        }
      }
      return m;
    };
    r.exports = function bind(r) {
      var $ = this;
      if (typeof $ !== 'function' || m.apply($) !== b) {
        throw new TypeError(u + $);
      }
      var k = w(arguments, 1);
      var S;
      var binder = function () {
        if (this instanceof S) {
          var u = $.apply(this, x(k, arguments));
          if (Object(u) === u) {
            return u;
          }
          return this;
        }
        return $.apply(r, x(k, arguments));
      };
      var I = v(0, $.length - k.length);
      var z = [];
      for (var j = 0; j < I; j++) {
        z[j] = '$' + j;
      }
      S = Function(
        'binder',
        'return function (' + joiny(z, ',') + '){ return binder.apply(this,arguments); }'
      )(binder);
      if ($.prototype) {
        var O = function Empty() {};
        O.prototype = $.prototype;
        S.prototype = new O();
        O.prototype = null;
      }
      return S;
    };
  },
  8637: (r, u, m) => {
    var v = m(2115);
    r.exports = Function.prototype.bind || v;
  },
  7039: (r, u, m) => {
    var v;
    var b = m(3370);
    var x = m(5449);
    var w = m(3267);
    var $ = m(644);
    var k = m(5760);
    var S = m(630);
    var I = m(6381);
    var z = m(2723);
    var j = m(1632);
    var O = m(8926);
    var P = m(954);
    var U = m(3892);
    var E = m(6326);
    var D = m(8691);
    var T = m(7491);
    var A = Function;
    var getEvalledConstructor = function (r) {
      try {
        return A('"use strict"; return (' + r + ').constructor;')();
      } catch (r) {}
    };
    var N = m(6729);
    var C = m(5);
    var throwTypeError = function () {
      throw new I();
    };
    var L = N
      ? (function () {
          try {
            arguments.callee;
            return throwTypeError;
          } catch (r) {
            try {
              return N(arguments, 'callee').get;
            } catch (r) {
              return throwTypeError;
            }
          }
        })()
      : throwTypeError;
    var q = m(4725)();
    var B = m(2198);
    var V = m(7986);
    var M = m(8538);
    var K = m(6310);
    var W = m(9986);
    var G = {};
    var Y = typeof Uint8Array === 'undefined' || !B ? v : B(Uint8Array);
    var Q = {
      __proto__: null,
      '%AggregateError%': typeof AggregateError === 'undefined' ? v : AggregateError,
      '%Array%': Array,
      '%ArrayBuffer%': typeof ArrayBuffer === 'undefined' ? v : ArrayBuffer,
      '%ArrayIteratorPrototype%': q && B ? B([][Symbol.iterator]()) : v,
      '%AsyncFromSyncIteratorPrototype%': v,
      '%AsyncFunction%': G,
      '%AsyncGenerator%': G,
      '%AsyncGeneratorFunction%': G,
      '%AsyncIteratorPrototype%': G,
      '%Atomics%': typeof Atomics === 'undefined' ? v : Atomics,
      '%BigInt%': typeof BigInt === 'undefined' ? v : BigInt,
      '%BigInt64Array%': typeof BigInt64Array === 'undefined' ? v : BigInt64Array,
      '%BigUint64Array%': typeof BigUint64Array === 'undefined' ? v : BigUint64Array,
      '%Boolean%': Boolean,
      '%DataView%': typeof DataView === 'undefined' ? v : DataView,
      '%Date%': Date,
      '%decodeURI%': decodeURI,
      '%decodeURIComponent%': decodeURIComponent,
      '%encodeURI%': encodeURI,
      '%encodeURIComponent%': encodeURIComponent,
      '%Error%': x,
      '%eval%': eval,
      '%EvalError%': w,
      '%Float16Array%': typeof Float16Array === 'undefined' ? v : Float16Array,
      '%Float32Array%': typeof Float32Array === 'undefined' ? v : Float32Array,
      '%Float64Array%': typeof Float64Array === 'undefined' ? v : Float64Array,
      '%FinalizationRegistry%':
        typeof FinalizationRegistry === 'undefined' ? v : FinalizationRegistry,
      '%Function%': A,
      '%GeneratorFunction%': G,
      '%Int8Array%': typeof Int8Array === 'undefined' ? v : Int8Array,
      '%Int16Array%': typeof Int16Array === 'undefined' ? v : Int16Array,
      '%Int32Array%': typeof Int32Array === 'undefined' ? v : Int32Array,
      '%isFinite%': isFinite,
      '%isNaN%': isNaN,
      '%IteratorPrototype%': q && B ? B(B([][Symbol.iterator]())) : v,
      '%JSON%': typeof JSON === 'object' ? JSON : v,
      '%Map%': typeof Map === 'undefined' ? v : Map,
      '%MapIteratorPrototype%':
        typeof Map === 'undefined' || !q || !B ? v : B(new Map()[Symbol.iterator]()),
      '%Math%': Math,
      '%Number%': Number,
      '%Object%': b,
      '%Object.getOwnPropertyDescriptor%': N,
      '%parseFloat%': parseFloat,
      '%parseInt%': parseInt,
      '%Promise%': typeof Promise === 'undefined' ? v : Promise,
      '%Proxy%': typeof Proxy === 'undefined' ? v : Proxy,
      '%RangeError%': $,
      '%ReferenceError%': k,
      '%Reflect%': typeof Reflect === 'undefined' ? v : Reflect,
      '%RegExp%': RegExp,
      '%Set%': typeof Set === 'undefined' ? v : Set,
      '%SetIteratorPrototype%':
        typeof Set === 'undefined' || !q || !B ? v : B(new Set()[Symbol.iterator]()),
      '%SharedArrayBuffer%': typeof SharedArrayBuffer === 'undefined' ? v : SharedArrayBuffer,
      '%String%': String,
      '%StringIteratorPrototype%': q && B ? B(''[Symbol.iterator]()) : v,
      '%Symbol%': q ? Symbol : v,
      '%SyntaxError%': S,
      '%ThrowTypeError%': L,
      '%TypedArray%': Y,
      '%TypeError%': I,
      '%Uint8Array%': typeof Uint8Array === 'undefined' ? v : Uint8Array,
      '%Uint8ClampedArray%': typeof Uint8ClampedArray === 'undefined' ? v : Uint8ClampedArray,
      '%Uint16Array%': typeof Uint16Array === 'undefined' ? v : Uint16Array,
      '%Uint32Array%': typeof Uint32Array === 'undefined' ? v : Uint32Array,
      '%URIError%': z,
      '%WeakMap%': typeof WeakMap === 'undefined' ? v : WeakMap,
      '%WeakRef%': typeof WeakRef === 'undefined' ? v : WeakRef,
      '%WeakSet%': typeof WeakSet === 'undefined' ? v : WeakSet,
      '%Function.prototype.call%': W,
      '%Function.prototype.apply%': K,
      '%Object.defineProperty%': C,
      '%Object.getPrototypeOf%': V,
      '%Math.abs%': j,
      '%Math.floor%': O,
      '%Math.max%': P,
      '%Math.min%': U,
      '%Math.pow%': E,
      '%Math.round%': D,
      '%Math.sign%': T,
      '%Reflect.getPrototypeOf%': M
    };
    if (B) {
      try {
        null.error;
      } catch (r) {
        var ee = B(B(r));
        Q['%Error.prototype%'] = ee;
      }
    }
    var te = function doEval(r) {
      var u;
      if (r === '%AsyncFunction%') {
        u = getEvalledConstructor('async function () {}');
      } else if (r === '%GeneratorFunction%') {
        u = getEvalledConstructor('function* () {}');
      } else if (r === '%AsyncGeneratorFunction%') {
        u = getEvalledConstructor('async function* () {}');
      } else if (r === '%AsyncGenerator%') {
        var m = doEval('%AsyncGeneratorFunction%');
        if (m) {
          u = m.prototype;
        }
      } else if (r === '%AsyncIteratorPrototype%') {
        var v = doEval('%AsyncGenerator%');
        if (v && B) {
          u = B(v.prototype);
        }
      }
      Q[r] = u;
      return u;
    };
    var ne = {
      __proto__: null,
      '%ArrayBufferPrototype%': ['ArrayBuffer', 'prototype'],
      '%ArrayPrototype%': ['Array', 'prototype'],
      '%ArrayProto_entries%': ['Array', 'prototype', 'entries'],
      '%ArrayProto_forEach%': ['Array', 'prototype', 'forEach'],
      '%ArrayProto_keys%': ['Array', 'prototype', 'keys'],
      '%ArrayProto_values%': ['Array', 'prototype', 'values'],
      '%AsyncFunctionPrototype%': ['AsyncFunction', 'prototype'],
      '%AsyncGenerator%': ['AsyncGeneratorFunction', 'prototype'],
      '%AsyncGeneratorPrototype%': ['AsyncGeneratorFunction', 'prototype', 'prototype'],
      '%BooleanPrototype%': ['Boolean', 'prototype'],
      '%DataViewPrototype%': ['DataView', 'prototype'],
      '%DatePrototype%': ['Date', 'prototype'],
      '%ErrorPrototype%': ['Error', 'prototype'],
      '%EvalErrorPrototype%': ['EvalError', 'prototype'],
      '%Float32ArrayPrototype%': ['Float32Array', 'prototype'],
      '%Float64ArrayPrototype%': ['Float64Array', 'prototype'],
      '%FunctionPrototype%': ['Function', 'prototype'],
      '%Generator%': ['GeneratorFunction', 'prototype'],
      '%GeneratorPrototype%': ['GeneratorFunction', 'prototype', 'prototype'],
      '%Int8ArrayPrototype%': ['Int8Array', 'prototype'],
      '%Int16ArrayPrototype%': ['Int16Array', 'prototype'],
      '%Int32ArrayPrototype%': ['Int32Array', 'prototype'],
      '%JSONParse%': ['JSON', 'parse'],
      '%JSONStringify%': ['JSON', 'stringify'],
      '%MapPrototype%': ['Map', 'prototype'],
      '%NumberPrototype%': ['Number', 'prototype'],
      '%ObjectPrototype%': ['Object', 'prototype'],
      '%ObjProto_toString%': ['Object', 'prototype', 'toString'],
      '%ObjProto_valueOf%': ['Object', 'prototype', 'valueOf'],
      '%PromisePrototype%': ['Promise', 'prototype'],
      '%PromiseProto_then%': ['Promise', 'prototype', 'then'],
      '%Promise_all%': ['Promise', 'all'],
      '%Promise_reject%': ['Promise', 'reject'],
      '%Promise_resolve%': ['Promise', 'resolve'],
      '%RangeErrorPrototype%': ['RangeError', 'prototype'],
      '%ReferenceErrorPrototype%': ['ReferenceError', 'prototype'],
      '%RegExpPrototype%': ['RegExp', 'prototype'],
      '%SetPrototype%': ['Set', 'prototype'],
      '%SharedArrayBufferPrototype%': ['SharedArrayBuffer', 'prototype'],
      '%StringPrototype%': ['String', 'prototype'],
      '%SymbolPrototype%': ['Symbol', 'prototype'],
      '%SyntaxErrorPrototype%': ['SyntaxError', 'prototype'],
      '%TypedArrayPrototype%': ['TypedArray', 'prototype'],
      '%TypeErrorPrototype%': ['TypeError', 'prototype'],
      '%Uint8ArrayPrototype%': ['Uint8Array', 'prototype'],
      '%Uint8ClampedArrayPrototype%': ['Uint8ClampedArray', 'prototype'],
      '%Uint16ArrayPrototype%': ['Uint16Array', 'prototype'],
      '%Uint32ArrayPrototype%': ['Uint32Array', 'prototype'],
      '%URIErrorPrototype%': ['URIError', 'prototype'],
      '%WeakMapPrototype%': ['WeakMap', 'prototype'],
      '%WeakSetPrototype%': ['WeakSet', 'prototype']
    };
    var ie = m(8637);
    var ae = m(5659);
    var re = ie.call(W, Array.prototype.concat);
    var oe = ie.call(K, Array.prototype.splice);
    var se = ie.call(W, String.prototype.replace);
    var ce = ie.call(W, String.prototype.slice);
    var ue = ie.call(W, RegExp.prototype.exec);
    var le =
      /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g;
    var pe = /\\(\\)?/g;
    var me = function stringToPath(r) {
      var u = ce(r, 0, 1);
      var m = ce(r, -1);
      if (u === '%' && m !== '%') {
        throw new S('invalid intrinsic syntax, expected closing `%`');
      } else if (m === '%' && u !== '%') {
        throw new S('invalid intrinsic syntax, expected opening `%`');
      }
      var v = [];
      se(r, le, function (r, u, m, b) {
        v[v.length] = m ? se(b, pe, '$1') : u || r;
      });
      return v;
    };
    var fe = function getBaseIntrinsic(r, u) {
      var m = r;
      var v;
      if (ae(ne, m)) {
        v = ne[m];
        m = '%' + v[0] + '%';
      }
      if (ae(Q, m)) {
        var b = Q[m];
        if (b === G) {
          b = te(m);
        }
        if (typeof b === 'undefined' && !u) {
          throw new I(
            'intrinsic ' + r + ' exists, but is not available. Please file an issue!'
          );
        }
        return { alias: v, name: m, value: b };
      }
      throw new S('intrinsic ' + r + ' does not exist!');
    };
    r.exports = function GetIntrinsic(r, u) {
      if (typeof r !== 'string' || r.length === 0) {
        throw new I('intrinsic name must be a non-empty string');
      }
      if (arguments.length > 1 && typeof u !== 'boolean') {
        throw new I('"allowMissing" argument must be a boolean');
      }
      if (ue(/^%?[^%]*%?$/, r) === null) {
        throw new S(
          '`%` may not be present anywhere but at the beginning and end of the intrinsic name'
        );
      }
      var m = me(r);
      var b = m.length > 0 ? m[0] : '';
      var x = fe('%' + b + '%', u);
      var w = x.name;
      var $ = x.value;
      var k = false;
      var z = x.alias;
      if (z) {
        b = z[0];
        oe(m, re([0, 1], z));
      }
      for (var j = 1, O = true; j < m.length; j += 1) {
        var P = m[j];
        var U = ce(P, 0, 1);
        var E = ce(P, -1);
        if (
          (U === '"' || U === "'" || U === '`' || E === '"' || E === "'" || E === '`') &&
          U !== E
        ) {
          throw new S('property names with quotes must have matching quotes');
        }
        if (P === 'constructor' || !O) {
          k = true;
        }
        b += '.' + P;
        w = '%' + b + '%';
        if (ae(Q, w)) {
          $ = Q[w];
        } else if ($ != null) {
          if (!(P in $)) {
            if (!u) {
              throw new I(
                'base intrinsic for ' + r + ' exists, but the property is not available.'
              );
            }
            return void v;
          }
          if (N && j + 1 >= m.length) {
            var D = N($, P);
            O = !!D;
            if (O && 'get' in D && !('originalValue' in D.get)) {
              $ = D.get;
            } else {
              $ = $[P];
            }
          } else {
            O = ae($, P);
            $ = $[P];
          }
          if (O && !k) {
            Q[w] = $;
          }
        }
      }
      return $;
    };
  },
  7986: (r, u, m) => {
    var v = m(3370);
    r.exports = v.getPrototypeOf || null;
  },
  8538: r => {
    r.exports = (typeof Reflect !== 'undefined' && Reflect.getPrototypeOf) || null;
  },
  2198: (r, u, m) => {
    var v = m(8538);
    var b = m(7986);
    var x = m(2578);
    r.exports = v
      ? function getProto(r) {
          return v(r);
        }
      : b
        ? function getProto(r) {
            if (!r || (typeof r !== 'object' && typeof r !== 'function')) {
              throw new TypeError('getProto: not an object');
            }
            return b(r);
          }
        : x
          ? function getProto(r) {
              return x(r);
            }
          : null;
  },
  6819: r => {
    r.exports = Object.getOwnPropertyDescriptor;
  },
  6729: (r, u, m) => {
    var v = m(6819);
    if (v) {
      try {
        v([], 'length');
      } catch (r) {
        v = null;
      }
    }
    r.exports = v;
  },
  4725: (r, u, m) => {
    var v = typeof Symbol !== 'undefined' && Symbol;
    var b = m(9767);
    r.exports = function hasNativeSymbols() {
      if (typeof v !== 'function') {
        return false;
      }
      if (typeof Symbol !== 'function') {
        return false;
      }
      if (typeof v('foo') !== 'symbol') {
        return false;
      }
      if (typeof Symbol('bar') !== 'symbol') {
        return false;
      }
      return b();
    };
  },
  9767: r => {
    r.exports = function hasSymbols() {
      if (typeof Symbol !== 'function' || typeof Object.getOwnPropertySymbols !== 'function') {
        return false;
      }
      if (typeof Symbol.iterator === 'symbol') {
        return true;
      }
      var r = {};
      var u = Symbol('test');
      var m = Object(u);
      if (typeof u === 'string') {
        return false;
      }
      if (Object.prototype.toString.call(u) !== '[object Symbol]') {
        return false;
      }
      if (Object.prototype.toString.call(m) !== '[object Symbol]') {
        return false;
      }
      var v = 42;
      r[u] = v;
      for (var b in r) {
        return false;
      }
      if (typeof Object.keys === 'function' && Object.keys(r).length !== 0) {
        return false;
      }
      if (
        typeof Object.getOwnPropertyNames === 'function' &&
        Object.getOwnPropertyNames(r).length !== 0
      ) {
        return false;
      }
      var x = Object.getOwnPropertySymbols(r);
      if (x.length !== 1 || x[0] !== u) {
        return false;
      }
      if (!Object.prototype.propertyIsEnumerable.call(r, u)) {
        return false;
      }
      if (typeof Object.getOwnPropertyDescriptor === 'function') {
        var w = Object.getOwnPropertyDescriptor(r, u);
        if (w.value !== v || w.enumerable !== true) {
          return false;
        }
      }
      return true;
    };
  },
  9534: (r, u, m) => {
    var v = m(9767);
    r.exports = function hasToStringTagShams() {
      return v() && !!Symbol.toStringTag;
    };
  },
  5659: (r, u, m) => {
    var v = Function.prototype.call;
    var b = Object.prototype.hasOwnProperty;
    var x = m(8637);
    r.exports = x.call(v, b);
  },
  1632: r => {
    r.exports = Math.abs;
  },
  8926: r => {
    r.exports = Math.floor;
  },
  6541: r => {
    r.exports =
      Number.isNaN ||
      function isNaN(r) {
        return r !== r;
      };
  },
  954: r => {
    r.exports = Math.max;
  },
  3892: r => {
    r.exports = Math.min;
  },
  6326: r => {
    r.exports = Math.pow;
  },
  8691: r => {
    r.exports = Math.round;
  },
  7491: (r, u, m) => {
    var v = m(6541);
    r.exports = function sign(r) {
      if (v(r) || r === 0) {
        return r;
      }
      return r < 0 ? -1 : +1;
    };
  },
  2052: (r, u, m) => {
    /*!
     * mime-db
     * Copyright(c) 2014 Jonathan Ong
     * Copyright(c) 2015-2022 Douglas Christopher Wilson
     * MIT Licensed
     */
    r.exports = m(1813);
  },
  4027: (r, u, m) => {
    /*!
     * mime-types
     * Copyright(c) 2014 Jonathan Ong
     * Copyright(c) 2015 Douglas Christopher Wilson
     * MIT Licensed
     */
    var v = m(2052);
    var b = m(6928).extname;
    var x = /^\s*([^;\s]*)(?:;|\s|$)/;
    var w = /^text\//i;
    u.charset = charset;
    u.charsets = { lookup: charset };
    u.contentType = contentType;
    u.extension = extension;
    u.extensions = Object.create(null);
    u.lookup = lookup;
    u.types = Object.create(null);
    populateMaps(u.extensions, u.types);
    function charset(r) {
      if (!r || typeof r !== 'string') {
        return false;
      }
      var u = x.exec(r);
      var m = u && v[u[1].toLowerCase()];
      if (m && m.charset) {
        return m.charset;
      }
      if (u && w.test(u[1])) {
        return 'UTF-8';
      }
      return false;
    }
    function contentType(r) {
      if (!r || typeof r !== 'string') {
        return false;
      }
      var m = r.indexOf('/') === -1 ? u.lookup(r) : r;
      if (!m) {
        return false;
      }
      if (m.indexOf('charset') === -1) {
        var v = u.charset(m);
        if (v) m += '; charset=' + v.toLowerCase();
      }
      return m;
    }
    function extension(r) {
      if (!r || typeof r !== 'string') {
        return false;
      }
      var m = x.exec(r);
      var v = m && u.extensions[m[1].toLowerCase()];
      if (!v || !v.length) {
        return false;
      }
      return v[0];
    }
    function lookup(r) {
      if (!r || typeof r !== 'string') {
        return false;
      }
      var m = b('x.' + r)
        .toLowerCase()
        .substr(1);
      if (!m) {
        return false;
      }
      return u.types[m] || false;
    }
    function populateMaps(r, u) {
      var m = ['nginx', 'apache', undefined, 'iana'];
      Object.keys(v).forEach(function forEachMimeType(b) {
        var x = v[b];
        var w = x.extensions;
        if (!w || !w.length) {
          return;
        }
        r[b] = w;
        for (var $ = 0; $ < w.length; $++) {
          var k = w[$];
          if (u[k]) {
            var S = m.indexOf(v[u[k]].source);
            var I = m.indexOf(x.source);
            if (
              u[k] !== 'application/octet-stream' &&
              (S > I || (S === I && u[k].substr(0, 12) === 'application/'))
            ) {
              continue;
            }
          }
          u[k] = b;
        }
      });
    }
  },
  2613: u => {
    u.exports = r(import.meta.url)('assert');
  },
  6982: u => {
    u.exports = r(import.meta.url)('crypto');
  },
  9896: u => {
    u.exports = r(import.meta.url)('fs');
  },
  8611: u => {
    u.exports = r(import.meta.url)('http');
  },
  5692: u => {
    u.exports = r(import.meta.url)('https');
  },
  6928: u => {
    u.exports = r(import.meta.url)('path');
  },
  2203: u => {
    u.exports = r(import.meta.url)('stream');
  },
  2018: u => {
    u.exports = r(import.meta.url)('tty');
  },
  7016: u => {
    u.exports = r(import.meta.url)('url');
  },
  9023: u => {
    u.exports = r(import.meta.url)('util');
  },
  1813: r => {
    r.exports = JSON.parse(
      '{"application/1d-interleaved-parityfec":{"source":"iana"},"application/3gpdash-qoe-report+xml":{"source":"iana","charset":"UTF-8","compressible":true},"application/3gpp-ims+xml":{"source":"iana","compressible":true},"application/3gpphal+json":{"source":"iana","compressible":true},"application/3gpphalforms+json":{"source":"iana","compressible":true},"application/a2l":{"source":"iana"},"application/ace+cbor":{"source":"iana"},"application/activemessage":{"source":"iana"},"application/activity+json":{"source":"iana","compressible":true},"application/alto-costmap+json":{"source":"iana","compressible":true},"application/alto-costmapfilter+json":{"source":"iana","compressible":true},"application/alto-directory+json":{"source":"iana","compressible":true},"application/alto-endpointcost+json":{"source":"iana","compressible":true},"application/alto-endpointcostparams+json":{"source":"iana","compressible":true},"application/alto-endpointprop+json":{"source":"iana","compressible":true},"application/alto-endpointpropparams+json":{"source":"iana","compressible":true},"application/alto-error+json":{"source":"iana","compressible":true},"application/alto-networkmap+json":{"source":"iana","compressible":true},"application/alto-networkmapfilter+json":{"source":"iana","compressible":true},"application/alto-updatestreamcontrol+json":{"source":"iana","compressible":true},"application/alto-updatestreamparams+json":{"source":"iana","compressible":true},"application/aml":{"source":"iana"},"application/andrew-inset":{"source":"iana","extensions":["ez"]},"application/applefile":{"source":"iana"},"application/applixware":{"source":"apache","extensions":["aw"]},"application/at+jwt":{"source":"iana"},"application/atf":{"source":"iana"},"application/atfx":{"source":"iana"},"application/atom+xml":{"source":"iana","compressible":true,"extensions":["atom"]},"application/atomcat+xml":{"source":"iana","compressible":true,"extensions":["atomcat"]},"application/atomdeleted+xml":{"source":"iana","compressible":true,"extensions":["atomdeleted"]},"application/atomicmail":{"source":"iana"},"application/atomsvc+xml":{"source":"iana","compressible":true,"extensions":["atomsvc"]},"application/atsc-dwd+xml":{"source":"iana","compressible":true,"extensions":["dwd"]},"application/atsc-dynamic-event-message":{"source":"iana"},"application/atsc-held+xml":{"source":"iana","compressible":true,"extensions":["held"]},"application/atsc-rdt+json":{"source":"iana","compressible":true},"application/atsc-rsat+xml":{"source":"iana","compressible":true,"extensions":["rsat"]},"application/atxml":{"source":"iana"},"application/auth-policy+xml":{"source":"iana","compressible":true},"application/bacnet-xdd+zip":{"source":"iana","compressible":false},"application/batch-smtp":{"source":"iana"},"application/bdoc":{"compressible":false,"extensions":["bdoc"]},"application/beep+xml":{"source":"iana","charset":"UTF-8","compressible":true},"application/calendar+json":{"source":"iana","compressible":true},"application/calendar+xml":{"source":"iana","compressible":true,"extensions":["xcs"]},"application/call-completion":{"source":"iana"},"application/cals-1840":{"source":"iana"},"application/captive+json":{"source":"iana","compressible":true},"application/cbor":{"source":"iana"},"application/cbor-seq":{"source":"iana"},"application/cccex":{"source":"iana"},"application/ccmp+xml":{"source":"iana","compressible":true},"application/ccxml+xml":{"source":"iana","compressible":true,"extensions":["ccxml"]},"application/cdfx+xml":{"source":"iana","compressible":true,"extensions":["cdfx"]},"application/cdmi-capability":{"source":"iana","extensions":["cdmia"]},"application/cdmi-container":{"source":"iana","extensions":["cdmic"]},"application/cdmi-domain":{"source":"iana","extensions":["cdmid"]},"application/cdmi-object":{"source":"iana","extensions":["cdmio"]},"application/cdmi-queue":{"source":"iana","extensions":["cdmiq"]},"application/cdni":{"source":"iana"},"application/cea":{"source":"iana"},"application/cea-2018+xml":{"source":"iana","compressible":true},"application/cellml+xml":{"source":"iana","compressible":true},"application/cfw":{"source":"iana"},"application/city+json":{"source":"iana","compressible":true},"application/clr":{"source":"iana"},"application/clue+xml":{"source":"iana","compressible":true},"application/clue_info+xml":{"source":"iana","compressible":true},"application/cms":{"source":"iana"},"application/cnrp+xml":{"source":"iana","compressible":true},"application/coap-group+json":{"source":"iana","compressible":true},"application/coap-payload":{"source":"iana"},"application/commonground":{"source":"iana"},"application/conference-info+xml":{"source":"iana","compressible":true},"application/cose":{"source":"iana"},"application/cose-key":{"source":"iana"},"application/cose-key-set":{"source":"iana"},"application/cpl+xml":{"source":"iana","compressible":true,"extensions":["cpl"]},"application/csrattrs":{"source":"iana"},"application/csta+xml":{"source":"iana","compressible":true},"application/cstadata+xml":{"source":"iana","compressible":true},"application/csvm+json":{"source":"iana","compressible":true},"application/cu-seeme":{"source":"apache","extensions":["cu"]},"application/cwt":{"source":"iana"},"application/cybercash":{"source":"iana"},"application/dart":{"compressible":true},"application/dash+xml":{"source":"iana","compressible":true,"extensions":["mpd"]},"application/dash-patch+xml":{"source":"iana","compressible":true,"extensions":["mpp"]},"application/dashdelta":{"source":"iana"},"application/davmount+xml":{"source":"iana","compressible":true,"extensions":["davmount"]},"application/dca-rft":{"source":"iana"},"application/dcd":{"source":"iana"},"application/dec-dx":{"source":"iana"},"application/dialog-info+xml":{"source":"iana","compressible":true},"application/dicom":{"source":"iana"},"application/dicom+json":{"source":"iana","compressible":true},"application/dicom+xml":{"source":"iana","compressible":true},"application/dii":{"source":"iana"},"application/dit":{"source":"iana"},"application/dns":{"source":"iana"},"application/dns+json":{"source":"iana","compressible":true},"application/dns-message":{"source":"iana"},"application/docbook+xml":{"source":"apache","compressible":true,"extensions":["dbk"]},"application/dots+cbor":{"source":"iana"},"application/dskpp+xml":{"source":"iana","compressible":true},"application/dssc+der":{"source":"iana","extensions":["dssc"]},"application/dssc+xml":{"source":"iana","compressible":true,"extensions":["xdssc"]},"application/dvcs":{"source":"iana"},"application/ecmascript":{"source":"iana","compressible":true,"extensions":["es","ecma"]},"application/edi-consent":{"source":"iana"},"application/edi-x12":{"source":"iana","compressible":false},"application/edifact":{"source":"iana","compressible":false},"application/efi":{"source":"iana"},"application/elm+json":{"source":"iana","charset":"UTF-8","compressible":true},"application/elm+xml":{"source":"iana","compressible":true},"application/emergencycalldata.cap+xml":{"source":"iana","charset":"UTF-8","compressible":true},"application/emergencycalldata.comment+xml":{"source":"iana","compressible":true},"application/emergencycalldata.control+xml":{"source":"iana","compressible":true},"application/emergencycalldata.deviceinfo+xml":{"source":"iana","compressible":true},"application/emergencycalldata.ecall.msd":{"source":"iana"},"application/emergencycalldata.providerinfo+xml":{"source":"iana","compressible":true},"application/emergencycalldata.serviceinfo+xml":{"source":"iana","compressible":true},"application/emergencycalldata.subscriberinfo+xml":{"source":"iana","compressible":true},"application/emergencycalldata.veds+xml":{"source":"iana","compressible":true},"application/emma+xml":{"source":"iana","compressible":true,"extensions":["emma"]},"application/emotionml+xml":{"source":"iana","compressible":true,"extensions":["emotionml"]},"application/encaprtp":{"source":"iana"},"application/epp+xml":{"source":"iana","compressible":true},"application/epub+zip":{"source":"iana","compressible":false,"extensions":["epub"]},"application/eshop":{"source":"iana"},"application/exi":{"source":"iana","extensions":["exi"]},"application/expect-ct-report+json":{"source":"iana","compressible":true},"application/express":{"source":"iana","extensions":["exp"]},"application/fastinfoset":{"source":"iana"},"application/fastsoap":{"source":"iana"},"application/fdt+xml":{"source":"iana","compressible":true,"extensions":["fdt"]},"application/fhir+json":{"source":"iana","charset":"UTF-8","compressible":true},"application/fhir+xml":{"source":"iana","charset":"UTF-8","compressible":true},"application/fido.trusted-apps+json":{"compressible":true},"application/fits":{"source":"iana"},"application/flexfec":{"source":"iana"},"application/font-sfnt":{"source":"iana"},"application/font-tdpfr":{"source":"iana","extensions":["pfr"]},"application/font-woff":{"source":"iana","compressible":false},"application/framework-attributes+xml":{"source":"iana","compressible":true},"application/geo+json":{"source":"iana","compressible":true,"extensions":["geojson"]},"application/geo+json-seq":{"source":"iana"},"application/geopackage+sqlite3":{"source":"iana"},"application/geoxacml+xml":{"source":"iana","compressible":true},"application/gltf-buffer":{"source":"iana"},"application/gml+xml":{"source":"iana","compressible":true,"extensions":["gml"]},"application/gpx+xml":{"source":"apache","compressible":true,"extensions":["gpx"]},"application/gxf":{"source":"apache","extensions":["gxf"]},"application/gzip":{"source":"iana","compressible":false,"extensions":["gz"]},"application/h224":{"source":"iana"},"application/held+xml":{"source":"iana","compressible":true},"application/hjson":{"extensions":["hjson"]},"application/http":{"source":"iana"},"application/hyperstudio":{"source":"iana","extensions":["stk"]},"application/ibe-key-request+xml":{"source":"iana","compressible":true},"application/ibe-pkg-reply+xml":{"source":"iana","compressible":true},"application/ibe-pp-data":{"source":"iana"},"application/iges":{"source":"iana"},"application/im-iscomposing+xml":{"source":"iana","charset":"UTF-8","compressible":true},"application/index":{"source":"iana"},"application/index.cmd":{"source":"iana"},"application/index.obj":{"source":"iana"},"application/index.response":{"source":"iana"},"application/index.vnd":{"source":"iana"},"application/inkml+xml":{"source":"iana","compressible":true,"extensions":["ink","inkml"]},"application/iotp":{"source":"iana"},"application/ipfix":{"source":"iana","extensions":["ipfix"]},"application/ipp":{"source":"iana"},"application/isup":{"source":"iana"},"application/its+xml":{"source":"iana","compressible":true,"extensions":["its"]},"application/java-archive":{"source":"apache","compressible":false,"extensions":["jar","war","ear"]},"application/java-serialized-object":{"source":"apache","compressible":false,"extensions":["ser"]},"application/java-vm":{"source":"apache","compressible":false,"extensions":["class"]},"application/javascript":{"source":"iana","charset":"UTF-8","compressible":true,"extensions":["js","mjs"]},"application/jf2feed+json":{"source":"iana","compressible":true},"application/jose":{"source":"iana"},"application/jose+json":{"source":"iana","compressible":true},"application/jrd+json":{"source":"iana","compressible":true},"application/jscalendar+json":{"source":"iana","compressible":true},"application/json":{"source":"iana","charset":"UTF-8","compressible":true,"extensions":["json","map"]},"application/json-patch+json":{"source":"iana","compressible":true},"application/json-seq":{"source":"iana"},"application/json5":{"extensions":["json5"]},"application/jsonml+json":{"source":"apache","compressible":true,"extensions":["jsonml"]},"application/jwk+json":{"source":"iana","compressible":true},"application/jwk-set+json":{"source":"iana","compressible":true},"application/jwt":{"source":"iana"},"application/kpml-request+xml":{"source":"iana","compressible":true},"application/kpml-response+xml":{"source":"iana","compressible":true},"application/ld+json":{"source":"iana","compressible":true,"extensions":["jsonld"]},"application/lgr+xml":{"source":"iana","compressible":true,"extensions":["lgr"]},"application/link-format":{"source":"iana"},"application/load-control+xml":{"source":"iana","compressible":true},"application/lost+xml":{"source":"iana","compressible":true,"extensions":["lostxml"]},"application/lostsync+xml":{"source":"iana","compressible":true},"application/lpf+zip":{"source":"iana","compressible":false},"application/lxf":{"source":"iana"},"application/mac-binhex40":{"source":"iana","extensions":["hqx"]},"application/mac-compactpro":{"source":"apache","extensions":["cpt"]},"application/macwriteii":{"source":"iana"},"application/mads+xml":{"source":"iana","compressible":true,"extensions":["mads"]},"application/manifest+json":{"source":"iana","charset":"UTF-8","compressible":true,"extensions":["webmanifest"]},"application/marc":{"source":"iana","extensions":["mrc"]},"application/marcxml+xml":{"source":"iana","compressible":true,"extensions":["mrcx"]},"application/mathematica":{"source":"iana","extensions":["ma","nb","mb"]},"application/mathml+xml":{"source":"iana","compressible":true,"extensions":["mathml"]},"application/mathml-content+xml":{"source":"iana","compressible":true},"application/mathml-presentation+xml":{"source":"iana","compressible":true},"application/mbms-associated-procedure-description+xml":{"source":"iana","compressible":true},"application/mbms-deregister+xml":{"source":"iana","compressible":true},"application/mbms-envelope+xml":{"source":"iana","compressible":true},"application/mbms-msk+xml":{"source":"iana","compressible":true},"application/mbms-msk-response+xml":{"source":"iana","compressible":true},"application/mbms-protection-description+xml":{"source":"iana","compressible":true},"application/mbms-reception-report+xml":{"source":"iana","compressible":true},"application/mbms-register+xml":{"source":"iana","compressible":true},"application/mbms-register-response+xml":{"source":"iana","compressible":true},"application/mbms-schedule+xml":{"source":"iana","compressible":true},"application/mbms-user-service-description+xml":{"source":"iana","compressible":true},"application/mbox":{"source":"iana","extensions":["mbox"]},"application/media-policy-dataset+xml":{"source":"iana","compressible":true,"extensions":["mpf"]},"application/media_control+xml":{"source":"iana","compressible":true},"application/mediaservercontrol+xml":{"source":"iana","compressible":true,"extensions":["mscml"]},"application/merge-patch+json":{"source":"iana","compressible":true},"application/metalink+xml":{"source":"apache","compressible":true,"extensions":["metalink"]},"application/metalink4+xml":{"source":"iana","compressible":true,"extensions":["meta4"]},"application/mets+xml":{"source":"iana","compressible":true,"extensions":["mets"]},"application/mf4":{"source":"iana"},"application/mikey":{"source":"iana"},"application/mipc":{"source":"iana"},"application/missing-blocks+cbor-seq":{"source":"iana"},"application/mmt-aei+xml":{"source":"iana","compressible":true,"extensions":["maei"]},"application/mmt-usd+xml":{"source":"iana","compressible":true,"extensions":["musd"]},"application/mods+xml":{"source":"iana","compressible":true,"extensions":["mods"]},"application/moss-keys":{"source":"iana"},"application/moss-signature":{"source":"iana"},"application/mosskey-data":{"source":"iana"},"application/mosskey-request":{"source":"iana"},"application/mp21":{"source":"iana","extensions":["m21","mp21"]},"application/mp4":{"source":"iana","extensions":["mp4s","m4p"]},"application/mpeg4-generic":{"source":"iana"},"application/mpeg4-iod":{"source":"iana"},"application/mpeg4-iod-xmt":{"source":"iana"},"application/mrb-consumer+xml":{"source":"iana","compressible":true},"application/mrb-publish+xml":{"source":"iana","compressible":true},"application/msc-ivr+xml":{"source":"iana","charset":"UTF-8","compressible":true},"application/msc-mixer+xml":{"source":"iana","charset":"UTF-8","compressible":true},"application/msword":{"source":"iana","compressible":false,"extensions":["doc","dot"]},"application/mud+json":{"source":"iana","compressible":true},"application/multipart-core":{"source":"iana"},"application/mxf":{"source":"iana","extensions":["mxf"]},"application/n-quads":{"source":"iana","extensions":["nq"]},"application/n-triples":{"source":"iana","extensions":["nt"]},"application/nasdata":{"source":"iana"},"application/news-checkgroups":{"source":"iana","charset":"US-ASCII"},"application/news-groupinfo":{"source":"iana","charset":"US-ASCII"},"application/news-transmission":{"source":"iana"},"application/nlsml+xml":{"source":"iana","compressible":true},"application/node":{"source":"iana","extensions":["cjs"]},"application/nss":{"source":"iana"},"application/oauth-authz-req+jwt":{"source":"iana"},"application/oblivious-dns-message":{"source":"iana"},"application/ocsp-request":{"source":"iana"},"application/ocsp-response":{"source":"iana"},"application/octet-stream":{"source":"iana","compressible":false,"extensions":["bin","dms","lrf","mar","so","dist","distz","pkg","bpk","dump","elc","deploy","exe","dll","deb","dmg","iso","img","msi","msp","msm","buffer"]},"application/oda":{"source":"iana","extensions":["oda"]},"application/odm+xml":{"source":"iana","compressible":true},"application/odx":{"source":"iana"},"application/oebps-package+xml":{"source":"iana","compressible":true,"extensions":["opf"]},"application/ogg":{"source":"iana","compressible":false,"extensions":["ogx"]},"application/omdoc+xml":{"source":"apache","compressible":true,"extensions":["omdoc"]},"application/onenote":{"source":"apache","extensions":["onetoc","onetoc2","onetmp","onepkg"]},"application/opc-nodeset+xml":{"source":"iana","compressible":true},"application/oscore":{"source":"iana"},"application/oxps":{"source":"iana","extensions":["oxps"]},"application/p21":{"source":"iana"},"application/p21+zip":{"source":"iana","compressible":false},"application/p2p-overlay+xml":{"source":"iana","compressible":true,"extensions":["relo"]},"application/parityfec":{"source":"iana"},"application/passport":{"source":"iana"},"application/patch-ops-error+xml":{"source":"iana","compressible":true,"extensions":["xer"]},"application/pdf":{"source":"iana","compressible":false,"extensions":["pdf"]},"application/pdx":{"source":"iana"},"application/pem-certificate-chain":{"source":"iana"},"application/pgp-encrypted":{"source":"iana","compressible":false,"extensions":["pgp"]},"application/pgp-keys":{"source":"iana","extensions":["asc"]},"application/pgp-signature":{"source":"iana","extensions":["asc","sig"]},"application/pics-rules":{"source":"apache","extensions":["prf"]},"application/pidf+xml":{"source":"iana","charset":"UTF-8","compressible":true},"application/pidf-diff+xml":{"source":"iana","charset":"UTF-8","compressible":true},"application/pkcs10":{"source":"iana","extensions":["p10"]},"application/pkcs12":{"source":"iana"},"application/pkcs7-mime":{"source":"iana","extensions":["p7m","p7c"]},"application/pkcs7-signature":{"source":"iana","extensions":["p7s"]},"application/pkcs8":{"source":"iana","extensions":["p8"]},"application/pkcs8-encrypted":{"source":"iana"},"application/pkix-attr-cert":{"source":"iana","extensions":["ac"]},"application/pkix-cert":{"source":"iana","extensions":["cer"]},"application/pkix-crl":{"source":"iana","extensions":["crl"]},"application/pkix-pkipath":{"source":"iana","extensions":["pkipath"]},"application/pkixcmp":{"source":"iana","extensions":["pki"]},"application/pls+xml":{"source":"iana","compressible":true,"extensions":["pls"]},"application/poc-settings+xml":{"source":"iana","charset":"UTF-8","compressible":true},"application/postscript":{"source":"iana","compressible":true,"extensions":["ai","eps","ps"]},"application/ppsp-tracker+json":{"source":"iana","compressible":true},"application/problem+json":{"source":"iana","compressible":true},"application/problem+xml":{"source":"iana","compressible":true},"application/provenance+xml":{"source":"iana","compressible":true,"extensions":["provx"]},"application/prs.alvestrand.titrax-sheet":{"source":"iana"},"application/prs.cww":{"source":"iana","extensions":["cww"]},"application/prs.cyn":{"source":"iana","charset":"7-BIT"},"application/prs.hpub+zip":{"source":"iana","compressible":false},"application/prs.nprend":{"source":"iana"},"application/prs.plucker":{"source":"iana"},"application/prs.rdf-xml-crypt":{"source":"iana"},"application/prs.xsf+xml":{"source":"iana","compressible":true},"application/pskc+xml":{"source":"iana","compressible":true,"extensions":["pskcxml"]},"application/pvd+json":{"source":"iana","compressible":true},"application/qsig":{"source":"iana"},"application/raml+yaml":{"compressible":true,"extensions":["raml"]},"application/raptorfec":{"source":"iana"},"application/rdap+json":{"source":"iana","compressible":true},"application/rdf+xml":{"source":"iana","compressible":true,"extensions":["rdf","owl"]},"application/reginfo+xml":{"source":"iana","compressible":true,"extensions":["rif"]},"application/relax-ng-compact-syntax":{"source":"iana","extensions":["rnc"]},"application/remote-printing":{"source":"iana"},"application/reputon+json":{"source":"iana","compressible":true},"application/resource-lists+xml":{"source":"iana","compressible":true,"extensions":["rl"]},"application/resource-lists-diff+xml":{"source":"iana","compressible":true,"extensions":["rld"]},"application/rfc+xml":{"source":"iana","compressible":true},"application/riscos":{"source":"iana"},"application/rlmi+xml":{"source":"iana","compressible":true},"application/rls-services+xml":{"source":"iana","compressible":true,"extensions":["rs"]},"application/route-apd+xml":{"source":"iana","compressible":true,"extensions":["rapd"]},"application/route-s-tsid+xml":{"source":"iana","compressible":true,"extensions":["sls"]},"application/route-usd+xml":{"source":"iana","compressible":true,"extensions":["rusd"]},"application/rpki-ghostbusters":{"source":"iana","extensions":["gbr"]},"application/rpki-manifest":{"source":"iana","extensions":["mft"]},"application/rpki-publication":{"source":"iana"},"application/rpki-roa":{"source":"iana","extensions":["roa"]},"application/rpki-updown":{"source":"iana"},"application/rsd+xml":{"source":"apache","compressible":true,"extensions":["rsd"]},"application/rss+xml":{"source":"apache","compressible":true,"extensions":["rss"]},"application/rtf":{"source":"iana","compressible":true,"extensions":["rtf"]},"application/rtploopback":{"source":"iana"},"application/rtx":{"source":"iana"},"application/samlassertion+xml":{"source":"iana","compressible":true},"application/samlmetadata+xml":{"source":"iana","compressible":true},"application/sarif+json":{"source":"iana","compressible":true},"application/sarif-external-properties+json":{"source":"iana","compressible":true},"application/sbe":{"source":"iana"},"application/sbml+xml":{"source":"iana","compressible":true,"extensions":["sbml"]},"application/scaip+xml":{"source":"iana","compressible":true},"application/scim+json":{"source":"iana","compressible":true},"application/scvp-cv-request":{"source":"iana","extensions":["scq"]},"application/scvp-cv-response":{"source":"iana","extensions":["scs"]},"application/scvp-vp-request":{"source":"iana","extensions":["spq"]},"application/scvp-vp-response":{"source":"iana","extensions":["spp"]},"application/sdp":{"source":"iana","extensions":["sdp"]},"application/secevent+jwt":{"source":"iana"},"application/senml+cbor":{"source":"iana"},"application/senml+json":{"source":"iana","compressible":true},"application/senml+xml":{"source":"iana","compressible":true,"extensions":["senmlx"]},"application/senml-etch+cbor":{"source":"iana"},"application/senml-etch+json":{"source":"iana","compressible":true},"application/senml-exi":{"source":"iana"},"application/sensml+cbor":{"source":"iana"},"application/sensml+json":{"source":"iana","compressible":true},"application/sensml+xml":{"source":"iana","compressible":true,"extensions":["sensmlx"]},"application/sensml-exi":{"source":"iana"},"application/sep+xml":{"source":"iana","compressible":true},"application/sep-exi":{"source":"iana"},"application/session-info":{"source":"iana"},"application/set-payment":{"source":"iana"},"application/set-payment-initiation":{"source":"iana","extensions":["setpay"]},"application/set-registration":{"source":"iana"},"application/set-registration-initiation":{"source":"iana","extensions":["setreg"]},"application/sgml":{"source":"iana"},"application/sgml-open-catalog":{"source":"iana"},"application/shf+xml":{"source":"iana","compressible":true,"extensions":["shf"]},"application/sieve":{"source":"iana","extensions":["siv","sieve"]},"application/simple-filter+xml":{"source":"iana","compressible":true},"application/simple-message-summary":{"source":"iana"},"application/simplesymbolcontainer":{"source":"iana"},"application/sipc":{"source":"iana"},"application/slate":{"source":"iana"},"application/smil":{"source":"iana"},"application/smil+xml":{"source":"iana","compressible":true,"extensions":["smi","smil"]},"application/smpte336m":{"source":"iana"},"application/soap+fastinfoset":{"source":"iana"},"application/soap+xml":{"source":"iana","compressible":true},"application/sparql-query":{"source":"iana","extensions":["rq"]},"application/sparql-results+xml":{"source":"iana","compressible":true,"extensions":["srx"]},"application/spdx+json":{"source":"iana","compressible":true},"application/spirits-event+xml":{"source":"iana","compressible":true},"application/sql":{"source":"iana"},"application/srgs":{"source":"iana","extensions":["gram"]},"application/srgs+xml":{"source":"iana","compressible":true,"extensions":["grxml"]},"application/sru+xml":{"source":"iana","compressible":true,"extensions":["sru"]},"application/ssdl+xml":{"source":"apache","compressible":true,"extensions":["ssdl"]},"application/ssml+xml":{"source":"iana","compressible":true,"extensions":["ssml"]},"application/stix+json":{"source":"iana","compressible":true},"application/swid+xml":{"source":"iana","compressible":true,"extensions":["swidtag"]},"application/tamp-apex-update":{"source":"iana"},"application/tamp-apex-update-confirm":{"source":"iana"},"application/tamp-community-update":{"source":"iana"},"application/tamp-community-update-confirm":{"source":"iana"},"application/tamp-error":{"source":"iana"},"application/tamp-sequence-adjust":{"source":"iana"},"application/tamp-sequence-adjust-confirm":{"source":"iana"},"application/tamp-status-query":{"source":"iana"},"application/tamp-status-response":{"source":"iana"},"application/tamp-update":{"source":"iana"},"application/tamp-update-confirm":{"source":"iana"},"application/tar":{"compressible":true},"application/taxii+json":{"source":"iana","compressible":true},"application/td+json":{"source":"iana","compressible":true},"application/tei+xml":{"source":"iana","compressible":true,"extensions":["tei","teicorpus"]},"application/tetra_isi":{"source":"iana"},"application/thraud+xml":{"source":"iana","compressible":true,"extensions":["tfi"]},"application/timestamp-query":{"source":"iana"},"application/timestamp-reply":{"source":"iana"},"application/timestamped-data":{"source":"iana","extensions":["tsd"]},"application/tlsrpt+gzip":{"source":"iana"},"application/tlsrpt+json":{"source":"iana","compressible":true},"application/tnauthlist":{"source":"iana"},"application/token-introspection+jwt":{"source":"iana"},"application/toml":{"compressible":true,"extensions":["toml"]},"application/trickle-ice-sdpfrag":{"source":"iana"},"application/trig":{"source":"iana","extensions":["trig"]},"application/ttml+xml":{"source":"iana","compressible":true,"extensions":["ttml"]},"application/tve-trigger":{"source":"iana"},"application/tzif":{"source":"iana"},"application/tzif-leap":{"source":"iana"},"application/ubjson":{"compressible":false,"extensions":["ubj"]},"application/ulpfec":{"source":"iana"},"application/urc-grpsheet+xml":{"source":"iana","compressible":true},"application/urc-ressheet+xml":{"source":"iana","compressible":true,"extensions":["rsheet"]},"application/urc-targetdesc+xml":{"source":"iana","compressible":true,"extensions":["td"]},"application/urc-uisocketdesc+xml":{"source":"iana","compressible":true},"application/vcard+json":{"source":"iana","compressible":true},"application/vcard+xml":{"source":"iana","compressible":true},"application/vemmi":{"source":"iana"},"application/vividence.scriptfile":{"source":"apache"},"application/vnd.1000minds.decision-model+xml":{"source":"iana","compressible":true,"extensions":["1km"]},"application/vnd.3gpp-prose+xml":{"source":"iana","compressible":true},"application/vnd.3gpp-prose-pc3ch+xml":{"source":"iana","compressible":true},"application/vnd.3gpp-v2x-local-service-information":{"source":"iana"},"application/vnd.3gpp.5gnas":{"source":"iana"},"application/vnd.3gpp.access-transfer-events+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.bsf+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.gmop+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.gtpc":{"source":"iana"},"application/vnd.3gpp.interworking-data":{"source":"iana"},"application/vnd.3gpp.lpp":{"source":"iana"},"application/vnd.3gpp.mc-signalling-ear":{"source":"iana"},"application/vnd.3gpp.mcdata-affiliation-command+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.mcdata-info+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.mcdata-payload":{"source":"iana"},"application/vnd.3gpp.mcdata-service-config+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.mcdata-signalling":{"source":"iana"},"application/vnd.3gpp.mcdata-ue-config+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.mcdata-user-profile+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.mcptt-affiliation-command+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.mcptt-floor-request+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.mcptt-info+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.mcptt-location-info+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.mcptt-mbms-usage-info+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.mcptt-service-config+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.mcptt-signed+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.mcptt-ue-config+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.mcptt-ue-init-config+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.mcptt-user-profile+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.mcvideo-affiliation-command+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.mcvideo-affiliation-info+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.mcvideo-info+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.mcvideo-location-info+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.mcvideo-mbms-usage-info+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.mcvideo-service-config+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.mcvideo-transmission-request+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.mcvideo-ue-config+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.mcvideo-user-profile+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.mid-call+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.ngap":{"source":"iana"},"application/vnd.3gpp.pfcp":{"source":"iana"},"application/vnd.3gpp.pic-bw-large":{"source":"iana","extensions":["plb"]},"application/vnd.3gpp.pic-bw-small":{"source":"iana","extensions":["psb"]},"application/vnd.3gpp.pic-bw-var":{"source":"iana","extensions":["pvb"]},"application/vnd.3gpp.s1ap":{"source":"iana"},"application/vnd.3gpp.sms":{"source":"iana"},"application/vnd.3gpp.sms+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.srvcc-ext+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.srvcc-info+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.state-and-event-info+xml":{"source":"iana","compressible":true},"application/vnd.3gpp.ussd+xml":{"source":"iana","compressible":true},"application/vnd.3gpp2.bcmcsinfo+xml":{"source":"iana","compressible":true},"application/vnd.3gpp2.sms":{"source":"iana"},"application/vnd.3gpp2.tcap":{"source":"iana","extensions":["tcap"]},"application/vnd.3lightssoftware.imagescal":{"source":"iana"},"application/vnd.3m.post-it-notes":{"source":"iana","extensions":["pwn"]},"application/vnd.accpac.simply.aso":{"source":"iana","extensions":["aso"]},"application/vnd.accpac.simply.imp":{"source":"iana","extensions":["imp"]},"application/vnd.acucobol":{"source":"iana","extensions":["acu"]},"application/vnd.acucorp":{"source":"iana","extensions":["atc","acutc"]},"application/vnd.adobe.air-application-installer-package+zip":{"source":"apache","compressible":false,"extensions":["air"]},"application/vnd.adobe.flash.movie":{"source":"iana"},"application/vnd.adobe.formscentral.fcdt":{"source":"iana","extensions":["fcdt"]},"application/vnd.adobe.fxp":{"source":"iana","extensions":["fxp","fxpl"]},"application/vnd.adobe.partial-upload":{"source":"iana"},"application/vnd.adobe.xdp+xml":{"source":"iana","compressible":true,"extensions":["xdp"]},"application/vnd.adobe.xfdf":{"source":"iana","extensions":["xfdf"]},"application/vnd.aether.imp":{"source":"iana"},"application/vnd.afpc.afplinedata":{"source":"iana"},"application/vnd.afpc.afplinedata-pagedef":{"source":"iana"},"application/vnd.afpc.cmoca-cmresource":{"source":"iana"},"application/vnd.afpc.foca-charset":{"source":"iana"},"application/vnd.afpc.foca-codedfont":{"source":"iana"},"application/vnd.afpc.foca-codepage":{"source":"iana"},"application/vnd.afpc.modca":{"source":"iana"},"application/vnd.afpc.modca-cmtable":{"source":"iana"},"application/vnd.afpc.modca-formdef":{"source":"iana"},"application/vnd.afpc.modca-mediummap":{"source":"iana"},"application/vnd.afpc.modca-objectcontainer":{"source":"iana"},"application/vnd.afpc.modca-overlay":{"source":"iana"},"application/vnd.afpc.modca-pagesegment":{"source":"iana"},"application/vnd.age":{"source":"iana","extensions":["age"]},"application/vnd.ah-barcode":{"source":"iana"},"application/vnd.ahead.space":{"source":"iana","extensions":["ahead"]},"application/vnd.airzip.filesecure.azf":{"source":"iana","extensions":["azf"]},"application/vnd.airzip.filesecure.azs":{"source":"iana","extensions":["azs"]},"application/vnd.amadeus+json":{"source":"iana","compressible":true},"application/vnd.amazon.ebook":{"source":"apache","extensions":["azw"]},"application/vnd.amazon.mobi8-ebook":{"source":"iana"},"application/vnd.americandynamics.acc":{"source":"iana","extensions":["acc"]},"application/vnd.amiga.ami":{"source":"iana","extensions":["ami"]},"application/vnd.amundsen.maze+xml":{"source":"iana","compressible":true},"application/vnd.android.ota":{"source":"iana"},"application/vnd.android.package-archive":{"source":"apache","compressible":false,"extensions":["apk"]},"application/vnd.anki":{"source":"iana"},"application/vnd.anser-web-certificate-issue-initiation":{"source":"iana","extensions":["cii"]},"application/vnd.anser-web-funds-transfer-initiation":{"source":"apache","extensions":["fti"]},"application/vnd.antix.game-component":{"source":"iana","extensions":["atx"]},"application/vnd.apache.arrow.file":{"source":"iana"},"application/vnd.apache.arrow.stream":{"source":"iana"},"application/vnd.apache.thrift.binary":{"source":"iana"},"application/vnd.apache.thrift.compact":{"source":"iana"},"application/vnd.apache.thrift.json":{"source":"iana"},"application/vnd.api+json":{"source":"iana","compressible":true},"application/vnd.aplextor.warrp+json":{"source":"iana","compressible":true},"application/vnd.apothekende.reservation+json":{"source":"iana","compressible":true},"application/vnd.apple.installer+xml":{"source":"iana","compressible":true,"extensions":["mpkg"]},"application/vnd.apple.keynote":{"source":"iana","extensions":["key"]},"application/vnd.apple.mpegurl":{"source":"iana","extensions":["m3u8"]},"application/vnd.apple.numbers":{"source":"iana","extensions":["numbers"]},"application/vnd.apple.pages":{"source":"iana","extensions":["pages"]},"application/vnd.apple.pkpass":{"compressible":false,"extensions":["pkpass"]},"application/vnd.arastra.swi":{"source":"iana"},"application/vnd.aristanetworks.swi":{"source":"iana","extensions":["swi"]},"application/vnd.artisan+json":{"source":"iana","compressible":true},"application/vnd.artsquare":{"source":"iana"},"application/vnd.astraea-software.iota":{"source":"iana","extensions":["iota"]},"application/vnd.audiograph":{"source":"iana","extensions":["aep"]},"application/vnd.autopackage":{"source":"iana"},"application/vnd.avalon+json":{"source":"iana","compressible":true},"application/vnd.avistar+xml":{"source":"iana","compressible":true},"application/vnd.balsamiq.bmml+xml":{"source":"iana","compressible":true,"extensions":["bmml"]},"application/vnd.balsamiq.bmpr":{"source":"iana"},"application/vnd.banana-accounting":{"source":"iana"},"application/vnd.bbf.usp.error":{"source":"iana"},"application/vnd.bbf.usp.msg":{"source":"iana"},"application/vnd.bbf.usp.msg+json":{"source":"iana","compressible":true},"application/vnd.bekitzur-stech+json":{"source":"iana","compressible":true},"application/vnd.bint.med-content":{"source":"iana"},"application/vnd.biopax.rdf+xml":{"source":"iana","compressible":true},"application/vnd.blink-idb-value-wrapper":{"source":"iana"},"application/vnd.blueice.multipass":{"source":"iana","extensions":["mpm"]},"application/vnd.bluetooth.ep.oob":{"source":"iana"},"application/vnd.bluetooth.le.oob":{"source":"iana"},"application/vnd.bmi":{"source":"iana","extensions":["bmi"]},"application/vnd.bpf":{"source":"iana"},"application/vnd.bpf3":{"source":"iana"},"application/vnd.businessobjects":{"source":"iana","extensions":["rep"]},"application/vnd.byu.uapi+json":{"source":"iana","compressible":true},"application/vnd.cab-jscript":{"source":"iana"},"application/vnd.canon-cpdl":{"source":"iana"},"application/vnd.canon-lips":{"source":"iana"},"application/vnd.capasystems-pg+json":{"source":"iana","compressible":true},"application/vnd.cendio.thinlinc.clientconf":{"source":"iana"},"application/vnd.century-systems.tcp_stream":{"source":"iana"},"application/vnd.chemdraw+xml":{"source":"iana","compressible":true,"extensions":["cdxml"]},"application/vnd.chess-pgn":{"source":"iana"},"application/vnd.chipnuts.karaoke-mmd":{"source":"iana","extensions":["mmd"]},"application/vnd.ciedi":{"source":"iana"},"application/vnd.cinderella":{"source":"iana","extensions":["cdy"]},"application/vnd.cirpack.isdn-ext":{"source":"iana"},"application/vnd.citationstyles.style+xml":{"source":"iana","compressible":true,"extensions":["csl"]},"application/vnd.claymore":{"source":"iana","extensions":["cla"]},"application/vnd.cloanto.rp9":{"source":"iana","extensions":["rp9"]},"application/vnd.clonk.c4group":{"source":"iana","extensions":["c4g","c4d","c4f","c4p","c4u"]},"application/vnd.cluetrust.cartomobile-config":{"source":"iana","extensions":["c11amc"]},"application/vnd.cluetrust.cartomobile-config-pkg":{"source":"iana","extensions":["c11amz"]},"application/vnd.coffeescript":{"source":"iana"},"application/vnd.collabio.xodocuments.document":{"source":"iana"},"application/vnd.collabio.xodocuments.document-template":{"source":"iana"},"application/vnd.collabio.xodocuments.presentation":{"source":"iana"},"application/vnd.collabio.xodocuments.presentation-template":{"source":"iana"},"application/vnd.collabio.xodocuments.spreadsheet":{"source":"iana"},"application/vnd.collabio.xodocuments.spreadsheet-template":{"source":"iana"},"application/vnd.collection+json":{"source":"iana","compressible":true},"application/vnd.collection.doc+json":{"source":"iana","compressible":true},"application/vnd.collection.next+json":{"source":"iana","compressible":true},"application/vnd.comicbook+zip":{"source":"iana","compressible":false},"application/vnd.comicbook-rar":{"source":"iana"},"application/vnd.commerce-battelle":{"source":"iana"},"application/vnd.commonspace":{"source":"iana","extensions":["csp"]},"application/vnd.contact.cmsg":{"source":"iana","extensions":["cdbcmsg"]},"application/vnd.coreos.ignition+json":{"source":"iana","compressible":true},"application/vnd.cosmocaller":{"source":"iana","extensions":["cmc"]},"application/vnd.crick.clicker":{"source":"iana","extensions":["clkx"]},"application/vnd.crick.clicker.keyboard":{"source":"iana","extensions":["clkk"]},"application/vnd.crick.clicker.palette":{"source":"iana","extensions":["clkp"]},"application/vnd.crick.clicker.template":{"source":"iana","extensions":["clkt"]},"application/vnd.crick.clicker.wordbank":{"source":"iana","extensions":["clkw"]},"application/vnd.criticaltools.wbs+xml":{"source":"iana","compressible":true,"extensions":["wbs"]},"application/vnd.cryptii.pipe+json":{"source":"iana","compressible":true},"application/vnd.crypto-shade-file":{"source":"iana"},"application/vnd.cryptomator.encrypted":{"source":"iana"},"application/vnd.cryptomator.vault":{"source":"iana"},"application/vnd.ctc-posml":{"source":"iana","extensions":["pml"]},"application/vnd.ctct.ws+xml":{"source":"iana","compressible":true},"application/vnd.cups-pdf":{"source":"iana"},"application/vnd.cups-postscript":{"source":"iana"},"application/vnd.cups-ppd":{"source":"iana","extensions":["ppd"]},"application/vnd.cups-raster":{"source":"iana"},"application/vnd.cups-raw":{"source":"iana"},"application/vnd.curl":{"source":"iana"},"application/vnd.curl.car":{"source":"apache","extensions":["car"]},"application/vnd.curl.pcurl":{"source":"apache","extensions":["pcurl"]},"application/vnd.cyan.dean.root+xml":{"source":"iana","compressible":true},"application/vnd.cybank":{"source":"iana"},"application/vnd.cyclonedx+json":{"source":"iana","compressible":true},"application/vnd.cyclonedx+xml":{"source":"iana","compressible":true},"application/vnd.d2l.coursepackage1p0+zip":{"source":"iana","compressible":false},"application/vnd.d3m-dataset":{"source":"iana"},"application/vnd.d3m-problem":{"source":"iana"},"application/vnd.dart":{"source":"iana","compressible":true,"extensions":["dart"]},"application/vnd.data-vision.rdz":{"source":"iana","extensions":["rdz"]},"application/vnd.datapackage+json":{"source":"iana","compressible":true},"application/vnd.dataresource+json":{"source":"iana","compressible":true},"application/vnd.dbf":{"source":"iana","extensions":["dbf"]},"application/vnd.debian.binary-package":{"source":"iana"},"application/vnd.dece.data":{"source":"iana","extensions":["uvf","uvvf","uvd","uvvd"]},"application/vnd.dece.ttml+xml":{"source":"iana","compressible":true,"extensions":["uvt","uvvt"]},"application/vnd.dece.unspecified":{"source":"iana","extensions":["uvx","uvvx"]},"application/vnd.dece.zip":{"source":"iana","extensions":["uvz","uvvz"]},"application/vnd.denovo.fcselayout-link":{"source":"iana","extensions":["fe_launch"]},"application/vnd.desmume.movie":{"source":"iana"},"application/vnd.dir-bi.plate-dl-nosuffix":{"source":"iana"},"application/vnd.dm.delegation+xml":{"source":"iana","compressible":true},"application/vnd.dna":{"source":"iana","extensions":["dna"]},"application/vnd.document+json":{"source":"iana","compressible":true},"application/vnd.dolby.mlp":{"source":"apache","extensions":["mlp"]},"application/vnd.dolby.mobile.1":{"source":"iana"},"application/vnd.dolby.mobile.2":{"source":"iana"},"application/vnd.doremir.scorecloud-binary-document":{"source":"iana"},"application/vnd.dpgraph":{"source":"iana","extensions":["dpg"]},"application/vnd.dreamfactory":{"source":"iana","extensions":["dfac"]},"application/vnd.drive+json":{"source":"iana","compressible":true},"application/vnd.ds-keypoint":{"source":"apache","extensions":["kpxx"]},"application/vnd.dtg.local":{"source":"iana"},"application/vnd.dtg.local.flash":{"source":"iana"},"application/vnd.dtg.local.html":{"source":"iana"},"application/vnd.dvb.ait":{"source":"iana","extensions":["ait"]},"application/vnd.dvb.dvbisl+xml":{"source":"iana","compressible":true},"application/vnd.dvb.dvbj":{"source":"iana"},"application/vnd.dvb.esgcontainer":{"source":"iana"},"application/vnd.dvb.ipdcdftnotifaccess":{"source":"iana"},"application/vnd.dvb.ipdcesgaccess":{"source":"iana"},"application/vnd.dvb.ipdcesgaccess2":{"source":"iana"},"application/vnd.dvb.ipdcesgpdd":{"source":"iana"},"application/vnd.dvb.ipdcroaming":{"source":"iana"},"application/vnd.dvb.iptv.alfec-base":{"source":"iana"},"application/vnd.dvb.iptv.alfec-enhancement":{"source":"iana"},"application/vnd.dvb.notif-aggregate-root+xml":{"source":"iana","compressible":true},"application/vnd.dvb.notif-container+xml":{"source":"iana","compressible":true},"application/vnd.dvb.notif-generic+xml":{"source":"iana","compressible":true},"application/vnd.dvb.notif-ia-msglist+xml":{"source":"iana","compressible":true},"application/vnd.dvb.notif-ia-registration-request+xml":{"source":"iana","compressible":true},"application/vnd.dvb.notif-ia-registration-response+xml":{"source":"iana","compressible":true},"application/vnd.dvb.notif-init+xml":{"source":"iana","compressible":true},"application/vnd.dvb.pfr":{"source":"iana"},"application/vnd.dvb.service":{"source":"iana","extensions":["svc"]},"application/vnd.dxr":{"source":"iana"},"application/vnd.dynageo":{"source":"iana","extensions":["geo"]},"application/vnd.dzr":{"source":"iana"},"application/vnd.easykaraoke.cdgdownload":{"source":"iana"},"application/vnd.ecdis-update":{"source":"iana"},"application/vnd.ecip.rlp":{"source":"iana"},"application/vnd.eclipse.ditto+json":{"source":"iana","compressible":true},"application/vnd.ecowin.chart":{"source":"iana","extensions":["mag"]},"application/vnd.ecowin.filerequest":{"source":"iana"},"application/vnd.ecowin.fileupdate":{"source":"iana"},"application/vnd.ecowin.series":{"source":"iana"},"application/vnd.ecowin.seriesrequest":{"source":"iana"},"application/vnd.ecowin.seriesupdate":{"source":"iana"},"application/vnd.efi.img":{"source":"iana"},"application/vnd.efi.iso":{"source":"iana"},"application/vnd.emclient.accessrequest+xml":{"source":"iana","compressible":true},"application/vnd.enliven":{"source":"iana","extensions":["nml"]},"application/vnd.enphase.envoy":{"source":"iana"},"application/vnd.eprints.data+xml":{"source":"iana","compressible":true},"application/vnd.epson.esf":{"source":"iana","extensions":["esf"]},"application/vnd.epson.msf":{"source":"iana","extensions":["msf"]},"application/vnd.epson.quickanime":{"source":"iana","extensions":["qam"]},"application/vnd.epson.salt":{"source":"iana","extensions":["slt"]},"application/vnd.epson.ssf":{"source":"iana","extensions":["ssf"]},"application/vnd.ericsson.quickcall":{"source":"iana"},"application/vnd.espass-espass+zip":{"source":"iana","compressible":false},"application/vnd.eszigno3+xml":{"source":"iana","compressible":true,"extensions":["es3","et3"]},"application/vnd.etsi.aoc+xml":{"source":"iana","compressible":true},"application/vnd.etsi.asic-e+zip":{"source":"iana","compressible":false},"application/vnd.etsi.asic-s+zip":{"source":"iana","compressible":false},"application/vnd.etsi.cug+xml":{"source":"iana","compressible":true},"application/vnd.etsi.iptvcommand+xml":{"source":"iana","compressible":true},"application/vnd.etsi.iptvdiscovery+xml":{"source":"iana","compressible":true},"application/vnd.etsi.iptvprofile+xml":{"source":"iana","compressible":true},"application/vnd.etsi.iptvsad-bc+xml":{"source":"iana","compressible":true},"application/vnd.etsi.iptvsad-cod+xml":{"source":"iana","compressible":true},"application/vnd.etsi.iptvsad-npvr+xml":{"source":"iana","compressible":true},"application/vnd.etsi.iptvservice+xml":{"source":"iana","compressible":true},"application/vnd.etsi.iptvsync+xml":{"source":"iana","compressible":true},"application/vnd.etsi.iptvueprofile+xml":{"source":"iana","compressible":true},"application/vnd.etsi.mcid+xml":{"source":"iana","compressible":true},"application/vnd.etsi.mheg5":{"source":"iana"},"application/vnd.etsi.overload-control-policy-dataset+xml":{"source":"iana","compressible":true},"application/vnd.etsi.pstn+xml":{"source":"iana","compressible":true},"application/vnd.etsi.sci+xml":{"source":"iana","compressible":true},"application/vnd.etsi.simservs+xml":{"source":"iana","compressible":true},"application/vnd.etsi.timestamp-token":{"source":"iana"},"application/vnd.etsi.tsl+xml":{"source":"iana","compressible":true},"application/vnd.etsi.tsl.der":{"source":"iana"},"application/vnd.eu.kasparian.car+json":{"source":"iana","compressible":true},"application/vnd.eudora.data":{"source":"iana"},"application/vnd.evolv.ecig.profile":{"source":"iana"},"application/vnd.evolv.ecig.settings":{"source":"iana"},"application/vnd.evolv.ecig.theme":{"source":"iana"},"application/vnd.exstream-empower+zip":{"source":"iana","compressible":false},"application/vnd.exstream-package":{"source":"iana"},"application/vnd.ezpix-album":{"source":"iana","extensions":["ez2"]},"application/vnd.ezpix-package":{"source":"iana","extensions":["ez3"]},"application/vnd.f-secure.mobile":{"source":"iana"},"application/vnd.familysearch.gedcom+zip":{"source":"iana","compressible":false},"application/vnd.fastcopy-disk-image":{"source":"iana"},"application/vnd.fdf":{"source":"iana","extensions":["fdf"]},"application/vnd.fdsn.mseed":{"source":"iana","extensions":["mseed"]},"application/vnd.fdsn.seed":{"source":"iana","extensions":["seed","dataless"]},"application/vnd.ffsns":{"source":"iana"},"application/vnd.ficlab.flb+zip":{"source":"iana","compressible":false},"application/vnd.filmit.zfc":{"source":"iana"},"application/vnd.fints":{"source":"iana"},"application/vnd.firemonkeys.cloudcell":{"source":"iana"},"application/vnd.flographit":{"source":"iana","extensions":["gph"]},"application/vnd.fluxtime.clip":{"source":"iana","extensions":["ftc"]},"application/vnd.font-fontforge-sfd":{"source":"iana"},"application/vnd.framemaker":{"source":"iana","extensions":["fm","frame","maker","book"]},"application/vnd.frogans.fnc":{"source":"iana","extensions":["fnc"]},"application/vnd.frogans.ltf":{"source":"iana","extensions":["ltf"]},"application/vnd.fsc.weblaunch":{"source":"iana","extensions":["fsc"]},"application/vnd.fujifilm.fb.docuworks":{"source":"iana"},"application/vnd.fujifilm.fb.docuworks.binder":{"source":"iana"},"application/vnd.fujifilm.fb.docuworks.container":{"source":"iana"},"application/vnd.fujifilm.fb.jfi+xml":{"source":"iana","compressible":true},"application/vnd.fujitsu.oasys":{"source":"iana","extensions":["oas"]},"application/vnd.fujitsu.oasys2":{"source":"iana","extensions":["oa2"]},"application/vnd.fujitsu.oasys3":{"source":"iana","extensions":["oa3"]},"application/vnd.fujitsu.oasysgp":{"source":"iana","extensions":["fg5"]},"application/vnd.fujitsu.oasysprs":{"source":"iana","extensions":["bh2"]},"application/vnd.fujixerox.art-ex":{"source":"iana"},"application/vnd.fujixerox.art4":{"source":"iana"},"application/vnd.fujixerox.ddd":{"source":"iana","extensions":["ddd"]},"application/vnd.fujixerox.docuworks":{"source":"iana","extensions":["xdw"]},"application/vnd.fujixerox.docuworks.binder":{"source":"iana","extensions":["xbd"]},"application/vnd.fujixerox.docuworks.container":{"source":"iana"},"application/vnd.fujixerox.hbpl":{"source":"iana"},"application/vnd.fut-misnet":{"source":"iana"},"application/vnd.futoin+cbor":{"source":"iana"},"application/vnd.futoin+json":{"source":"iana","compressible":true},"application/vnd.fuzzysheet":{"source":"iana","extensions":["fzs"]},"application/vnd.genomatix.tuxedo":{"source":"iana","extensions":["txd"]},"application/vnd.gentics.grd+json":{"source":"iana","compressible":true},"application/vnd.geo+json":{"source":"iana","compressible":true},"application/vnd.geocube+xml":{"source":"iana","compressible":true},"application/vnd.geogebra.file":{"source":"iana","extensions":["ggb"]},"application/vnd.geogebra.slides":{"source":"iana"},"application/vnd.geogebra.tool":{"source":"iana","extensions":["ggt"]},"application/vnd.geometry-explorer":{"source":"iana","extensions":["gex","gre"]},"application/vnd.geonext":{"source":"iana","extensions":["gxt"]},"application/vnd.geoplan":{"source":"iana","extensions":["g2w"]},"application/vnd.geospace":{"source":"iana","extensions":["g3w"]},"application/vnd.gerber":{"source":"iana"},"application/vnd.globalplatform.card-content-mgt":{"source":"iana"},"application/vnd.globalplatform.card-content-mgt-response":{"source":"iana"},"application/vnd.gmx":{"source":"iana","extensions":["gmx"]},"application/vnd.google-apps.document":{"compressible":false,"extensions":["gdoc"]},"application/vnd.google-apps.presentation":{"compressible":false,"extensions":["gslides"]},"application/vnd.google-apps.spreadsheet":{"compressible":false,"extensions":["gsheet"]},"application/vnd.google-earth.kml+xml":{"source":"iana","compressible":true,"extensions":["kml"]},"application/vnd.google-earth.kmz":{"source":"iana","compressible":false,"extensions":["kmz"]},"application/vnd.gov.sk.e-form+xml":{"source":"iana","compressible":true},"application/vnd.gov.sk.e-form+zip":{"source":"iana","compressible":false},"application/vnd.gov.sk.xmldatacontainer+xml":{"source":"iana","compressible":true},"application/vnd.grafeq":{"source":"iana","extensions":["gqf","gqs"]},"application/vnd.gridmp":{"source":"iana"},"application/vnd.groove-account":{"source":"iana","extensions":["gac"]},"application/vnd.groove-help":{"source":"iana","extensions":["ghf"]},"application/vnd.groove-identity-message":{"source":"iana","extensions":["gim"]},"application/vnd.groove-injector":{"source":"iana","extensions":["grv"]},"application/vnd.groove-tool-message":{"source":"iana","extensions":["gtm"]},"application/vnd.groove-tool-template":{"source":"iana","extensions":["tpl"]},"application/vnd.groove-vcard":{"source":"iana","extensions":["vcg"]},"application/vnd.hal+json":{"source":"iana","compressible":true},"application/vnd.hal+xml":{"source":"iana","compressible":true,"extensions":["hal"]},"application/vnd.handheld-entertainment+xml":{"source":"iana","compressible":true,"extensions":["zmm"]},"application/vnd.hbci":{"source":"iana","extensions":["hbci"]},"application/vnd.hc+json":{"source":"iana","compressible":true},"application/vnd.hcl-bireports":{"source":"iana"},"application/vnd.hdt":{"source":"iana"},"application/vnd.heroku+json":{"source":"iana","compressible":true},"application/vnd.hhe.lesson-player":{"source":"iana","extensions":["les"]},"application/vnd.hl7cda+xml":{"source":"iana","charset":"UTF-8","compressible":true},"application/vnd.hl7v2+xml":{"source":"iana","charset":"UTF-8","compressible":true},"application/vnd.hp-hpgl":{"source":"iana","extensions":["hpgl"]},"application/vnd.hp-hpid":{"source":"iana","extensions":["hpid"]},"application/vnd.hp-hps":{"source":"iana","extensions":["hps"]},"application/vnd.hp-jlyt":{"source":"iana","extensions":["jlt"]},"application/vnd.hp-pcl":{"source":"iana","extensions":["pcl"]},"application/vnd.hp-pclxl":{"source":"iana","extensions":["pclxl"]},"application/vnd.httphone":{"source":"iana"},"application/vnd.hydrostatix.sof-data":{"source":"iana","extensions":["sfd-hdstx"]},"application/vnd.hyper+json":{"source":"iana","compressible":true},"application/vnd.hyper-item+json":{"source":"iana","compressible":true},"application/vnd.hyperdrive+json":{"source":"iana","compressible":true},"application/vnd.hzn-3d-crossword":{"source":"iana"},"application/vnd.ibm.afplinedata":{"source":"iana"},"application/vnd.ibm.electronic-media":{"source":"iana"},"application/vnd.ibm.minipay":{"source":"iana","extensions":["mpy"]},"application/vnd.ibm.modcap":{"source":"iana","extensions":["afp","listafp","list3820"]},"application/vnd.ibm.rights-management":{"source":"iana","extensions":["irm"]},"application/vnd.ibm.secure-container":{"source":"iana","extensions":["sc"]},"application/vnd.iccprofile":{"source":"iana","extensions":["icc","icm"]},"application/vnd.ieee.1905":{"source":"iana"},"application/vnd.igloader":{"source":"iana","extensions":["igl"]},"application/vnd.imagemeter.folder+zip":{"source":"iana","compressible":false},"application/vnd.imagemeter.image+zip":{"source":"iana","compressible":false},"application/vnd.immervision-ivp":{"source":"iana","extensions":["ivp"]},"application/vnd.immervision-ivu":{"source":"iana","extensions":["ivu"]},"application/vnd.ims.imsccv1p1":{"source":"iana"},"application/vnd.ims.imsccv1p2":{"source":"iana"},"application/vnd.ims.imsccv1p3":{"source":"iana"},"application/vnd.ims.lis.v2.result+json":{"source":"iana","compressible":true},"application/vnd.ims.lti.v2.toolconsumerprofile+json":{"source":"iana","compressible":true},"application/vnd.ims.lti.v2.toolproxy+json":{"source":"iana","compressible":true},"application/vnd.ims.lti.v2.toolproxy.id+json":{"source":"iana","compressible":true},"application/vnd.ims.lti.v2.toolsettings+json":{"source":"iana","compressible":true},"application/vnd.ims.lti.v2.toolsettings.simple+json":{"source":"iana","compressible":true},"application/vnd.informedcontrol.rms+xml":{"source":"iana","compressible":true},"application/vnd.informix-visionary":{"source":"iana"},"application/vnd.infotech.project":{"source":"iana"},"application/vnd.infotech.project+xml":{"source":"iana","compressible":true},"application/vnd.innopath.wamp.notification":{"source":"iana"},"application/vnd.insors.igm":{"source":"iana","extensions":["igm"]},"application/vnd.intercon.formnet":{"source":"iana","extensions":["xpw","xpx"]},"application/vnd.intergeo":{"source":"iana","extensions":["i2g"]},"application/vnd.intertrust.digibox":{"source":"iana"},"application/vnd.intertrust.nncp":{"source":"iana"},"application/vnd.intu.qbo":{"source":"iana","extensions":["qbo"]},"application/vnd.intu.qfx":{"source":"iana","extensions":["qfx"]},"application/vnd.iptc.g2.catalogitem+xml":{"source":"iana","compressible":true},"application/vnd.iptc.g2.conceptitem+xml":{"source":"iana","compressible":true},"application/vnd.iptc.g2.knowledgeitem+xml":{"source":"iana","compressible":true},"application/vnd.iptc.g2.newsitem+xml":{"source":"iana","compressible":true},"application/vnd.iptc.g2.newsmessage+xml":{"source":"iana","compressible":true},"application/vnd.iptc.g2.packageitem+xml":{"source":"iana","compressible":true},"application/vnd.iptc.g2.planningitem+xml":{"source":"iana","compressible":true},"application/vnd.ipunplugged.rcprofile":{"source":"iana","extensions":["rcprofile"]},"application/vnd.irepository.package+xml":{"source":"iana","compressible":true,"extensions":["irp"]},"application/vnd.is-xpr":{"source":"iana","extensions":["xpr"]},"application/vnd.isac.fcs":{"source":"iana","extensions":["fcs"]},"application/vnd.iso11783-10+zip":{"source":"iana","compressible":false},"application/vnd.jam":{"source":"iana","extensions":["jam"]},"application/vnd.japannet-directory-service":{"source":"iana"},"application/vnd.japannet-jpnstore-wakeup":{"source":"iana"},"application/vnd.japannet-payment-wakeup":{"source":"iana"},"application/vnd.japannet-registration":{"source":"iana"},"application/vnd.japannet-registration-wakeup":{"source":"iana"},"application/vnd.japannet-setstore-wakeup":{"source":"iana"},"application/vnd.japannet-verification":{"source":"iana"},"application/vnd.japannet-verification-wakeup":{"source":"iana"},"application/vnd.jcp.javame.midlet-rms":{"source":"iana","extensions":["rms"]},"application/vnd.jisp":{"source":"iana","extensions":["jisp"]},"application/vnd.joost.joda-archive":{"source":"iana","extensions":["joda"]},"application/vnd.jsk.isdn-ngn":{"source":"iana"},"application/vnd.kahootz":{"source":"iana","extensions":["ktz","ktr"]},"application/vnd.kde.karbon":{"source":"iana","extensions":["karbon"]},"application/vnd.kde.kchart":{"source":"iana","extensions":["chrt"]},"application/vnd.kde.kformula":{"source":"iana","extensions":["kfo"]},"application/vnd.kde.kivio":{"source":"iana","extensions":["flw"]},"application/vnd.kde.kontour":{"source":"iana","extensions":["kon"]},"application/vnd.kde.kpresenter":{"source":"iana","extensions":["kpr","kpt"]},"application/vnd.kde.kspread":{"source":"iana","extensions":["ksp"]},"application/vnd.kde.kword":{"source":"iana","extensions":["kwd","kwt"]},"application/vnd.kenameaapp":{"source":"iana","extensions":["htke"]},"application/vnd.kidspiration":{"source":"iana","extensions":["kia"]},"application/vnd.kinar":{"source":"iana","extensions":["kne","knp"]},"application/vnd.koan":{"source":"iana","extensions":["skp","skd","skt","skm"]},"application/vnd.kodak-descriptor":{"source":"iana","extensions":["sse"]},"application/vnd.las":{"source":"iana"},"application/vnd.las.las+json":{"source":"iana","compressible":true},"application/vnd.las.las+xml":{"source":"iana","compressible":true,"extensions":["lasxml"]},"application/vnd.laszip":{"source":"iana"},"application/vnd.leap+json":{"source":"iana","compressible":true},"application/vnd.liberty-request+xml":{"source":"iana","compressible":true},"application/vnd.llamagraphics.life-balance.desktop":{"source":"iana","extensions":["lbd"]},"application/vnd.llamagraphics.life-balance.exchange+xml":{"source":"iana","compressible":true,"extensions":["lbe"]},"application/vnd.logipipe.circuit+zip":{"source":"iana","compressible":false},"application/vnd.loom":{"source":"iana"},"application/vnd.lotus-1-2-3":{"source":"iana","extensions":["123"]},"application/vnd.lotus-approach":{"source":"iana","extensions":["apr"]},"application/vnd.lotus-freelance":{"source":"iana","extensions":["pre"]},"application/vnd.lotus-notes":{"source":"iana","extensions":["nsf"]},"application/vnd.lotus-organizer":{"source":"iana","extensions":["org"]},"application/vnd.lotus-screencam":{"source":"iana","extensions":["scm"]},"application/vnd.lotus-wordpro":{"source":"iana","extensions":["lwp"]},"application/vnd.macports.portpkg":{"source":"iana","extensions":["portpkg"]},"application/vnd.mapbox-vector-tile":{"source":"iana","extensions":["mvt"]},"application/vnd.marlin.drm.actiontoken+xml":{"source":"iana","compressible":true},"application/vnd.marlin.drm.conftoken+xml":{"source":"iana","compressible":true},"application/vnd.marlin.drm.license+xml":{"source":"iana","compressible":true},"application/vnd.marlin.drm.mdcf":{"source":"iana"},"application/vnd.mason+json":{"source":"iana","compressible":true},"application/vnd.maxar.archive.3tz+zip":{"source":"iana","compressible":false},"application/vnd.maxmind.maxmind-db":{"source":"iana"},"application/vnd.mcd":{"source":"iana","extensions":["mcd"]},"application/vnd.medcalcdata":{"source":"iana","extensions":["mc1"]},"application/vnd.mediastation.cdkey":{"source":"iana","extensions":["cdkey"]},"application/vnd.meridian-slingshot":{"source":"iana"},"application/vnd.mfer":{"source":"iana","extensions":["mwf"]},"application/vnd.mfmp":{"source":"iana","extensions":["mfm"]},"application/vnd.micro+json":{"source":"iana","compressible":true},"application/vnd.micrografx.flo":{"source":"iana","extensions":["flo"]},"application/vnd.micrografx.igx":{"source":"iana","extensions":["igx"]},"application/vnd.microsoft.portable-executable":{"source":"iana"},"application/vnd.microsoft.windows.thumbnail-cache":{"source":"iana"},"application/vnd.miele+json":{"source":"iana","compressible":true},"application/vnd.mif":{"source":"iana","extensions":["mif"]},"application/vnd.minisoft-hp3000-save":{"source":"iana"},"application/vnd.mitsubishi.misty-guard.trustweb":{"source":"iana"},"application/vnd.mobius.daf":{"source":"iana","extensions":["daf"]},"application/vnd.mobius.dis":{"source":"iana","extensions":["dis"]},"application/vnd.mobius.mbk":{"source":"iana","extensions":["mbk"]},"application/vnd.mobius.mqy":{"source":"iana","extensions":["mqy"]},"application/vnd.mobius.msl":{"source":"iana","extensions":["msl"]},"application/vnd.mobius.plc":{"source":"iana","extensions":["plc"]},"application/vnd.mobius.txf":{"source":"iana","extensions":["txf"]},"application/vnd.mophun.application":{"source":"iana","extensions":["mpn"]},"application/vnd.mophun.certificate":{"source":"iana","extensions":["mpc"]},"application/vnd.motorola.flexsuite":{"source":"iana"},"application/vnd.motorola.flexsuite.adsi":{"source":"iana"},"application/vnd.motorola.flexsuite.fis":{"source":"iana"},"application/vnd.motorola.flexsuite.gotap":{"source":"iana"},"application/vnd.motorola.flexsuite.kmr":{"source":"iana"},"application/vnd.motorola.flexsuite.ttc":{"source":"iana"},"application/vnd.motorola.flexsuite.wem":{"source":"iana"},"application/vnd.motorola.iprm":{"source":"iana"},"application/vnd.mozilla.xul+xml":{"source":"iana","compressible":true,"extensions":["xul"]},"application/vnd.ms-3mfdocument":{"source":"iana"},"application/vnd.ms-artgalry":{"source":"iana","extensions":["cil"]},"application/vnd.ms-asf":{"source":"iana"},"application/vnd.ms-cab-compressed":{"source":"iana","extensions":["cab"]},"application/vnd.ms-color.iccprofile":{"source":"apache"},"application/vnd.ms-excel":{"source":"iana","compressible":false,"extensions":["xls","xlm","xla","xlc","xlt","xlw"]},"application/vnd.ms-excel.addin.macroenabled.12":{"source":"iana","extensions":["xlam"]},"application/vnd.ms-excel.sheet.binary.macroenabled.12":{"source":"iana","extensions":["xlsb"]},"application/vnd.ms-excel.sheet.macroenabled.12":{"source":"iana","extensions":["xlsm"]},"application/vnd.ms-excel.template.macroenabled.12":{"source":"iana","extensions":["xltm"]},"application/vnd.ms-fontobject":{"source":"iana","compressible":true,"extensions":["eot"]},"application/vnd.ms-htmlhelp":{"source":"iana","extensions":["chm"]},"application/vnd.ms-ims":{"source":"iana","extensions":["ims"]},"application/vnd.ms-lrm":{"source":"iana","extensions":["lrm"]},"application/vnd.ms-office.activex+xml":{"source":"iana","compressible":true},"application/vnd.ms-officetheme":{"source":"iana","extensions":["thmx"]},"application/vnd.ms-opentype":{"source":"apache","compressible":true},"application/vnd.ms-outlook":{"compressible":false,"extensions":["msg"]},"application/vnd.ms-package.obfuscated-opentype":{"source":"apache"},"application/vnd.ms-pki.seccat":{"source":"apache","extensions":["cat"]},"application/vnd.ms-pki.stl":{"source":"apache","extensions":["stl"]},"application/vnd.ms-playready.initiator+xml":{"source":"iana","compressible":true},"application/vnd.ms-powerpoint":{"source":"iana","compressible":false,"extensions":["ppt","pps","pot"]},"application/vnd.ms-powerpoint.addin.macroenabled.12":{"source":"iana","extensions":["ppam"]},"application/vnd.ms-powerpoint.presentation.macroenabled.12":{"source":"iana","extensions":["pptm"]},"application/vnd.ms-powerpoint.slide.macroenabled.12":{"source":"iana","extensions":["sldm"]},"application/vnd.ms-powerpoint.slideshow.macroenabled.12":{"source":"iana","extensions":["ppsm"]},"application/vnd.ms-powerpoint.template.macroenabled.12":{"source":"iana","extensions":["potm"]},"application/vnd.ms-printdevicecapabilities+xml":{"source":"iana","compressible":true},"application/vnd.ms-printing.printticket+xml":{"source":"apache","compressible":true},"application/vnd.ms-printschematicket+xml":{"source":"iana","compressible":true},"application/vnd.ms-project":{"source":"iana","extensions":["mpp","mpt"]},"application/vnd.ms-tnef":{"source":"iana"},"application/vnd.ms-windows.devicepairing":{"source":"iana"},"application/vnd.ms-windows.nwprinting.oob":{"source":"iana"},"application/vnd.ms-windows.printerpairing":{"source":"iana"},"application/vnd.ms-windows.wsd.oob":{"source":"iana"},"application/vnd.ms-wmdrm.lic-chlg-req":{"source":"iana"},"application/vnd.ms-wmdrm.lic-resp":{"source":"iana"},"application/vnd.ms-wmdrm.meter-chlg-req":{"source":"iana"},"application/vnd.ms-wmdrm.meter-resp":{"source":"iana"},"application/vnd.ms-word.document.macroenabled.12":{"source":"iana","extensions":["docm"]},"application/vnd.ms-word.template.macroenabled.12":{"source":"iana","extensions":["dotm"]},"application/vnd.ms-works":{"source":"iana","extensions":["wps","wks","wcm","wdb"]},"application/vnd.ms-wpl":{"source":"iana","extensions":["wpl"]},"application/vnd.ms-xpsdocument":{"source":"iana","compressible":false,"extensions":["xps"]},"application/vnd.msa-disk-image":{"source":"iana"},"application/vnd.mseq":{"source":"iana","extensions":["mseq"]},"application/vnd.msign":{"source":"iana"},"application/vnd.multiad.creator":{"source":"iana"},"application/vnd.multiad.creator.cif":{"source":"iana"},"application/vnd.music-niff":{"source":"iana"},"application/vnd.musician":{"source":"iana","extensions":["mus"]},"application/vnd.muvee.style":{"source":"iana","extensions":["msty"]},"application/vnd.mynfc":{"source":"iana","extensions":["taglet"]},"application/vnd.nacamar.ybrid+json":{"source":"iana","compressible":true},"application/vnd.ncd.control":{"source":"iana"},"application/vnd.ncd.reference":{"source":"iana"},"application/vnd.nearst.inv+json":{"source":"iana","compressible":true},"application/vnd.nebumind.line":{"source":"iana"},"application/vnd.nervana":{"source":"iana"},"application/vnd.netfpx":{"source":"iana"},"application/vnd.neurolanguage.nlu":{"source":"iana","extensions":["nlu"]},"application/vnd.nimn":{"source":"iana"},"application/vnd.nintendo.nitro.rom":{"source":"iana"},"application/vnd.nintendo.snes.rom":{"source":"iana"},"application/vnd.nitf":{"source":"iana","extensions":["ntf","nitf"]},"application/vnd.noblenet-directory":{"source":"iana","extensions":["nnd"]},"application/vnd.noblenet-sealer":{"source":"iana","extensions":["nns"]},"application/vnd.noblenet-web":{"source":"iana","extensions":["nnw"]},"application/vnd.nokia.catalogs":{"source":"iana"},"application/vnd.nokia.conml+wbxml":{"source":"iana"},"application/vnd.nokia.conml+xml":{"source":"iana","compressible":true},"application/vnd.nokia.iptv.config+xml":{"source":"iana","compressible":true},"application/vnd.nokia.isds-radio-presets":{"source":"iana"},"application/vnd.nokia.landmark+wbxml":{"source":"iana"},"application/vnd.nokia.landmark+xml":{"source":"iana","compressible":true},"application/vnd.nokia.landmarkcollection+xml":{"source":"iana","compressible":true},"application/vnd.nokia.n-gage.ac+xml":{"source":"iana","compressible":true,"extensions":["ac"]},"application/vnd.nokia.n-gage.data":{"source":"iana","extensions":["ngdat"]},"application/vnd.nokia.n-gage.symbian.install":{"source":"iana","extensions":["n-gage"]},"application/vnd.nokia.ncd":{"source":"iana"},"application/vnd.nokia.pcd+wbxml":{"source":"iana"},"application/vnd.nokia.pcd+xml":{"source":"iana","compressible":true},"application/vnd.nokia.radio-preset":{"source":"iana","extensions":["rpst"]},"application/vnd.nokia.radio-presets":{"source":"iana","extensions":["rpss"]},"application/vnd.novadigm.edm":{"source":"iana","extensions":["edm"]},"application/vnd.novadigm.edx":{"source":"iana","extensions":["edx"]},"application/vnd.novadigm.ext":{"source":"iana","extensions":["ext"]},"application/vnd.ntt-local.content-share":{"source":"iana"},"application/vnd.ntt-local.file-transfer":{"source":"iana"},"application/vnd.ntt-local.ogw_remote-access":{"source":"iana"},"application/vnd.ntt-local.sip-ta_remote":{"source":"iana"},"application/vnd.ntt-local.sip-ta_tcp_stream":{"source":"iana"},"application/vnd.oasis.opendocument.chart":{"source":"iana","extensions":["odc"]},"application/vnd.oasis.opendocument.chart-template":{"source":"iana","extensions":["otc"]},"application/vnd.oasis.opendocument.database":{"source":"iana","extensions":["odb"]},"application/vnd.oasis.opendocument.formula":{"source":"iana","extensions":["odf"]},"application/vnd.oasis.opendocument.formula-template":{"source":"iana","extensions":["odft"]},"application/vnd.oasis.opendocument.graphics":{"source":"iana","compressible":false,"extensions":["odg"]},"application/vnd.oasis.opendocument.graphics-template":{"source":"iana","extensions":["otg"]},"application/vnd.oasis.opendocument.image":{"source":"iana","extensions":["odi"]},"application/vnd.oasis.opendocument.image-template":{"source":"iana","extensions":["oti"]},"application/vnd.oasis.opendocument.presentation":{"source":"iana","compressible":false,"extensions":["odp"]},"application/vnd.oasis.opendocument.presentation-template":{"source":"iana","extensions":["otp"]},"application/vnd.oasis.opendocument.spreadsheet":{"source":"iana","compressible":false,"extensions":["ods"]},"application/vnd.oasis.opendocument.spreadsheet-template":{"source":"iana","extensions":["ots"]},"application/vnd.oasis.opendocument.text":{"source":"iana","compressible":false,"extensions":["odt"]},"application/vnd.oasis.opendocument.text-master":{"source":"iana","extensions":["odm"]},"application/vnd.oasis.opendocument.text-template":{"source":"iana","extensions":["ott"]},"application/vnd.oasis.opendocument.text-web":{"source":"iana","extensions":["oth"]},"application/vnd.obn":{"source":"iana"},"application/vnd.ocf+cbor":{"source":"iana"},"application/vnd.oci.image.manifest.v1+json":{"source":"iana","compressible":true},"application/vnd.oftn.l10n+json":{"source":"iana","compressible":true},"application/vnd.oipf.contentaccessdownload+xml":{"source":"iana","compressible":true},"application/vnd.oipf.contentaccessstreaming+xml":{"source":"iana","compressible":true},"application/vnd.oipf.cspg-hexbinary":{"source":"iana"},"application/vnd.oipf.dae.svg+xml":{"source":"iana","compressible":true},"application/vnd.oipf.dae.xhtml+xml":{"source":"iana","compressible":true},"application/vnd.oipf.mippvcontrolmessage+xml":{"source":"iana","compressible":true},"application/vnd.oipf.pae.gem":{"source":"iana"},"application/vnd.oipf.spdiscovery+xml":{"source":"iana","compressible":true},"application/vnd.oipf.spdlist+xml":{"source":"iana","compressible":true},"application/vnd.oipf.ueprofile+xml":{"source":"iana","compressible":true},"application/vnd.oipf.userprofile+xml":{"source":"iana","compressible":true},"application/vnd.olpc-sugar":{"source":"iana","extensions":["xo"]},"application/vnd.oma-scws-config":{"source":"iana"},"application/vnd.oma-scws-http-request":{"source":"iana"},"application/vnd.oma-scws-http-response":{"source":"iana"},"application/vnd.oma.bcast.associated-procedure-parameter+xml":{"source":"iana","compressible":true},"application/vnd.oma.bcast.drm-trigger+xml":{"source":"iana","compressible":true},"application/vnd.oma.bcast.imd+xml":{"source":"iana","compressible":true},"application/vnd.oma.bcast.ltkm":{"source":"iana"},"application/vnd.oma.bcast.notification+xml":{"source":"iana","compressible":true},"application/vnd.oma.bcast.provisioningtrigger":{"source":"iana"},"application/vnd.oma.bcast.sgboot":{"source":"iana"},"application/vnd.oma.bcast.sgdd+xml":{"source":"iana","compressible":true},"application/vnd.oma.bcast.sgdu":{"source":"iana"},"application/vnd.oma.bcast.simple-symbol-container":{"source":"iana"},"application/vnd.oma.bcast.smartcard-trigger+xml":{"source":"iana","compressible":true},"application/vnd.oma.bcast.sprov+xml":{"source":"iana","compressible":true},"application/vnd.oma.bcast.stkm":{"source":"iana"},"application/vnd.oma.cab-address-book+xml":{"source":"iana","compressible":true},"application/vnd.oma.cab-feature-handler+xml":{"source":"iana","compressible":true},"application/vnd.oma.cab-pcc+xml":{"source":"iana","compressible":true},"application/vnd.oma.cab-subs-invite+xml":{"source":"iana","compressible":true},"application/vnd.oma.cab-user-prefs+xml":{"source":"iana","compressible":true},"application/vnd.oma.dcd":{"source":"iana"},"application/vnd.oma.dcdc":{"source":"iana"},"application/vnd.oma.dd2+xml":{"source":"iana","compressible":true,"extensions":["dd2"]},"application/vnd.oma.drm.risd+xml":{"source":"iana","compressible":true},"application/vnd.oma.group-usage-list+xml":{"source":"iana","compressible":true},"application/vnd.oma.lwm2m+cbor":{"source":"iana"},"application/vnd.oma.lwm2m+json":{"source":"iana","compressible":true},"application/vnd.oma.lwm2m+tlv":{"source":"iana"},"application/vnd.oma.pal+xml":{"source":"iana","compressible":true},"application/vnd.oma.poc.detailed-progress-report+xml":{"source":"iana","compressible":true},"application/vnd.oma.poc.final-report+xml":{"source":"iana","compressible":true},"application/vnd.oma.poc.groups+xml":{"source":"iana","compressible":true},"application/vnd.oma.poc.invocation-descriptor+xml":{"source":"iana","compressible":true},"application/vnd.oma.poc.optimized-progress-report+xml":{"source":"iana","compressible":true},"application/vnd.oma.push":{"source":"iana"},"application/vnd.oma.scidm.messages+xml":{"source":"iana","compressible":true},"application/vnd.oma.xcap-directory+xml":{"source":"iana","compressible":true},"application/vnd.omads-email+xml":{"source":"iana","charset":"UTF-8","compressible":true},"application/vnd.omads-file+xml":{"source":"iana","charset":"UTF-8","compressible":true},"application/vnd.omads-folder+xml":{"source":"iana","charset":"UTF-8","compressible":true},"application/vnd.omaloc-supl-init":{"source":"iana"},"application/vnd.onepager":{"source":"iana"},"application/vnd.onepagertamp":{"source":"iana"},"application/vnd.onepagertamx":{"source":"iana"},"application/vnd.onepagertat":{"source":"iana"},"application/vnd.onepagertatp":{"source":"iana"},"application/vnd.onepagertatx":{"source":"iana"},"application/vnd.openblox.game+xml":{"source":"iana","compressible":true,"extensions":["obgx"]},"application/vnd.openblox.game-binary":{"source":"iana"},"application/vnd.openeye.oeb":{"source":"iana"},"application/vnd.openofficeorg.extension":{"source":"apache","extensions":["oxt"]},"application/vnd.openstreetmap.data+xml":{"source":"iana","compressible":true,"extensions":["osm"]},"application/vnd.opentimestamps.ots":{"source":"iana"},"application/vnd.openxmlformats-officedocument.custom-properties+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.customxmlproperties+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.drawing+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.drawingml.chart+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.drawingml.chartshapes+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.drawingml.diagramcolors+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.drawingml.diagramdata+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.drawingml.diagramlayout+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.drawingml.diagramstyle+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.extended-properties+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.presentationml.commentauthors+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.presentationml.comments+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.presentationml.handoutmaster+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.presentationml.notesmaster+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.presentationml.notesslide+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.presentationml.presentation":{"source":"iana","compressible":false,"extensions":["pptx"]},"application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.presentationml.presprops+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.presentationml.slide":{"source":"iana","extensions":["sldx"]},"application/vnd.openxmlformats-officedocument.presentationml.slide+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.presentationml.slidelayout+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.presentationml.slidemaster+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.presentationml.slideshow":{"source":"iana","extensions":["ppsx"]},"application/vnd.openxmlformats-officedocument.presentationml.slideshow.main+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.presentationml.slideupdateinfo+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.presentationml.tablestyles+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.presentationml.tags+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.presentationml.template":{"source":"iana","extensions":["potx"]},"application/vnd.openxmlformats-officedocument.presentationml.template.main+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.presentationml.viewprops+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.spreadsheetml.calcchain+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.spreadsheetml.chartsheet+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.spreadsheetml.comments+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.spreadsheetml.connections+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.spreadsheetml.dialogsheet+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.spreadsheetml.externallink+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.spreadsheetml.pivotcachedefinition+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.spreadsheetml.pivotcacherecords+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.spreadsheetml.pivottable+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.spreadsheetml.querytable+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.spreadsheetml.revisionheaders+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.spreadsheetml.revisionlog+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.spreadsheetml.sharedstrings+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":{"source":"iana","compressible":false,"extensions":["xlsx"]},"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.spreadsheetml.sheetmetadata+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.spreadsheetml.tablesinglecells+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.spreadsheetml.template":{"source":"iana","extensions":["xltx"]},"application/vnd.openxmlformats-officedocument.spreadsheetml.template.main+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.spreadsheetml.usernames+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.spreadsheetml.volatiledependencies+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.theme+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.themeoverride+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.vmldrawing":{"source":"iana"},"application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.wordprocessingml.document":{"source":"iana","compressible":false,"extensions":["docx"]},"application/vnd.openxmlformats-officedocument.wordprocessingml.document.glossary+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.wordprocessingml.endnotes+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.wordprocessingml.fonttable+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.wordprocessingml.template":{"source":"iana","extensions":["dotx"]},"application/vnd.openxmlformats-officedocument.wordprocessingml.template.main+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-officedocument.wordprocessingml.websettings+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-package.core-properties+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-package.digital-signature-xmlsignature+xml":{"source":"iana","compressible":true},"application/vnd.openxmlformats-package.relationships+xml":{"source":"iana","compressible":true},"application/vnd.oracle.resource+json":{"source":"iana","compressible":true},"application/vnd.orange.indata":{"source":"iana"},"application/vnd.osa.netdeploy":{"source":"iana"},"application/vnd.osgeo.mapguide.package":{"source":"iana","extensions":["mgp"]},"application/vnd.osgi.bundle":{"source":"iana"},"application/vnd.osgi.dp":{"source":"iana","extensions":["dp"]},"application/vnd.osgi.subsystem":{"source":"iana","extensions":["esa"]},"application/vnd.otps.ct-kip+xml":{"source":"iana","compressible":true},"application/vnd.oxli.countgraph":{"source":"iana"},"application/vnd.pagerduty+json":{"source":"iana","compressible":true},"application/vnd.palm":{"source":"iana","extensions":["pdb","pqa","oprc"]},"application/vnd.panoply":{"source":"iana"},"application/vnd.paos.xml":{"source":"iana"},"application/vnd.patentdive":{"source":"iana"},"application/vnd.patientecommsdoc":{"source":"iana"},"application/vnd.pawaafile":{"source":"iana","extensions":["paw"]},"application/vnd.pcos":{"source":"iana"},"application/vnd.pg.format":{"source":"iana","extensions":["str"]},"application/vnd.pg.osasli":{"source":"iana","extensions":["ei6"]},"application/vnd.piaccess.application-licence":{"source":"iana"},"application/vnd.picsel":{"source":"iana","extensions":["efif"]},"application/vnd.pmi.widget":{"source":"iana","extensions":["wg"]},"application/vnd.poc.group-advertisement+xml":{"source":"iana","compressible":true},"application/vnd.pocketlearn":{"source":"iana","extensions":["plf"]},"application/vnd.powerbuilder6":{"source":"iana","extensions":["pbd"]},"application/vnd.powerbuilder6-s":{"source":"iana"},"application/vnd.powerbuilder7":{"source":"iana"},"application/vnd.powerbuilder7-s":{"source":"iana"},"application/vnd.powerbuilder75":{"source":"iana"},"application/vnd.powerbuilder75-s":{"source":"iana"},"application/vnd.preminet":{"source":"iana"},"application/vnd.previewsystems.box":{"source":"iana","extensions":["box"]},"application/vnd.proteus.magazine":{"source":"iana","extensions":["mgz"]},"application/vnd.psfs":{"source":"iana"},"application/vnd.publishare-delta-tree":{"source":"iana","extensions":["qps"]},"application/vnd.pvi.ptid1":{"source":"iana","extensions":["ptid"]},"application/vnd.pwg-multiplexed":{"source":"iana"},"application/vnd.pwg-xhtml-print+xml":{"source":"iana","compressible":true},"application/vnd.qualcomm.brew-app-res":{"source":"iana"},"application/vnd.quarantainenet":{"source":"iana"},"application/vnd.quark.quarkxpress":{"source":"iana","extensions":["qxd","qxt","qwd","qwt","qxl","qxb"]},"application/vnd.quobject-quoxdocument":{"source":"iana"},"application/vnd.radisys.moml+xml":{"source":"iana","compressible":true},"application/vnd.radisys.msml+xml":{"source":"iana","compressible":true},"application/vnd.radisys.msml-audit+xml":{"source":"iana","compressible":true},"application/vnd.radisys.msml-audit-conf+xml":{"source":"iana","compressible":true},"application/vnd.radisys.msml-audit-conn+xml":{"source":"iana","compressible":true},"application/vnd.radisys.msml-audit-dialog+xml":{"source":"iana","compressible":true},"application/vnd.radisys.msml-audit-stream+xml":{"source":"iana","compressible":true},"application/vnd.radisys.msml-conf+xml":{"source":"iana","compressible":true},"application/vnd.radisys.msml-dialog+xml":{"source":"iana","compressible":true},"application/vnd.radisys.msml-dialog-base+xml":{"source":"iana","compressible":true},"application/vnd.radisys.msml-dialog-fax-detect+xml":{"source":"iana","compressible":true},"application/vnd.radisys.msml-dialog-fax-sendrecv+xml":{"source":"iana","compressible":true},"application/vnd.radisys.msml-dialog-group+xml":{"source":"iana","compressible":true},"application/vnd.radisys.msml-dialog-speech+xml":{"source":"iana","compressible":true},"application/vnd.radisys.msml-dialog-transform+xml":{"source":"iana","compressible":true},"application/vnd.rainstor.data":{"source":"iana"},"application/vnd.rapid":{"source":"iana"},"application/vnd.rar":{"source":"iana","extensions":["rar"]},"application/vnd.realvnc.bed":{"source":"iana","extensions":["bed"]},"application/vnd.recordare.musicxml":{"source":"iana","extensions":["mxl"]},"application/vnd.recordare.musicxml+xml":{"source":"iana","compressible":true,"extensions":["musicxml"]},"application/vnd.renlearn.rlprint":{"source":"iana"},"application/vnd.resilient.logic":{"source":"iana"},"application/vnd.restful+json":{"source":"iana","compressible":true},"application/vnd.rig.cryptonote":{"source":"iana","extensions":["cryptonote"]},"application/vnd.rim.cod":{"source":"apache","extensions":["cod"]},"application/vnd.rn-realmedia":{"source":"apache","extensions":["rm"]},"application/vnd.rn-realmedia-vbr":{"source":"apache","extensions":["rmvb"]},"application/vnd.route66.link66+xml":{"source":"iana","compressible":true,"extensions":["link66"]},"application/vnd.rs-274x":{"source":"iana"},"application/vnd.ruckus.download":{"source":"iana"},"application/vnd.s3sms":{"source":"iana"},"application/vnd.sailingtracker.track":{"source":"iana","extensions":["st"]},"application/vnd.sar":{"source":"iana"},"application/vnd.sbm.cid":{"source":"iana"},"application/vnd.sbm.mid2":{"source":"iana"},"application/vnd.scribus":{"source":"iana"},"application/vnd.sealed.3df":{"source":"iana"},"application/vnd.sealed.csf":{"source":"iana"},"application/vnd.sealed.doc":{"source":"iana"},"application/vnd.sealed.eml":{"source":"iana"},"application/vnd.sealed.mht":{"source":"iana"},"application/vnd.sealed.net":{"source":"iana"},"application/vnd.sealed.ppt":{"source":"iana"},"application/vnd.sealed.tiff":{"source":"iana"},"application/vnd.sealed.xls":{"source":"iana"},"application/vnd.sealedmedia.softseal.html":{"source":"iana"},"application/vnd.sealedmedia.softseal.pdf":{"source":"iana"},"application/vnd.seemail":{"source":"iana","extensions":["see"]},"application/vnd.seis+json":{"source":"iana","compressible":true},"application/vnd.sema":{"source":"iana","extensions":["sema"]},"application/vnd.semd":{"source":"iana","extensions":["semd"]},"application/vnd.semf":{"source":"iana","extensions":["semf"]},"application/vnd.shade-save-file":{"source":"iana"},"application/vnd.shana.informed.formdata":{"source":"iana","extensions":["ifm"]},"application/vnd.shana.informed.formtemplate":{"source":"iana","extensions":["itp"]},"application/vnd.shana.informed.interchange":{"source":"iana","extensions":["iif"]},"application/vnd.shana.informed.package":{"source":"iana","extensions":["ipk"]},"application/vnd.shootproof+json":{"source":"iana","compressible":true},"application/vnd.shopkick+json":{"source":"iana","compressible":true},"application/vnd.shp":{"source":"iana"},"application/vnd.shx":{"source":"iana"},"application/vnd.sigrok.session":{"source":"iana"},"application/vnd.simtech-mindmapper":{"source":"iana","extensions":["twd","twds"]},"application/vnd.siren+json":{"source":"iana","compressible":true},"application/vnd.smaf":{"source":"iana","extensions":["mmf"]},"application/vnd.smart.notebook":{"source":"iana"},"application/vnd.smart.teacher":{"source":"iana","extensions":["teacher"]},"application/vnd.snesdev-page-table":{"source":"iana"},"application/vnd.software602.filler.form+xml":{"source":"iana","compressible":true,"extensions":["fo"]},"application/vnd.software602.filler.form-xml-zip":{"source":"iana"},"application/vnd.solent.sdkm+xml":{"source":"iana","compressible":true,"extensions":["sdkm","sdkd"]},"application/vnd.spotfire.dxp":{"source":"iana","extensions":["dxp"]},"application/vnd.spotfire.sfs":{"source":"iana","extensions":["sfs"]},"application/vnd.sqlite3":{"source":"iana"},"application/vnd.sss-cod":{"source":"iana"},"application/vnd.sss-dtf":{"source":"iana"},"application/vnd.sss-ntf":{"source":"iana"},"application/vnd.stardivision.calc":{"source":"apache","extensions":["sdc"]},"application/vnd.stardivision.draw":{"source":"apache","extensions":["sda"]},"application/vnd.stardivision.impress":{"source":"apache","extensions":["sdd"]},"application/vnd.stardivision.math":{"source":"apache","extensions":["smf"]},"application/vnd.stardivision.writer":{"source":"apache","extensions":["sdw","vor"]},"application/vnd.stardivision.writer-global":{"source":"apache","extensions":["sgl"]},"application/vnd.stepmania.package":{"source":"iana","extensions":["smzip"]},"application/vnd.stepmania.stepchart":{"source":"iana","extensions":["sm"]},"application/vnd.street-stream":{"source":"iana"},"application/vnd.sun.wadl+xml":{"source":"iana","compressible":true,"extensions":["wadl"]},"application/vnd.sun.xml.calc":{"source":"apache","extensions":["sxc"]},"application/vnd.sun.xml.calc.template":{"source":"apache","extensions":["stc"]},"application/vnd.sun.xml.draw":{"source":"apache","extensions":["sxd"]},"application/vnd.sun.xml.draw.template":{"source":"apache","extensions":["std"]},"application/vnd.sun.xml.impress":{"source":"apache","extensions":["sxi"]},"application/vnd.sun.xml.impress.template":{"source":"apache","extensions":["sti"]},"application/vnd.sun.xml.math":{"source":"apache","extensions":["sxm"]},"application/vnd.sun.xml.writer":{"source":"apache","extensions":["sxw"]},"application/vnd.sun.xml.writer.global":{"source":"apache","extensions":["sxg"]},"application/vnd.sun.xml.writer.template":{"source":"apache","extensions":["stw"]},"application/vnd.sus-calendar":{"source":"iana","extensions":["sus","susp"]},"application/vnd.svd":{"source":"iana","extensions":["svd"]},"application/vnd.swiftview-ics":{"source":"iana"},"application/vnd.sycle+xml":{"source":"iana","compressible":true},"application/vnd.syft+json":{"source":"iana","compressible":true},"application/vnd.symbian.install":{"source":"apache","extensions":["sis","sisx"]},"application/vnd.syncml+xml":{"source":"iana","charset":"UTF-8","compressible":true,"extensions":["xsm"]},"application/vnd.syncml.dm+wbxml":{"source":"iana","charset":"UTF-8","extensions":["bdm"]},"application/vnd.syncml.dm+xml":{"source":"iana","charset":"UTF-8","compressible":true,"extensions":["xdm"]},"application/vnd.syncml.dm.notification":{"source":"iana"},"application/vnd.syncml.dmddf+wbxml":{"source":"iana"},"application/vnd.syncml.dmddf+xml":{"source":"iana","charset":"UTF-8","compressible":true,"extensions":["ddf"]},"application/vnd.syncml.dmtnds+wbxml":{"source":"iana"},"application/vnd.syncml.dmtnds+xml":{"source":"iana","charset":"UTF-8","compressible":true},"application/vnd.syncml.ds.notification":{"source":"iana"},"application/vnd.tableschema+json":{"source":"iana","compressible":true},"application/vnd.tao.intent-module-archive":{"source":"iana","extensions":["tao"]},"application/vnd.tcpdump.pcap":{"source":"iana","extensions":["pcap","cap","dmp"]},"application/vnd.think-cell.ppttc+json":{"source":"iana","compressible":true},"application/vnd.tmd.mediaflex.api+xml":{"source":"iana","compressible":true},"application/vnd.tml":{"source":"iana"},"application/vnd.tmobile-livetv":{"source":"iana","extensions":["tmo"]},"application/vnd.tri.onesource":{"source":"iana"},"application/vnd.trid.tpt":{"source":"iana","extensions":["tpt"]},"application/vnd.triscape.mxs":{"source":"iana","extensions":["mxs"]},"application/vnd.trueapp":{"source":"iana","extensions":["tra"]},"application/vnd.truedoc":{"source":"iana"},"application/vnd.ubisoft.webplayer":{"source":"iana"},"application/vnd.ufdl":{"source":"iana","extensions":["ufd","ufdl"]},"application/vnd.uiq.theme":{"source":"iana","extensions":["utz"]},"application/vnd.umajin":{"source":"iana","extensions":["umj"]},"application/vnd.unity":{"source":"iana","extensions":["unityweb"]},"application/vnd.uoml+xml":{"source":"iana","compressible":true,"extensions":["uoml"]},"application/vnd.uplanet.alert":{"source":"iana"},"application/vnd.uplanet.alert-wbxml":{"source":"iana"},"application/vnd.uplanet.bearer-choice":{"source":"iana"},"application/vnd.uplanet.bearer-choice-wbxml":{"source":"iana"},"application/vnd.uplanet.cacheop":{"source":"iana"},"application/vnd.uplanet.cacheop-wbxml":{"source":"iana"},"application/vnd.uplanet.channel":{"source":"iana"},"application/vnd.uplanet.channel-wbxml":{"source":"iana"},"application/vnd.uplanet.list":{"source":"iana"},"application/vnd.uplanet.list-wbxml":{"source":"iana"},"application/vnd.uplanet.listcmd":{"source":"iana"},"application/vnd.uplanet.listcmd-wbxml":{"source":"iana"},"application/vnd.uplanet.signal":{"source":"iana"},"application/vnd.uri-map":{"source":"iana"},"application/vnd.valve.source.material":{"source":"iana"},"application/vnd.vcx":{"source":"iana","extensions":["vcx"]},"application/vnd.vd-study":{"source":"iana"},"application/vnd.vectorworks":{"source":"iana"},"application/vnd.vel+json":{"source":"iana","compressible":true},"application/vnd.verimatrix.vcas":{"source":"iana"},"application/vnd.veritone.aion+json":{"source":"iana","compressible":true},"application/vnd.veryant.thin":{"source":"iana"},"application/vnd.ves.encrypted":{"source":"iana"},"application/vnd.vidsoft.vidconference":{"source":"iana"},"application/vnd.visio":{"source":"iana","extensions":["vsd","vst","vss","vsw"]},"application/vnd.visionary":{"source":"iana","extensions":["vis"]},"application/vnd.vividence.scriptfile":{"source":"iana"},"application/vnd.vsf":{"source":"iana","extensions":["vsf"]},"application/vnd.wap.sic":{"source":"iana"},"application/vnd.wap.slc":{"source":"iana"},"application/vnd.wap.wbxml":{"source":"iana","charset":"UTF-8","extensions":["wbxml"]},"application/vnd.wap.wmlc":{"source":"iana","extensions":["wmlc"]},"application/vnd.wap.wmlscriptc":{"source":"iana","extensions":["wmlsc"]},"application/vnd.webturbo":{"source":"iana","extensions":["wtb"]},"application/vnd.wfa.dpp":{"source":"iana"},"application/vnd.wfa.p2p":{"source":"iana"},"application/vnd.wfa.wsc":{"source":"iana"},"application/vnd.windows.devicepairing":{"source":"iana"},"application/vnd.wmc":{"source":"iana"},"application/vnd.wmf.bootstrap":{"source":"iana"},"application/vnd.wolfram.mathematica":{"source":"iana"},"application/vnd.wolfram.mathematica.package":{"source":"iana"},"application/vnd.wolfram.player":{"source":"iana","extensions":["nbp"]},"application/vnd.wordperfect":{"source":"iana","extensions":["wpd"]},"application/vnd.wqd":{"source":"iana","extensions":["wqd"]},"application/vnd.wrq-hp3000-labelled":{"source":"iana"},"application/vnd.wt.stf":{"source":"iana","extensions":["stf"]},"application/vnd.wv.csp+wbxml":{"source":"iana"},"application/vnd.wv.csp+xml":{"source":"iana","compressible":true},"application/vnd.wv.ssp+xml":{"source":"iana","compressible":true},"application/vnd.xacml+json":{"source":"iana","compressible":true},"application/vnd.xara":{"source":"iana","extensions":["xar"]},"application/vnd.xfdl":{"source":"iana","extensions":["xfdl"]},"application/vnd.xfdl.webform":{"source":"iana"},"application/vnd.xmi+xml":{"source":"iana","compressible":true},"application/vnd.xmpie.cpkg":{"source":"iana"},"application/vnd.xmpie.dpkg":{"source":"iana"},"application/vnd.xmpie.plan":{"source":"iana"},"application/vnd.xmpie.ppkg":{"source":"iana"},"application/vnd.xmpie.xlim":{"source":"iana"},"application/vnd.yamaha.hv-dic":{"source":"iana","extensions":["hvd"]},"application/vnd.yamaha.hv-script":{"source":"iana","extensions":["hvs"]},"application/vnd.yamaha.hv-voice":{"source":"iana","extensions":["hvp"]},"application/vnd.yamaha.openscoreformat":{"source":"iana","extensions":["osf"]},"application/vnd.yamaha.openscoreformat.osfpvg+xml":{"source":"iana","compressible":true,"extensions":["osfpvg"]},"application/vnd.yamaha.remote-setup":{"source":"iana"},"application/vnd.yamaha.smaf-audio":{"source":"iana","extensions":["saf"]},"application/vnd.yamaha.smaf-phrase":{"source":"iana","extensions":["spf"]},"application/vnd.yamaha.through-ngn":{"source":"iana"},"application/vnd.yamaha.tunnel-udpencap":{"source":"iana"},"application/vnd.yaoweme":{"source":"iana"},"application/vnd.yellowriver-custom-menu":{"source":"iana","extensions":["cmp"]},"application/vnd.youtube.yt":{"source":"iana"},"application/vnd.zul":{"source":"iana","extensions":["zir","zirz"]},"application/vnd.zzazz.deck+xml":{"source":"iana","compressible":true,"extensions":["zaz"]},"application/voicexml+xml":{"source":"iana","compressible":true,"extensions":["vxml"]},"application/voucher-cms+json":{"source":"iana","compressible":true},"application/vq-rtcpxr":{"source":"iana"},"application/wasm":{"source":"iana","compressible":true,"extensions":["wasm"]},"application/watcherinfo+xml":{"source":"iana","compressible":true,"extensions":["wif"]},"application/webpush-options+json":{"source":"iana","compressible":true},"application/whoispp-query":{"source":"iana"},"application/whoispp-response":{"source":"iana"},"application/widget":{"source":"iana","extensions":["wgt"]},"application/winhlp":{"source":"apache","extensions":["hlp"]},"application/wita":{"source":"iana"},"application/wordperfect5.1":{"source":"iana"},"application/wsdl+xml":{"source":"iana","compressible":true,"extensions":["wsdl"]},"application/wspolicy+xml":{"source":"iana","compressible":true,"extensions":["wspolicy"]},"application/x-7z-compressed":{"source":"apache","compressible":false,"extensions":["7z"]},"application/x-abiword":{"source":"apache","extensions":["abw"]},"application/x-ace-compressed":{"source":"apache","extensions":["ace"]},"application/x-amf":{"source":"apache"},"application/x-apple-diskimage":{"source":"apache","extensions":["dmg"]},"application/x-arj":{"compressible":false,"extensions":["arj"]},"application/x-authorware-bin":{"source":"apache","extensions":["aab","x32","u32","vox"]},"application/x-authorware-map":{"source":"apache","extensions":["aam"]},"application/x-authorware-seg":{"source":"apache","extensions":["aas"]},"application/x-bcpio":{"source":"apache","extensions":["bcpio"]},"application/x-bdoc":{"compressible":false,"extensions":["bdoc"]},"application/x-bittorrent":{"source":"apache","extensions":["torrent"]},"application/x-blorb":{"source":"apache","extensions":["blb","blorb"]},"application/x-bzip":{"source":"apache","compressible":false,"extensions":["bz"]},"application/x-bzip2":{"source":"apache","compressible":false,"extensions":["bz2","boz"]},"application/x-cbr":{"source":"apache","extensions":["cbr","cba","cbt","cbz","cb7"]},"application/x-cdlink":{"source":"apache","extensions":["vcd"]},"application/x-cfs-compressed":{"source":"apache","extensions":["cfs"]},"application/x-chat":{"source":"apache","extensions":["chat"]},"application/x-chess-pgn":{"source":"apache","extensions":["pgn"]},"application/x-chrome-extension":{"extensions":["crx"]},"application/x-cocoa":{"source":"nginx","extensions":["cco"]},"application/x-compress":{"source":"apache"},"application/x-conference":{"source":"apache","extensions":["nsc"]},"application/x-cpio":{"source":"apache","extensions":["cpio"]},"application/x-csh":{"source":"apache","extensions":["csh"]},"application/x-deb":{"compressible":false},"application/x-debian-package":{"source":"apache","extensions":["deb","udeb"]},"application/x-dgc-compressed":{"source":"apache","extensions":["dgc"]},"application/x-director":{"source":"apache","extensions":["dir","dcr","dxr","cst","cct","cxt","w3d","fgd","swa"]},"application/x-doom":{"source":"apache","extensions":["wad"]},"application/x-dtbncx+xml":{"source":"apache","compressible":true,"extensions":["ncx"]},"application/x-dtbook+xml":{"source":"apache","compressible":true,"extensions":["dtb"]},"application/x-dtbresource+xml":{"source":"apache","compressible":true,"extensions":["res"]},"application/x-dvi":{"source":"apache","compressible":false,"extensions":["dvi"]},"application/x-envoy":{"source":"apache","extensions":["evy"]},"application/x-eva":{"source":"apache","extensions":["eva"]},"application/x-font-bdf":{"source":"apache","extensions":["bdf"]},"application/x-font-dos":{"source":"apache"},"application/x-font-framemaker":{"source":"apache"},"application/x-font-ghostscript":{"source":"apache","extensions":["gsf"]},"application/x-font-libgrx":{"source":"apache"},"application/x-font-linux-psf":{"source":"apache","extensions":["psf"]},"application/x-font-pcf":{"source":"apache","extensions":["pcf"]},"application/x-font-snf":{"source":"apache","extensions":["snf"]},"application/x-font-speedo":{"source":"apache"},"application/x-font-sunos-news":{"source":"apache"},"application/x-font-type1":{"source":"apache","extensions":["pfa","pfb","pfm","afm"]},"application/x-font-vfont":{"source":"apache"},"application/x-freearc":{"source":"apache","extensions":["arc"]},"application/x-futuresplash":{"source":"apache","extensions":["spl"]},"application/x-gca-compressed":{"source":"apache","extensions":["gca"]},"application/x-glulx":{"source":"apache","extensions":["ulx"]},"application/x-gnumeric":{"source":"apache","extensions":["gnumeric"]},"application/x-gramps-xml":{"source":"apache","extensions":["gramps"]},"application/x-gtar":{"source":"apache","extensions":["gtar"]},"application/x-gzip":{"source":"apache"},"application/x-hdf":{"source":"apache","extensions":["hdf"]},"application/x-httpd-php":{"compressible":true,"extensions":["php"]},"application/x-install-instructions":{"source":"apache","extensions":["install"]},"application/x-iso9660-image":{"source":"apache","extensions":["iso"]},"application/x-iwork-keynote-sffkey":{"extensions":["key"]},"application/x-iwork-numbers-sffnumbers":{"extensions":["numbers"]},"application/x-iwork-pages-sffpages":{"extensions":["pages"]},"application/x-java-archive-diff":{"source":"nginx","extensions":["jardiff"]},"application/x-java-jnlp-file":{"source":"apache","compressible":false,"extensions":["jnlp"]},"application/x-javascript":{"compressible":true},"application/x-keepass2":{"extensions":["kdbx"]},"application/x-latex":{"source":"apache","compressible":false,"extensions":["latex"]},"application/x-lua-bytecode":{"extensions":["luac"]},"application/x-lzh-compressed":{"source":"apache","extensions":["lzh","lha"]},"application/x-makeself":{"source":"nginx","extensions":["run"]},"application/x-mie":{"source":"apache","extensions":["mie"]},"application/x-mobipocket-ebook":{"source":"apache","extensions":["prc","mobi"]},"application/x-mpegurl":{"compressible":false},"application/x-ms-application":{"source":"apache","extensions":["application"]},"application/x-ms-shortcut":{"source":"apache","extensions":["lnk"]},"application/x-ms-wmd":{"source":"apache","extensions":["wmd"]},"application/x-ms-wmz":{"source":"apache","extensions":["wmz"]},"application/x-ms-xbap":{"source":"apache","extensions":["xbap"]},"application/x-msaccess":{"source":"apache","extensions":["mdb"]},"application/x-msbinder":{"source":"apache","extensions":["obd"]},"application/x-mscardfile":{"source":"apache","extensions":["crd"]},"application/x-msclip":{"source":"apache","extensions":["clp"]},"application/x-msdos-program":{"extensions":["exe"]},"application/x-msdownload":{"source":"apache","extensions":["exe","dll","com","bat","msi"]},"application/x-msmediaview":{"source":"apache","extensions":["mvb","m13","m14"]},"application/x-msmetafile":{"source":"apache","extensions":["wmf","wmz","emf","emz"]},"application/x-msmoney":{"source":"apache","extensions":["mny"]},"application/x-mspublisher":{"source":"apache","extensions":["pub"]},"application/x-msschedule":{"source":"apache","extensions":["scd"]},"application/x-msterminal":{"source":"apache","extensions":["trm"]},"application/x-mswrite":{"source":"apache","extensions":["wri"]},"application/x-netcdf":{"source":"apache","extensions":["nc","cdf"]},"application/x-ns-proxy-autoconfig":{"compressible":true,"extensions":["pac"]},"application/x-nzb":{"source":"apache","extensions":["nzb"]},"application/x-perl":{"source":"nginx","extensions":["pl","pm"]},"application/x-pilot":{"source":"nginx","extensions":["prc","pdb"]},"application/x-pkcs12":{"source":"apache","compressible":false,"extensions":["p12","pfx"]},"application/x-pkcs7-certificates":{"source":"apache","extensions":["p7b","spc"]},"application/x-pkcs7-certreqresp":{"source":"apache","extensions":["p7r"]},"application/x-pki-message":{"source":"iana"},"application/x-rar-compressed":{"source":"apache","compressible":false,"extensions":["rar"]},"application/x-redhat-package-manager":{"source":"nginx","extensions":["rpm"]},"application/x-research-info-systems":{"source":"apache","extensions":["ris"]},"application/x-sea":{"source":"nginx","extensions":["sea"]},"application/x-sh":{"source":"apache","compressible":true,"extensions":["sh"]},"application/x-shar":{"source":"apache","extensions":["shar"]},"application/x-shockwave-flash":{"source":"apache","compressible":false,"extensions":["swf"]},"application/x-silverlight-app":{"source":"apache","extensions":["xap"]},"application/x-sql":{"source":"apache","extensions":["sql"]},"application/x-stuffit":{"source":"apache","compressible":false,"extensions":["sit"]},"application/x-stuffitx":{"source":"apache","extensions":["sitx"]},"application/x-subrip":{"source":"apache","extensions":["srt"]},"application/x-sv4cpio":{"source":"apache","extensions":["sv4cpio"]},"application/x-sv4crc":{"source":"apache","extensions":["sv4crc"]},"application/x-t3vm-image":{"source":"apache","extensions":["t3"]},"application/x-tads":{"source":"apache","extensions":["gam"]},"application/x-tar":{"source":"apache","compressible":true,"extensions":["tar"]},"application/x-tcl":{"source":"apache","extensions":["tcl","tk"]},"application/x-tex":{"source":"apache","extensions":["tex"]},"application/x-tex-tfm":{"source":"apache","extensions":["tfm"]},"application/x-texinfo":{"source":"apache","extensions":["texinfo","texi"]},"application/x-tgif":{"source":"apache","extensions":["obj"]},"application/x-ustar":{"source":"apache","extensions":["ustar"]},"application/x-virtualbox-hdd":{"compressible":true,"extensions":["hdd"]},"application/x-virtualbox-ova":{"compressible":true,"extensions":["ova"]},"application/x-virtualbox-ovf":{"compressible":true,"extensions":["ovf"]},"application/x-virtualbox-vbox":{"compressible":true,"extensions":["vbox"]},"application/x-virtualbox-vbox-extpack":{"compressible":false,"extensions":["vbox-extpack"]},"application/x-virtualbox-vdi":{"compressible":true,"extensions":["vdi"]},"application/x-virtualbox-vhd":{"compressible":true,"extensions":["vhd"]},"application/x-virtualbox-vmdk":{"compressible":true,"extensions":["vmdk"]},"application/x-wais-source":{"source":"apache","extensions":["src"]},"application/x-web-app-manifest+json":{"compressible":true,"extensions":["webapp"]},"application/x-www-form-urlencoded":{"source":"iana","compressible":true},"application/x-x509-ca-cert":{"source":"iana","extensions":["der","crt","pem"]},"application/x-x509-ca-ra-cert":{"source":"iana"},"application/x-x509-next-ca-cert":{"source":"iana"},"application/x-xfig":{"source":"apache","extensions":["fig"]},"application/x-xliff+xml":{"source":"apache","compressible":true,"extensions":["xlf"]},"application/x-xpinstall":{"source":"apache","compressible":false,"extensions":["xpi"]},"application/x-xz":{"source":"apache","extensions":["xz"]},"application/x-zmachine":{"source":"apache","extensions":["z1","z2","z3","z4","z5","z6","z7","z8"]},"application/x400-bp":{"source":"iana"},"application/xacml+xml":{"source":"iana","compressible":true},"application/xaml+xml":{"source":"apache","compressible":true,"extensions":["xaml"]},"application/xcap-att+xml":{"source":"iana","compressible":true,"extensions":["xav"]},"application/xcap-caps+xml":{"source":"iana","compressible":true,"extensions":["xca"]},"application/xcap-diff+xml":{"source":"iana","compressible":true,"extensions":["xdf"]},"application/xcap-el+xml":{"source":"iana","compressible":true,"extensions":["xel"]},"application/xcap-error+xml":{"source":"iana","compressible":true},"application/xcap-ns+xml":{"source":"iana","compressible":true,"extensions":["xns"]},"application/xcon-conference-info+xml":{"source":"iana","compressible":true},"application/xcon-conference-info-diff+xml":{"source":"iana","compressible":true},"application/xenc+xml":{"source":"iana","compressible":true,"extensions":["xenc"]},"application/xhtml+xml":{"source":"iana","compressible":true,"extensions":["xhtml","xht"]},"application/xhtml-voice+xml":{"source":"apache","compressible":true},"application/xliff+xml":{"source":"iana","compressible":true,"extensions":["xlf"]},"application/xml":{"source":"iana","compressible":true,"extensions":["xml","xsl","xsd","rng"]},"application/xml-dtd":{"source":"iana","compressible":true,"extensions":["dtd"]},"application/xml-external-parsed-entity":{"source":"iana"},"application/xml-patch+xml":{"source":"iana","compressible":true},"application/xmpp+xml":{"source":"iana","compressible":true},"application/xop+xml":{"source":"iana","compressible":true,"extensions":["xop"]},"application/xproc+xml":{"source":"apache","compressible":true,"extensions":["xpl"]},"application/xslt+xml":{"source":"iana","compressible":true,"extensions":["xsl","xslt"]},"application/xspf+xml":{"source":"apache","compressible":true,"extensions":["xspf"]},"application/xv+xml":{"source":"iana","compressible":true,"extensions":["mxml","xhvml","xvml","xvm"]},"application/yang":{"source":"iana","extensions":["yang"]},"application/yang-data+json":{"source":"iana","compressible":true},"application/yang-data+xml":{"source":"iana","compressible":true},"application/yang-patch+json":{"source":"iana","compressible":true},"application/yang-patch+xml":{"source":"iana","compressible":true},"application/yin+xml":{"source":"iana","compressible":true,"extensions":["yin"]},"application/zip":{"source":"iana","compressible":false,"extensions":["zip"]},"application/zlib":{"source":"iana"},"application/zstd":{"source":"iana"},"audio/1d-interleaved-parityfec":{"source":"iana"},"audio/32kadpcm":{"source":"iana"},"audio/3gpp":{"source":"iana","compressible":false,"extensions":["3gpp"]},"audio/3gpp2":{"source":"iana"},"audio/aac":{"source":"iana"},"audio/ac3":{"source":"iana"},"audio/adpcm":{"source":"apache","extensions":["adp"]},"audio/amr":{"source":"iana","extensions":["amr"]},"audio/amr-wb":{"source":"iana"},"audio/amr-wb+":{"source":"iana"},"audio/aptx":{"source":"iana"},"audio/asc":{"source":"iana"},"audio/atrac-advanced-lossless":{"source":"iana"},"audio/atrac-x":{"source":"iana"},"audio/atrac3":{"source":"iana"},"audio/basic":{"source":"iana","compressible":false,"extensions":["au","snd"]},"audio/bv16":{"source":"iana"},"audio/bv32":{"source":"iana"},"audio/clearmode":{"source":"iana"},"audio/cn":{"source":"iana"},"audio/dat12":{"source":"iana"},"audio/dls":{"source":"iana"},"audio/dsr-es201108":{"source":"iana"},"audio/dsr-es202050":{"source":"iana"},"audio/dsr-es202211":{"source":"iana"},"audio/dsr-es202212":{"source":"iana"},"audio/dv":{"source":"iana"},"audio/dvi4":{"source":"iana"},"audio/eac3":{"source":"iana"},"audio/encaprtp":{"source":"iana"},"audio/evrc":{"source":"iana"},"audio/evrc-qcp":{"source":"iana"},"audio/evrc0":{"source":"iana"},"audio/evrc1":{"source":"iana"},"audio/evrcb":{"source":"iana"},"audio/evrcb0":{"source":"iana"},"audio/evrcb1":{"source":"iana"},"audio/evrcnw":{"source":"iana"},"audio/evrcnw0":{"source":"iana"},"audio/evrcnw1":{"source":"iana"},"audio/evrcwb":{"source":"iana"},"audio/evrcwb0":{"source":"iana"},"audio/evrcwb1":{"source":"iana"},"audio/evs":{"source":"iana"},"audio/flexfec":{"source":"iana"},"audio/fwdred":{"source":"iana"},"audio/g711-0":{"source":"iana"},"audio/g719":{"source":"iana"},"audio/g722":{"source":"iana"},"audio/g7221":{"source":"iana"},"audio/g723":{"source":"iana"},"audio/g726-16":{"source":"iana"},"audio/g726-24":{"source":"iana"},"audio/g726-32":{"source":"iana"},"audio/g726-40":{"source":"iana"},"audio/g728":{"source":"iana"},"audio/g729":{"source":"iana"},"audio/g7291":{"source":"iana"},"audio/g729d":{"source":"iana"},"audio/g729e":{"source":"iana"},"audio/gsm":{"source":"iana"},"audio/gsm-efr":{"source":"iana"},"audio/gsm-hr-08":{"source":"iana"},"audio/ilbc":{"source":"iana"},"audio/ip-mr_v2.5":{"source":"iana"},"audio/isac":{"source":"apache"},"audio/l16":{"source":"iana"},"audio/l20":{"source":"iana"},"audio/l24":{"source":"iana","compressible":false},"audio/l8":{"source":"iana"},"audio/lpc":{"source":"iana"},"audio/melp":{"source":"iana"},"audio/melp1200":{"source":"iana"},"audio/melp2400":{"source":"iana"},"audio/melp600":{"source":"iana"},"audio/mhas":{"source":"iana"},"audio/midi":{"source":"apache","extensions":["mid","midi","kar","rmi"]},"audio/mobile-xmf":{"source":"iana","extensions":["mxmf"]},"audio/mp3":{"compressible":false,"extensions":["mp3"]},"audio/mp4":{"source":"iana","compressible":false,"extensions":["m4a","mp4a"]},"audio/mp4a-latm":{"source":"iana"},"audio/mpa":{"source":"iana"},"audio/mpa-robust":{"source":"iana"},"audio/mpeg":{"source":"iana","compressible":false,"extensions":["mpga","mp2","mp2a","mp3","m2a","m3a"]},"audio/mpeg4-generic":{"source":"iana"},"audio/musepack":{"source":"apache"},"audio/ogg":{"source":"iana","compressible":false,"extensions":["oga","ogg","spx","opus"]},"audio/opus":{"source":"iana"},"audio/parityfec":{"source":"iana"},"audio/pcma":{"source":"iana"},"audio/pcma-wb":{"source":"iana"},"audio/pcmu":{"source":"iana"},"audio/pcmu-wb":{"source":"iana"},"audio/prs.sid":{"source":"iana"},"audio/qcelp":{"source":"iana"},"audio/raptorfec":{"source":"iana"},"audio/red":{"source":"iana"},"audio/rtp-enc-aescm128":{"source":"iana"},"audio/rtp-midi":{"source":"iana"},"audio/rtploopback":{"source":"iana"},"audio/rtx":{"source":"iana"},"audio/s3m":{"source":"apache","extensions":["s3m"]},"audio/scip":{"source":"iana"},"audio/silk":{"source":"apache","extensions":["sil"]},"audio/smv":{"source":"iana"},"audio/smv-qcp":{"source":"iana"},"audio/smv0":{"source":"iana"},"audio/sofa":{"source":"iana"},"audio/sp-midi":{"source":"iana"},"audio/speex":{"source":"iana"},"audio/t140c":{"source":"iana"},"audio/t38":{"source":"iana"},"audio/telephone-event":{"source":"iana"},"audio/tetra_acelp":{"source":"iana"},"audio/tetra_acelp_bb":{"source":"iana"},"audio/tone":{"source":"iana"},"audio/tsvcis":{"source":"iana"},"audio/uemclip":{"source":"iana"},"audio/ulpfec":{"source":"iana"},"audio/usac":{"source":"iana"},"audio/vdvi":{"source":"iana"},"audio/vmr-wb":{"source":"iana"},"audio/vnd.3gpp.iufp":{"source":"iana"},"audio/vnd.4sb":{"source":"iana"},"audio/vnd.audiokoz":{"source":"iana"},"audio/vnd.celp":{"source":"iana"},"audio/vnd.cisco.nse":{"source":"iana"},"audio/vnd.cmles.radio-events":{"source":"iana"},"audio/vnd.cns.anp1":{"source":"iana"},"audio/vnd.cns.inf1":{"source":"iana"},"audio/vnd.dece.audio":{"source":"iana","extensions":["uva","uvva"]},"audio/vnd.digital-winds":{"source":"iana","extensions":["eol"]},"audio/vnd.dlna.adts":{"source":"iana"},"audio/vnd.dolby.heaac.1":{"source":"iana"},"audio/vnd.dolby.heaac.2":{"source":"iana"},"audio/vnd.dolby.mlp":{"source":"iana"},"audio/vnd.dolby.mps":{"source":"iana"},"audio/vnd.dolby.pl2":{"source":"iana"},"audio/vnd.dolby.pl2x":{"source":"iana"},"audio/vnd.dolby.pl2z":{"source":"iana"},"audio/vnd.dolby.pulse.1":{"source":"iana"},"audio/vnd.dra":{"source":"iana","extensions":["dra"]},"audio/vnd.dts":{"source":"iana","extensions":["dts"]},"audio/vnd.dts.hd":{"source":"iana","extensions":["dtshd"]},"audio/vnd.dts.uhd":{"source":"iana"},"audio/vnd.dvb.file":{"source":"iana"},"audio/vnd.everad.plj":{"source":"iana"},"audio/vnd.hns.audio":{"source":"iana"},"audio/vnd.lucent.voice":{"source":"iana","extensions":["lvp"]},"audio/vnd.ms-playready.media.pya":{"source":"iana","extensions":["pya"]},"audio/vnd.nokia.mobile-xmf":{"source":"iana"},"audio/vnd.nortel.vbk":{"source":"iana"},"audio/vnd.nuera.ecelp4800":{"source":"iana","extensions":["ecelp4800"]},"audio/vnd.nuera.ecelp7470":{"source":"iana","extensions":["ecelp7470"]},"audio/vnd.nuera.ecelp9600":{"source":"iana","extensions":["ecelp9600"]},"audio/vnd.octel.sbc":{"source":"iana"},"audio/vnd.presonus.multitrack":{"source":"iana"},"audio/vnd.qcelp":{"source":"iana"},"audio/vnd.rhetorex.32kadpcm":{"source":"iana"},"audio/vnd.rip":{"source":"iana","extensions":["rip"]},"audio/vnd.rn-realaudio":{"compressible":false},"audio/vnd.sealedmedia.softseal.mpeg":{"source":"iana"},"audio/vnd.vmx.cvsd":{"source":"iana"},"audio/vnd.wave":{"compressible":false},"audio/vorbis":{"source":"iana","compressible":false},"audio/vorbis-config":{"source":"iana"},"audio/wav":{"compressible":false,"extensions":["wav"]},"audio/wave":{"compressible":false,"extensions":["wav"]},"audio/webm":{"source":"apache","compressible":false,"extensions":["weba"]},"audio/x-aac":{"source":"apache","compressible":false,"extensions":["aac"]},"audio/x-aiff":{"source":"apache","extensions":["aif","aiff","aifc"]},"audio/x-caf":{"source":"apache","compressible":false,"extensions":["caf"]},"audio/x-flac":{"source":"apache","extensions":["flac"]},"audio/x-m4a":{"source":"nginx","extensions":["m4a"]},"audio/x-matroska":{"source":"apache","extensions":["mka"]},"audio/x-mpegurl":{"source":"apache","extensions":["m3u"]},"audio/x-ms-wax":{"source":"apache","extensions":["wax"]},"audio/x-ms-wma":{"source":"apache","extensions":["wma"]},"audio/x-pn-realaudio":{"source":"apache","extensions":["ram","ra"]},"audio/x-pn-realaudio-plugin":{"source":"apache","extensions":["rmp"]},"audio/x-realaudio":{"source":"nginx","extensions":["ra"]},"audio/x-tta":{"source":"apache"},"audio/x-wav":{"source":"apache","extensions":["wav"]},"audio/xm":{"source":"apache","extensions":["xm"]},"chemical/x-cdx":{"source":"apache","extensions":["cdx"]},"chemical/x-cif":{"source":"apache","extensions":["cif"]},"chemical/x-cmdf":{"source":"apache","extensions":["cmdf"]},"chemical/x-cml":{"source":"apache","extensions":["cml"]},"chemical/x-csml":{"source":"apache","extensions":["csml"]},"chemical/x-pdb":{"source":"apache"},"chemical/x-xyz":{"source":"apache","extensions":["xyz"]},"font/collection":{"source":"iana","extensions":["ttc"]},"font/otf":{"source":"iana","compressible":true,"extensions":["otf"]},"font/sfnt":{"source":"iana"},"font/ttf":{"source":"iana","compressible":true,"extensions":["ttf"]},"font/woff":{"source":"iana","extensions":["woff"]},"font/woff2":{"source":"iana","extensions":["woff2"]},"image/aces":{"source":"iana","extensions":["exr"]},"image/apng":{"compressible":false,"extensions":["apng"]},"image/avci":{"source":"iana","extensions":["avci"]},"image/avcs":{"source":"iana","extensions":["avcs"]},"image/avif":{"source":"iana","compressible":false,"extensions":["avif"]},"image/bmp":{"source":"iana","compressible":true,"extensions":["bmp"]},"image/cgm":{"source":"iana","extensions":["cgm"]},"image/dicom-rle":{"source":"iana","extensions":["drle"]},"image/emf":{"source":"iana","extensions":["emf"]},"image/fits":{"source":"iana","extensions":["fits"]},"image/g3fax":{"source":"iana","extensions":["g3"]},"image/gif":{"source":"iana","compressible":false,"extensions":["gif"]},"image/heic":{"source":"iana","extensions":["heic"]},"image/heic-sequence":{"source":"iana","extensions":["heics"]},"image/heif":{"source":"iana","extensions":["heif"]},"image/heif-sequence":{"source":"iana","extensions":["heifs"]},"image/hej2k":{"source":"iana","extensions":["hej2"]},"image/hsj2":{"source":"iana","extensions":["hsj2"]},"image/ief":{"source":"iana","extensions":["ief"]},"image/jls":{"source":"iana","extensions":["jls"]},"image/jp2":{"source":"iana","compressible":false,"extensions":["jp2","jpg2"]},"image/jpeg":{"source":"iana","compressible":false,"extensions":["jpeg","jpg","jpe"]},"image/jph":{"source":"iana","extensions":["jph"]},"image/jphc":{"source":"iana","extensions":["jhc"]},"image/jpm":{"source":"iana","compressible":false,"extensions":["jpm"]},"image/jpx":{"source":"iana","compressible":false,"extensions":["jpx","jpf"]},"image/jxr":{"source":"iana","extensions":["jxr"]},"image/jxra":{"source":"iana","extensions":["jxra"]},"image/jxrs":{"source":"iana","extensions":["jxrs"]},"image/jxs":{"source":"iana","extensions":["jxs"]},"image/jxsc":{"source":"iana","extensions":["jxsc"]},"image/jxsi":{"source":"iana","extensions":["jxsi"]},"image/jxss":{"source":"iana","extensions":["jxss"]},"image/ktx":{"source":"iana","extensions":["ktx"]},"image/ktx2":{"source":"iana","extensions":["ktx2"]},"image/naplps":{"source":"iana"},"image/pjpeg":{"compressible":false},"image/png":{"source":"iana","compressible":false,"extensions":["png"]},"image/prs.btif":{"source":"iana","extensions":["btif"]},"image/prs.pti":{"source":"iana","extensions":["pti"]},"image/pwg-raster":{"source":"iana"},"image/sgi":{"source":"apache","extensions":["sgi"]},"image/svg+xml":{"source":"iana","compressible":true,"extensions":["svg","svgz"]},"image/t38":{"source":"iana","extensions":["t38"]},"image/tiff":{"source":"iana","compressible":false,"extensions":["tif","tiff"]},"image/tiff-fx":{"source":"iana","extensions":["tfx"]},"image/vnd.adobe.photoshop":{"source":"iana","compressible":true,"extensions":["psd"]},"image/vnd.airzip.accelerator.azv":{"source":"iana","extensions":["azv"]},"image/vnd.cns.inf2":{"source":"iana"},"image/vnd.dece.graphic":{"source":"iana","extensions":["uvi","uvvi","uvg","uvvg"]},"image/vnd.djvu":{"source":"iana","extensions":["djvu","djv"]},"image/vnd.dvb.subtitle":{"source":"iana","extensions":["sub"]},"image/vnd.dwg":{"source":"iana","extensions":["dwg"]},"image/vnd.dxf":{"source":"iana","extensions":["dxf"]},"image/vnd.fastbidsheet":{"source":"iana","extensions":["fbs"]},"image/vnd.fpx":{"source":"iana","extensions":["fpx"]},"image/vnd.fst":{"source":"iana","extensions":["fst"]},"image/vnd.fujixerox.edmics-mmr":{"source":"iana","extensions":["mmr"]},"image/vnd.fujixerox.edmics-rlc":{"source":"iana","extensions":["rlc"]},"image/vnd.globalgraphics.pgb":{"source":"iana"},"image/vnd.microsoft.icon":{"source":"iana","compressible":true,"extensions":["ico"]},"image/vnd.mix":{"source":"iana"},"image/vnd.mozilla.apng":{"source":"iana"},"image/vnd.ms-dds":{"compressible":true,"extensions":["dds"]},"image/vnd.ms-modi":{"source":"iana","extensions":["mdi"]},"image/vnd.ms-photo":{"source":"apache","extensions":["wdp"]},"image/vnd.net-fpx":{"source":"iana","extensions":["npx"]},"image/vnd.pco.b16":{"source":"iana","extensions":["b16"]},"image/vnd.radiance":{"source":"iana"},"image/vnd.sealed.png":{"source":"iana"},"image/vnd.sealedmedia.softseal.gif":{"source":"iana"},"image/vnd.sealedmedia.softseal.jpg":{"source":"iana"},"image/vnd.svf":{"source":"iana"},"image/vnd.tencent.tap":{"source":"iana","extensions":["tap"]},"image/vnd.valve.source.texture":{"source":"iana","extensions":["vtf"]},"image/vnd.wap.wbmp":{"source":"iana","extensions":["wbmp"]},"image/vnd.xiff":{"source":"iana","extensions":["xif"]},"image/vnd.zbrush.pcx":{"source":"iana","extensions":["pcx"]},"image/webp":{"source":"apache","extensions":["webp"]},"image/wmf":{"source":"iana","extensions":["wmf"]},"image/x-3ds":{"source":"apache","extensions":["3ds"]},"image/x-cmu-raster":{"source":"apache","extensions":["ras"]},"image/x-cmx":{"source":"apache","extensions":["cmx"]},"image/x-freehand":{"source":"apache","extensions":["fh","fhc","fh4","fh5","fh7"]},"image/x-icon":{"source":"apache","compressible":true,"extensions":["ico"]},"image/x-jng":{"source":"nginx","extensions":["jng"]},"image/x-mrsid-image":{"source":"apache","extensions":["sid"]},"image/x-ms-bmp":{"source":"nginx","compressible":true,"extensions":["bmp"]},"image/x-pcx":{"source":"apache","extensions":["pcx"]},"image/x-pict":{"source":"apache","extensions":["pic","pct"]},"image/x-portable-anymap":{"source":"apache","extensions":["pnm"]},"image/x-portable-bitmap":{"source":"apache","extensions":["pbm"]},"image/x-portable-graymap":{"source":"apache","extensions":["pgm"]},"image/x-portable-pixmap":{"source":"apache","extensions":["ppm"]},"image/x-rgb":{"source":"apache","extensions":["rgb"]},"image/x-tga":{"source":"apache","extensions":["tga"]},"image/x-xbitmap":{"source":"apache","extensions":["xbm"]},"image/x-xcf":{"compressible":false},"image/x-xpixmap":{"source":"apache","extensions":["xpm"]},"image/x-xwindowdump":{"source":"apache","extensions":["xwd"]},"message/cpim":{"source":"iana"},"message/delivery-status":{"source":"iana"},"message/disposition-notification":{"source":"iana","extensions":["disposition-notification"]},"message/external-body":{"source":"iana"},"message/feedback-report":{"source":"iana"},"message/global":{"source":"iana","extensions":["u8msg"]},"message/global-delivery-status":{"source":"iana","extensions":["u8dsn"]},"message/global-disposition-notification":{"source":"iana","extensions":["u8mdn"]},"message/global-headers":{"source":"iana","extensions":["u8hdr"]},"message/http":{"source":"iana","compressible":false},"message/imdn+xml":{"source":"iana","compressible":true},"message/news":{"source":"iana"},"message/partial":{"source":"iana","compressible":false},"message/rfc822":{"source":"iana","compressible":true,"extensions":["eml","mime"]},"message/s-http":{"source":"iana"},"message/sip":{"source":"iana"},"message/sipfrag":{"source":"iana"},"message/tracking-status":{"source":"iana"},"message/vnd.si.simp":{"source":"iana"},"message/vnd.wfa.wsc":{"source":"iana","extensions":["wsc"]},"model/3mf":{"source":"iana","extensions":["3mf"]},"model/e57":{"source":"iana"},"model/gltf+json":{"source":"iana","compressible":true,"extensions":["gltf"]},"model/gltf-binary":{"source":"iana","compressible":true,"extensions":["glb"]},"model/iges":{"source":"iana","compressible":false,"extensions":["igs","iges"]},"model/mesh":{"source":"iana","compressible":false,"extensions":["msh","mesh","silo"]},"model/mtl":{"source":"iana","extensions":["mtl"]},"model/obj":{"source":"iana","extensions":["obj"]},"model/step":{"source":"iana"},"model/step+xml":{"source":"iana","compressible":true,"extensions":["stpx"]},"model/step+zip":{"source":"iana","compressible":false,"extensions":["stpz"]},"model/step-xml+zip":{"source":"iana","compressible":false,"extensions":["stpxz"]},"model/stl":{"source":"iana","extensions":["stl"]},"model/vnd.collada+xml":{"source":"iana","compressible":true,"extensions":["dae"]},"model/vnd.dwf":{"source":"iana","extensions":["dwf"]},"model/vnd.flatland.3dml":{"source":"iana"},"model/vnd.gdl":{"source":"iana","extensions":["gdl"]},"model/vnd.gs-gdl":{"source":"apache"},"model/vnd.gs.gdl":{"source":"iana"},"model/vnd.gtw":{"source":"iana","extensions":["gtw"]},"model/vnd.moml+xml":{"source":"iana","compressible":true},"model/vnd.mts":{"source":"iana","extensions":["mts"]},"model/vnd.opengex":{"source":"iana","extensions":["ogex"]},"model/vnd.parasolid.transmit.binary":{"source":"iana","extensions":["x_b"]},"model/vnd.parasolid.transmit.text":{"source":"iana","extensions":["x_t"]},"model/vnd.pytha.pyox":{"source":"iana"},"model/vnd.rosette.annotated-data-model":{"source":"iana"},"model/vnd.sap.vds":{"source":"iana","extensions":["vds"]},"model/vnd.usdz+zip":{"source":"iana","compressible":false,"extensions":["usdz"]},"model/vnd.valve.source.compiled-map":{"source":"iana","extensions":["bsp"]},"model/vnd.vtu":{"source":"iana","extensions":["vtu"]},"model/vrml":{"source":"iana","compressible":false,"extensions":["wrl","vrml"]},"model/x3d+binary":{"source":"apache","compressible":false,"extensions":["x3db","x3dbz"]},"model/x3d+fastinfoset":{"source":"iana","extensions":["x3db"]},"model/x3d+vrml":{"source":"apache","compressible":false,"extensions":["x3dv","x3dvz"]},"model/x3d+xml":{"source":"iana","compressible":true,"extensions":["x3d","x3dz"]},"model/x3d-vrml":{"source":"iana","extensions":["x3dv"]},"multipart/alternative":{"source":"iana","compressible":false},"multipart/appledouble":{"source":"iana"},"multipart/byteranges":{"source":"iana"},"multipart/digest":{"source":"iana"},"multipart/encrypted":{"source":"iana","compressible":false},"multipart/form-data":{"source":"iana","compressible":false},"multipart/header-set":{"source":"iana"},"multipart/mixed":{"source":"iana"},"multipart/multilingual":{"source":"iana"},"multipart/parallel":{"source":"iana"},"multipart/related":{"source":"iana","compressible":false},"multipart/report":{"source":"iana"},"multipart/signed":{"source":"iana","compressible":false},"multipart/vnd.bint.med-plus":{"source":"iana"},"multipart/voice-message":{"source":"iana"},"multipart/x-mixed-replace":{"source":"iana"},"text/1d-interleaved-parityfec":{"source":"iana"},"text/cache-manifest":{"source":"iana","compressible":true,"extensions":["appcache","manifest"]},"text/calendar":{"source":"iana","extensions":["ics","ifb"]},"text/calender":{"compressible":true},"text/cmd":{"compressible":true},"text/coffeescript":{"extensions":["coffee","litcoffee"]},"text/cql":{"source":"iana"},"text/cql-expression":{"source":"iana"},"text/cql-identifier":{"source":"iana"},"text/css":{"source":"iana","charset":"UTF-8","compressible":true,"extensions":["css"]},"text/csv":{"source":"iana","compressible":true,"extensions":["csv"]},"text/csv-schema":{"source":"iana"},"text/directory":{"source":"iana"},"text/dns":{"source":"iana"},"text/ecmascript":{"source":"iana"},"text/encaprtp":{"source":"iana"},"text/enriched":{"source":"iana"},"text/fhirpath":{"source":"iana"},"text/flexfec":{"source":"iana"},"text/fwdred":{"source":"iana"},"text/gff3":{"source":"iana"},"text/grammar-ref-list":{"source":"iana"},"text/html":{"source":"iana","compressible":true,"extensions":["html","htm","shtml"]},"text/jade":{"extensions":["jade"]},"text/javascript":{"source":"iana","compressible":true},"text/jcr-cnd":{"source":"iana"},"text/jsx":{"compressible":true,"extensions":["jsx"]},"text/less":{"compressible":true,"extensions":["less"]},"text/markdown":{"source":"iana","compressible":true,"extensions":["markdown","md"]},"text/mathml":{"source":"nginx","extensions":["mml"]},"text/mdx":{"compressible":true,"extensions":["mdx"]},"text/mizar":{"source":"iana"},"text/n3":{"source":"iana","charset":"UTF-8","compressible":true,"extensions":["n3"]},"text/parameters":{"source":"iana","charset":"UTF-8"},"text/parityfec":{"source":"iana"},"text/plain":{"source":"iana","compressible":true,"extensions":["txt","text","conf","def","list","log","in","ini"]},"text/provenance-notation":{"source":"iana","charset":"UTF-8"},"text/prs.fallenstein.rst":{"source":"iana"},"text/prs.lines.tag":{"source":"iana","extensions":["dsc"]},"text/prs.prop.logic":{"source":"iana"},"text/raptorfec":{"source":"iana"},"text/red":{"source":"iana"},"text/rfc822-headers":{"source":"iana"},"text/richtext":{"source":"iana","compressible":true,"extensions":["rtx"]},"text/rtf":{"source":"iana","compressible":true,"extensions":["rtf"]},"text/rtp-enc-aescm128":{"source":"iana"},"text/rtploopback":{"source":"iana"},"text/rtx":{"source":"iana"},"text/sgml":{"source":"iana","extensions":["sgml","sgm"]},"text/shaclc":{"source":"iana"},"text/shex":{"source":"iana","extensions":["shex"]},"text/slim":{"extensions":["slim","slm"]},"text/spdx":{"source":"iana","extensions":["spdx"]},"text/strings":{"source":"iana"},"text/stylus":{"extensions":["stylus","styl"]},"text/t140":{"source":"iana"},"text/tab-separated-values":{"source":"iana","compressible":true,"extensions":["tsv"]},"text/troff":{"source":"iana","extensions":["t","tr","roff","man","me","ms"]},"text/turtle":{"source":"iana","charset":"UTF-8","extensions":["ttl"]},"text/ulpfec":{"source":"iana"},"text/uri-list":{"source":"iana","compressible":true,"extensions":["uri","uris","urls"]},"text/vcard":{"source":"iana","compressible":true,"extensions":["vcard"]},"text/vnd.a":{"source":"iana"},"text/vnd.abc":{"source":"iana"},"text/vnd.ascii-art":{"source":"iana"},"text/vnd.curl":{"source":"iana","extensions":["curl"]},"text/vnd.curl.dcurl":{"source":"apache","extensions":["dcurl"]},"text/vnd.curl.mcurl":{"source":"apache","extensions":["mcurl"]},"text/vnd.curl.scurl":{"source":"apache","extensions":["scurl"]},"text/vnd.debian.copyright":{"source":"iana","charset":"UTF-8"},"text/vnd.dmclientscript":{"source":"iana"},"text/vnd.dvb.subtitle":{"source":"iana","extensions":["sub"]},"text/vnd.esmertec.theme-descriptor":{"source":"iana","charset":"UTF-8"},"text/vnd.familysearch.gedcom":{"source":"iana","extensions":["ged"]},"text/vnd.ficlab.flt":{"source":"iana"},"text/vnd.fly":{"source":"iana","extensions":["fly"]},"text/vnd.fmi.flexstor":{"source":"iana","extensions":["flx"]},"text/vnd.gml":{"source":"iana"},"text/vnd.graphviz":{"source":"iana","extensions":["gv"]},"text/vnd.hans":{"source":"iana"},"text/vnd.hgl":{"source":"iana"},"text/vnd.in3d.3dml":{"source":"iana","extensions":["3dml"]},"text/vnd.in3d.spot":{"source":"iana","extensions":["spot"]},"text/vnd.iptc.newsml":{"source":"iana"},"text/vnd.iptc.nitf":{"source":"iana"},"text/vnd.latex-z":{"source":"iana"},"text/vnd.motorola.reflex":{"source":"iana"},"text/vnd.ms-mediapackage":{"source":"iana"},"text/vnd.net2phone.commcenter.command":{"source":"iana"},"text/vnd.radisys.msml-basic-layout":{"source":"iana"},"text/vnd.senx.warpscript":{"source":"iana"},"text/vnd.si.uricatalogue":{"source":"iana"},"text/vnd.sosi":{"source":"iana"},"text/vnd.sun.j2me.app-descriptor":{"source":"iana","charset":"UTF-8","extensions":["jad"]},"text/vnd.trolltech.linguist":{"source":"iana","charset":"UTF-8"},"text/vnd.wap.si":{"source":"iana"},"text/vnd.wap.sl":{"source":"iana"},"text/vnd.wap.wml":{"source":"iana","extensions":["wml"]},"text/vnd.wap.wmlscript":{"source":"iana","extensions":["wmls"]},"text/vtt":{"source":"iana","charset":"UTF-8","compressible":true,"extensions":["vtt"]},"text/x-asm":{"source":"apache","extensions":["s","asm"]},"text/x-c":{"source":"apache","extensions":["c","cc","cxx","cpp","h","hh","dic"]},"text/x-component":{"source":"nginx","extensions":["htc"]},"text/x-fortran":{"source":"apache","extensions":["f","for","f77","f90"]},"text/x-gwt-rpc":{"compressible":true},"text/x-handlebars-template":{"extensions":["hbs"]},"text/x-java-source":{"source":"apache","extensions":["java"]},"text/x-jquery-tmpl":{"compressible":true},"text/x-lua":{"extensions":["lua"]},"text/x-markdown":{"compressible":true,"extensions":["mkd"]},"text/x-nfo":{"source":"apache","extensions":["nfo"]},"text/x-opml":{"source":"apache","extensions":["opml"]},"text/x-org":{"compressible":true,"extensions":["org"]},"text/x-pascal":{"source":"apache","extensions":["p","pas"]},"text/x-processing":{"compressible":true,"extensions":["pde"]},"text/x-sass":{"extensions":["sass"]},"text/x-scss":{"extensions":["scss"]},"text/x-setext":{"source":"apache","extensions":["etx"]},"text/x-sfv":{"source":"apache","extensions":["sfv"]},"text/x-suse-ymp":{"compressible":true,"extensions":["ymp"]},"text/x-uuencode":{"source":"apache","extensions":["uu"]},"text/x-vcalendar":{"source":"apache","extensions":["vcs"]},"text/x-vcard":{"source":"apache","extensions":["vcf"]},"text/xml":{"source":"iana","compressible":true,"extensions":["xml"]},"text/xml-external-parsed-entity":{"source":"iana"},"text/yaml":{"compressible":true,"extensions":["yaml","yml"]},"video/1d-interleaved-parityfec":{"source":"iana"},"video/3gpp":{"source":"iana","extensions":["3gp","3gpp"]},"video/3gpp-tt":{"source":"iana"},"video/3gpp2":{"source":"iana","extensions":["3g2"]},"video/av1":{"source":"iana"},"video/bmpeg":{"source":"iana"},"video/bt656":{"source":"iana"},"video/celb":{"source":"iana"},"video/dv":{"source":"iana"},"video/encaprtp":{"source":"iana"},"video/ffv1":{"source":"iana"},"video/flexfec":{"source":"iana"},"video/h261":{"source":"iana","extensions":["h261"]},"video/h263":{"source":"iana","extensions":["h263"]},"video/h263-1998":{"source":"iana"},"video/h263-2000":{"source":"iana"},"video/h264":{"source":"iana","extensions":["h264"]},"video/h264-rcdo":{"source":"iana"},"video/h264-svc":{"source":"iana"},"video/h265":{"source":"iana"},"video/iso.segment":{"source":"iana","extensions":["m4s"]},"video/jpeg":{"source":"iana","extensions":["jpgv"]},"video/jpeg2000":{"source":"iana"},"video/jpm":{"source":"apache","extensions":["jpm","jpgm"]},"video/jxsv":{"source":"iana"},"video/mj2":{"source":"iana","extensions":["mj2","mjp2"]},"video/mp1s":{"source":"iana"},"video/mp2p":{"source":"iana"},"video/mp2t":{"source":"iana","extensions":["ts"]},"video/mp4":{"source":"iana","compressible":false,"extensions":["mp4","mp4v","mpg4"]},"video/mp4v-es":{"source":"iana"},"video/mpeg":{"source":"iana","compressible":false,"extensions":["mpeg","mpg","mpe","m1v","m2v"]},"video/mpeg4-generic":{"source":"iana"},"video/mpv":{"source":"iana"},"video/nv":{"source":"iana"},"video/ogg":{"source":"iana","compressible":false,"extensions":["ogv"]},"video/parityfec":{"source":"iana"},"video/pointer":{"source":"iana"},"video/quicktime":{"source":"iana","compressible":false,"extensions":["qt","mov"]},"video/raptorfec":{"source":"iana"},"video/raw":{"source":"iana"},"video/rtp-enc-aescm128":{"source":"iana"},"video/rtploopback":{"source":"iana"},"video/rtx":{"source":"iana"},"video/scip":{"source":"iana"},"video/smpte291":{"source":"iana"},"video/smpte292m":{"source":"iana"},"video/ulpfec":{"source":"iana"},"video/vc1":{"source":"iana"},"video/vc2":{"source":"iana"},"video/vnd.cctv":{"source":"iana"},"video/vnd.dece.hd":{"source":"iana","extensions":["uvh","uvvh"]},"video/vnd.dece.mobile":{"source":"iana","extensions":["uvm","uvvm"]},"video/vnd.dece.mp4":{"source":"iana"},"video/vnd.dece.pd":{"source":"iana","extensions":["uvp","uvvp"]},"video/vnd.dece.sd":{"source":"iana","extensions":["uvs","uvvs"]},"video/vnd.dece.video":{"source":"iana","extensions":["uvv","uvvv"]},"video/vnd.directv.mpeg":{"source":"iana"},"video/vnd.directv.mpeg-tts":{"source":"iana"},"video/vnd.dlna.mpeg-tts":{"source":"iana"},"video/vnd.dvb.file":{"source":"iana","extensions":["dvb"]},"video/vnd.fvt":{"source":"iana","extensions":["fvt"]},"video/vnd.hns.video":{"source":"iana"},"video/vnd.iptvforum.1dparityfec-1010":{"source":"iana"},"video/vnd.iptvforum.1dparityfec-2005":{"source":"iana"},"video/vnd.iptvforum.2dparityfec-1010":{"source":"iana"},"video/vnd.iptvforum.2dparityfec-2005":{"source":"iana"},"video/vnd.iptvforum.ttsavc":{"source":"iana"},"video/vnd.iptvforum.ttsmpeg2":{"source":"iana"},"video/vnd.motorola.video":{"source":"iana"},"video/vnd.motorola.videop":{"source":"iana"},"video/vnd.mpegurl":{"source":"iana","extensions":["mxu","m4u"]},"video/vnd.ms-playready.media.pyv":{"source":"iana","extensions":["pyv"]},"video/vnd.nokia.interleaved-multimedia":{"source":"iana"},"video/vnd.nokia.mp4vr":{"source":"iana"},"video/vnd.nokia.videovoip":{"source":"iana"},"video/vnd.objectvideo":{"source":"iana"},"video/vnd.radgamettools.bink":{"source":"iana"},"video/vnd.radgamettools.smacker":{"source":"iana"},"video/vnd.sealed.mpeg1":{"source":"iana"},"video/vnd.sealed.mpeg4":{"source":"iana"},"video/vnd.sealed.swf":{"source":"iana"},"video/vnd.sealedmedia.softseal.mov":{"source":"iana"},"video/vnd.uvvu.mp4":{"source":"iana","extensions":["uvu","uvvu"]},"video/vnd.vivo":{"source":"iana","extensions":["viv"]},"video/vnd.youtube.yt":{"source":"iana"},"video/vp8":{"source":"iana"},"video/vp9":{"source":"iana"},"video/webm":{"source":"apache","compressible":false,"extensions":["webm"]},"video/x-f4v":{"source":"apache","extensions":["f4v"]},"video/x-fli":{"source":"apache","extensions":["fli"]},"video/x-flv":{"source":"apache","compressible":false,"extensions":["flv"]},"video/x-m4v":{"source":"apache","extensions":["m4v"]},"video/x-matroska":{"source":"apache","compressible":false,"extensions":["mkv","mk3d","mks"]},"video/x-mng":{"source":"apache","extensions":["mng"]},"video/x-ms-asf":{"source":"apache","extensions":["asf","asx"]},"video/x-ms-vob":{"source":"apache","extensions":["vob"]},"video/x-ms-wm":{"source":"apache","extensions":["wm"]},"video/x-ms-wmv":{"source":"apache","compressible":false,"extensions":["wmv"]},"video/x-ms-wmx":{"source":"apache","extensions":["wmx"]},"video/x-ms-wvx":{"source":"apache","extensions":["wvx"]},"video/x-msvideo":{"source":"apache","extensions":["avi"]},"video/x-sgi-movie":{"source":"apache","extensions":["movie"]},"video/x-smv":{"source":"apache","extensions":["smv"]},"x-conference/x-cooltalk":{"source":"apache","extensions":["ice"]},"x-shader/x-fragment":{"compressible":true},"x-shader/x-vertex":{"compressible":true}}'
    );
  }
};
var m = {};
function __nccwpck_require__(r) {
  var v = m[r];
  if (v !== undefined) {
    return v.exports;
  }
  var b = (m[r] = { exports: {} });
  var x = true;
  try {
    u[r](b, b.exports, __nccwpck_require__);
    x = false;
  } finally {
    if (x) delete m[r];
  }
  return b.exports;
}
(() => {
  __nccwpck_require__.d = (r, u) => {
    for (var m in u) {
      if (__nccwpck_require__.o(u, m) && !__nccwpck_require__.o(r, m)) {
        Object.defineProperty(r, m, { enumerable: true, get: u[m] });
      }
    }
  };
})();
(() => {
  __nccwpck_require__.o = (r, u) => Object.prototype.hasOwnProperty.call(r, u);
})();
(() => {
  __nccwpck_require__.r = r => {
    if (typeof Symbol !== 'undefined' && Symbol.toStringTag) {
      Object.defineProperty(r, Symbol.toStringTag, { value: 'Module' });
    }
    Object.defineProperty(r, '__esModule', { value: true });
  };
})();
if (typeof __nccwpck_require__ !== 'undefined')
  __nccwpck_require__.ab =
    new URL('.', import.meta.url).pathname.slice(
      import.meta.url.match(/^file:\/\/\/\w:/) ? 1 : 0,
      -1
    ) + '/';
var v = {};
__nccwpck_require__.d(v, { M: () => ku });
var b = {};
__nccwpck_require__.r(b);
__nccwpck_require__.d(b, {
  hasBrowserEnv: () => De,
  hasStandardBrowserEnv: () => Ae,
  hasStandardBrowserWebWorkerEnv: () => Ne,
  navigator: () => Te,
  origin: () => Re
});
var x = {};
__nccwpck_require__.r(x);
__nccwpck_require__.d(x, {
  BIGINT_FORMAT_RANGES: () => gn,
  Class: () => Class,
  NUMBER_FORMAT_RANGES: () => hn,
  aborted: () => aborted,
  allowsEval: () => dn,
  assert: () => assert,
  assertEqual: () => assertEqual,
  assertIs: () => assertIs,
  assertNever: () => assertNever,
  assertNotEqual: () => assertNotEqual,
  assignProp: () => assignProp,
  base64ToUint8Array: () => base64ToUint8Array,
  base64urlToUint8Array: () => base64urlToUint8Array,
  cached: () => cached,
  captureStackTrace: () => pn,
  cleanEnum: () => cleanEnum,
  cleanRegex: () => cleanRegex,
  clone: () => clone,
  cloneDef: () => cloneDef,
  createTransparentProxy: () => createTransparentProxy,
  defineLazy: () => defineLazy,
  esc: () => esc,
  escapeRegex: () => escapeRegex,
  extend: () => util_extend,
  finalizeIssue: () => finalizeIssue,
  floatSafeRemainder: () => floatSafeRemainder,
  getElementAtPath: () => getElementAtPath,
  getEnumValues: () => getEnumValues,
  getLengthableOrigin: () => getLengthableOrigin,
  getParsedType: () => getParsedType,
  getSizableOrigin: () => getSizableOrigin,
  hexToUint8Array: () => hexToUint8Array,
  isObject: () => util_isObject,
  isPlainObject: () => util_isPlainObject,
  issue: () => util_issue,
  joinValues: () => joinValues,
  jsonStringifyReplacer: () => jsonStringifyReplacer,
  merge: () => util_merge,
  mergeDefs: () => mergeDefs,
  normalizeParams: () => normalizeParams,
  nullish: () => nullish,
  numKeys: () => numKeys,
  objectClone: () => objectClone,
  omit: () => omit,
  optionalKeys: () => optionalKeys,
  parsedType: () => parsedType,
  partial: () => partial,
  pick: () => pick,
  prefixIssues: () => prefixIssues,
  primitiveTypes: () => fn,
  promiseAllObject: () => promiseAllObject,
  propertyKeyTypes: () => mn,
  randomString: () => randomString,
  required: () => required,
  safeExtend: () => safeExtend,
  shallowClone: () => shallowClone,
  slugify: () => slugify,
  stringifyPrimitive: () => stringifyPrimitive,
  uint8ArrayToBase64: () => uint8ArrayToBase64,
  uint8ArrayToBase64url: () => uint8ArrayToBase64url,
  uint8ArrayToHex: () => uint8ArrayToHex,
  unwrapMessage: () => unwrapMessage
});
var w = {};
__nccwpck_require__.r(w);
__nccwpck_require__.d(w, {
  base64: () => ei,
  base64url: () => ti,
  bigint: () => si,
  boolean: () => li,
  browserEmail: () => Wn,
  cidrv4: () => Yn,
  cidrv6: () => Qn,
  cuid: () => Un,
  cuid2: () => En,
  date: () => oi,
  datetime: () => datetime,
  domain: () => ii,
  duration: () => Rn,
  e164: () => ai,
  email: () => Bn,
  emoji: () => emoji,
  extendedDuration: () => Cn,
  guid: () => Ln,
  hex: () => gi,
  hostname: () => ni,
  html5Email: () => Vn,
  idnEmail: () => Kn,
  integer: () => ci,
  ipv4: () => Hn,
  ipv6: () => Xn,
  ksuid: () => An,
  lowercase: () => mi,
  mac: () => mac,
  md5_base64: () => yi,
  md5_base64url: () => xi,
  md5_hex: () => bi,
  nanoid: () => Nn,
  null: () => pi,
  number: () => ui,
  rfc5322Email: () => Mn,
  sha1_base64: () => wi,
  sha1_base64url: () => $i,
  sha1_hex: () => _i,
  sha256_base64: () => Si,
  sha256_base64url: () => Ii,
  sha256_hex: () => ki,
  sha384_base64: () => ji,
  sha384_base64url: () => Oi,
  sha384_hex: () => zi,
  sha512_base64: () => Ui,
  sha512_base64url: () => Ei,
  sha512_hex: () => Pi,
  string: () => string,
  time: () => time,
  ulid: () => Dn,
  undefined: () => di,
  unicodeEmail: () => Jn,
  uppercase: () => hi,
  uuid: () => uuid,
  uuid4: () => Zn,
  uuid6: () => Fn,
  uuid7: () => qn,
  xid: () => Tn
});
var $ = {};
__nccwpck_require__.r($);
__nccwpck_require__.d($, {
  ar: () => ar,
  az: () => az,
  be: () => be,
  bg: () => bg,
  ca: () => ca,
  cs: () => cs,
  da: () => da,
  de: () => de,
  en: () => en,
  eo: () => eo,
  es: () => es,
  fa: () => fa,
  fi: () => fi,
  fr: () => fr,
  frCA: () => fr_CA,
  he: () => he,
  hu: () => hu,
  hy: () => hy,
  id: () => id,
  is: () => is,
  it: () => it,
  ja: () => ja,
  ka: () => ka,
  kh: () => kh,
  km: () => km,
  ko: () => ko,
  lt: () => lt,
  mk: () => mk,
  ms: () => ms,
  nl: () => nl,
  no: () => no,
  ota: () => ota,
  pl: () => pl,
  ps: () => ps,
  pt: () => pt,
  ru: () => ru,
  sl: () => sl,
  sv: () => sv,
  ta: () => ta,
  th: () => th,
  tr: () => tr,
  ua: () => ua,
  uk: () => uk,
  ur: () => ur,
  uz: () => uz,
  vi: () => vi,
  yo: () => yo,
  zhCN: () => zh_CN,
  zhTW: () => zh_TW
});
var k = {};
__nccwpck_require__.r(k);
var S = {};
__nccwpck_require__.r(S);
__nccwpck_require__.d(S, {
  $ZodAny: () => Ja,
  $ZodArray: () => Xa,
  $ZodAsyncError: () => $ZodAsyncError,
  $ZodBase64: () => Da,
  $ZodBase64URL: () => Ta,
  $ZodBigInt: () => Fa,
  $ZodBigIntFormat: () => qa,
  $ZodBoolean: () => Za,
  $ZodCIDRv4: () => Ua,
  $ZodCIDRv6: () => Ea,
  $ZodCUID: () => va,
  $ZodCUID2: () => ba,
  $ZodCatch: () => $r,
  $ZodCheck: () => Di,
  $ZodCheckBigIntFormat: () => Li,
  $ZodCheckEndsWith: () => Yi,
  $ZodCheckGreaterThan: () => Ni,
  $ZodCheckIncludes: () => Hi,
  $ZodCheckLengthEquals: () => Mi,
  $ZodCheckLessThan: () => Ai,
  $ZodCheckLowerCase: () => Wi,
  $ZodCheckMaxLength: () => Bi,
  $ZodCheckMaxSize: () => Zi,
  $ZodCheckMimeType: () => ea,
  $ZodCheckMinLength: () => Vi,
  $ZodCheckMinSize: () => Fi,
  $ZodCheckMultipleOf: () => Ri,
  $ZodCheckNumberFormat: () => Ci,
  $ZodCheckOverwrite: () => na,
  $ZodCheckProperty: () => Qi,
  $ZodCheckRegex: () => Ki,
  $ZodCheckSizeEquals: () => qi,
  $ZodCheckStartsWith: () => Xi,
  $ZodCheckStringFormat: () => Ji,
  $ZodCheckUpperCase: () => Gi,
  $ZodCodec: () => Ir,
  $ZodCustom: () => Er,
  $ZodCustomStringFormat: () => Ra,
  $ZodDate: () => Ha,
  $ZodDefault: () => yr,
  $ZodDiscriminatedUnion: () => ir,
  $ZodE164: () => Aa,
  $ZodEmail: () => pa,
  $ZodEmoji: () => ha,
  $ZodEncodeError: () => $ZodEncodeError,
  $ZodEnum: () => pr,
  $ZodError: () => vn,
  $ZodExactOptional: () => vr,
  $ZodFile: () => mr,
  $ZodFunction: () => Or,
  $ZodGUID: () => sa,
  $ZodIPv4: () => za,
  $ZodIPv6: () => Oa,
  $ZodISODate: () => $a,
  $ZodISODateTime: () => wa,
  $ZodISODuration: () => Ia,
  $ZodISOTime: () => Sa,
  $ZodIntersection: () => rr,
  $ZodJWT: () => Na,
  $ZodKSUID: () => _a,
  $ZodLazy: () => Ur,
  $ZodLiteral: () => dr,
  $ZodMAC: () => Pa,
  $ZodMap: () => cr,
  $ZodNaN: () => kr,
  $ZodNanoID: () => ga,
  $ZodNever: () => Wa,
  $ZodNonOptional: () => _r,
  $ZodNull: () => Ma,
  $ZodNullable: () => br,
  $ZodNumber: () => Ca,
  $ZodNumberFormat: () => La,
  $ZodObject: () => Ya,
  $ZodObjectJIT: () => Qa,
  $ZodOptional: () => gr,
  $ZodPipe: () => Sr,
  $ZodPrefault: () => xr,
  $ZodPromise: () => Pr,
  $ZodReadonly: () => zr,
  $ZodRealError: () => bn,
  $ZodRecord: () => sr,
  $ZodRegistry: () => $ZodRegistry,
  $ZodSet: () => lr,
  $ZodString: () => ra,
  $ZodStringFormat: () => oa,
  $ZodSuccess: () => wr,
  $ZodSymbol: () => Ba,
  $ZodTemplateLiteral: () => jr,
  $ZodTransform: () => hr,
  $ZodTuple: () => or,
  $ZodType: () => aa,
  $ZodULID: () => ya,
  $ZodURL: () => ma,
  $ZodUUID: () => la,
  $ZodUndefined: () => Va,
  $ZodUnion: () => er,
  $ZodUnknown: () => Ka,
  $ZodVoid: () => Ga,
  $ZodXID: () => xa,
  $ZodXor: () => nr,
  $brand: () => cn,
  $constructor: () => $constructor,
  $input: () => Ar,
  $output: () => Tr,
  Doc: () => Doc,
  JSONSchema: () => k,
  JSONSchemaGenerator: () => JSONSchemaGenerator,
  NEVER: () => sn,
  TimePrecision: () => Rr,
  _any: () => _any,
  _array: () => _array,
  _base64: () => _base64,
  _base64url: () => _base64url,
  _bigint: () => _bigint,
  _boolean: () => _boolean,
  _catch: () => _catch,
  _check: () => _check,
  _cidrv4: () => _cidrv4,
  _cidrv6: () => _cidrv6,
  _coercedBigint: () => _coercedBigint,
  _coercedBoolean: () => _coercedBoolean,
  _coercedDate: () => _coercedDate,
  _coercedNumber: () => _coercedNumber,
  _coercedString: () => _coercedString,
  _cuid: () => _cuid,
  _cuid2: () => _cuid2,
  _custom: () => _custom,
  _date: () => _date,
  _decode: () => _decode,
  _decodeAsync: () => _decodeAsync,
  _default: () => _default,
  _discriminatedUnion: () => _discriminatedUnion,
  _e164: () => _e164,
  _email: () => _email,
  _emoji: () => api_emoji,
  _encode: () => _encode,
  _encodeAsync: () => _encodeAsync,
  _endsWith: () => _endsWith,
  _enum: () => _enum,
  _file: () => _file,
  _float32: () => _float32,
  _float64: () => _float64,
  _gt: () => _gt,
  _gte: () => _gte,
  _guid: () => _guid,
  _includes: () => _includes,
  _int: () => _int,
  _int32: () => _int32,
  _int64: () => _int64,
  _intersection: () => _intersection,
  _ipv4: () => _ipv4,
  _ipv6: () => _ipv6,
  _isoDate: () => _isoDate,
  _isoDateTime: () => _isoDateTime,
  _isoDuration: () => _isoDuration,
  _isoTime: () => _isoTime,
  _jwt: () => _jwt,
  _ksuid: () => _ksuid,
  _lazy: () => _lazy,
  _length: () => _length,
  _literal: () => _literal,
  _lowercase: () => _lowercase,
  _lt: () => _lt,
  _lte: () => _lte,
  _mac: () => _mac,
  _map: () => _map,
  _max: () => _lte,
  _maxLength: () => _maxLength,
  _maxSize: () => _maxSize,
  _mime: () => _mime,
  _min: () => _gte,
  _minLength: () => _minLength,
  _minSize: () => _minSize,
  _multipleOf: () => _multipleOf,
  _nan: () => _nan,
  _nanoid: () => _nanoid,
  _nativeEnum: () => _nativeEnum,
  _negative: () => _negative,
  _never: () => _never,
  _nonnegative: () => _nonnegative,
  _nonoptional: () => _nonoptional,
  _nonpositive: () => _nonpositive,
  _normalize: () => _normalize,
  _null: () => api_null,
  _nullable: () => _nullable,
  _number: () => _number,
  _optional: () => _optional,
  _overwrite: () => _overwrite,
  _parse: () => _parse,
  _parseAsync: () => _parseAsync,
  _pipe: () => _pipe,
  _positive: () => _positive,
  _promise: () => _promise,
  _property: () => _property,
  _readonly: () => _readonly,
  _record: () => _record,
  _refine: () => _refine,
  _regex: () => _regex,
  _safeDecode: () => _safeDecode,
  _safeDecodeAsync: () => _safeDecodeAsync,
  _safeEncode: () => _safeEncode,
  _safeEncodeAsync: () => _safeEncodeAsync,
  _safeParse: () => _safeParse,
  _safeParseAsync: () => _safeParseAsync,
  _set: () => _set,
  _size: () => _size,
  _slugify: () => _slugify,
  _startsWith: () => _startsWith,
  _string: () => _string,
  _stringFormat: () => _stringFormat,
  _stringbool: () => _stringbool,
  _success: () => _success,
  _superRefine: () => _superRefine,
  _symbol: () => _symbol,
  _templateLiteral: () => _templateLiteral,
  _toLowerCase: () => _toLowerCase,
  _toUpperCase: () => _toUpperCase,
  _transform: () => _transform,
  _trim: () => _trim,
  _tuple: () => _tuple,
  _uint32: () => _uint32,
  _uint64: () => _uint64,
  _ulid: () => _ulid,
  _undefined: () => api_undefined,
  _union: () => _union,
  _unknown: () => _unknown,
  _uppercase: () => _uppercase,
  _url: () => _url,
  _uuid: () => _uuid,
  _uuidv4: () => _uuidv4,
  _uuidv6: () => _uuidv6,
  _uuidv7: () => _uuidv7,
  _void: () => _void,
  _xid: () => _xid,
  _xor: () => _xor,
  clone: () => clone,
  config: () => config,
  createStandardJSONSchemaMethod: () => createStandardJSONSchemaMethod,
  createToJSONSchemaMethod: () => createToJSONSchemaMethod,
  decode: () => kn,
  decodeAsync: () => In,
  describe: () => describe,
  encode: () => $n,
  encodeAsync: () => Sn,
  extractDefs: () => extractDefs,
  finalize: () => finalize,
  flattenError: () => flattenError,
  formatError: () => formatError,
  globalConfig: () => un,
  globalRegistry: () => Nr,
  initializeContext: () => initializeContext,
  isValidBase64: () => isValidBase64,
  isValidBase64URL: () => isValidBase64URL,
  isValidJWT: () => isValidJWT,
  locales: () => $,
  meta: () => meta,
  parse: () => yn,
  parseAsync: () => xn,
  prettifyError: () => prettifyError,
  process: () => to_json_schema_process,
  regexes: () => w,
  registry: () => registry,
  safeDecode: () => jn,
  safeDecodeAsync: () => Pn,
  safeEncode: () => zn,
  safeEncodeAsync: () => On,
  safeParse: () => _n,
  safeParseAsync: () => wn,
  toDotPath: () => toDotPath,
  toJSONSchema: () => toJSONSchema,
  treeifyError: () => treeifyError,
  util: () => x,
  version: () => ia
});
var I = {};
__nccwpck_require__.r(I);
__nccwpck_require__.d(I, {
  endsWith: () => _endsWith,
  gt: () => _gt,
  gte: () => _gte,
  includes: () => _includes,
  length: () => _length,
  lowercase: () => _lowercase,
  lt: () => _lt,
  lte: () => _lte,
  maxLength: () => _maxLength,
  maxSize: () => _maxSize,
  mime: () => _mime,
  minLength: () => _minLength,
  minSize: () => _minSize,
  multipleOf: () => _multipleOf,
  negative: () => _negative,
  nonnegative: () => _nonnegative,
  nonpositive: () => _nonpositive,
  normalize: () => _normalize,
  overwrite: () => _overwrite,
  positive: () => _positive,
  property: () => _property,
  regex: () => _regex,
  size: () => _size,
  slugify: () => _slugify,
  startsWith: () => _startsWith,
  toLowerCase: () => _toLowerCase,
  toUpperCase: () => _toUpperCase,
  trim: () => _trim,
  uppercase: () => _uppercase
});
var z = {};
__nccwpck_require__.r(z);
__nccwpck_require__.d(z, {
  ZodISODate: () => Fr,
  ZodISODateTime: () => Zr,
  ZodISODuration: () => Br,
  ZodISOTime: () => qr,
  date: () => iso_date,
  datetime: () => iso_datetime,
  duration: () => iso_duration,
  time: () => iso_time
});
var j = {};
__nccwpck_require__.r(j);
__nccwpck_require__.d(j, {
  ZodAny: () => qo,
  ZodArray: () => Ko,
  ZodBase64: () => Oo,
  ZodBase64URL: () => Po,
  ZodBigInt: () => Ro,
  ZodBigIntFormat: () => Co,
  ZodBoolean: () => No,
  ZodCIDRv4: () => zo,
  ZodCIDRv6: () => jo,
  ZodCUID: () => vo,
  ZodCUID2: () => bo,
  ZodCatch: () => ys,
  ZodCodec: () => ws,
  ZodCustom: () => js,
  ZodCustomStringFormat: () => Do,
  ZodDate: () => Jo,
  ZodDefault: () => hs,
  ZodDiscriminatedUnion: () => Xo,
  ZodE164: () => Uo,
  ZodEmail: () => lo,
  ZodEmoji: () => ho,
  ZodEnum: () => rs,
  ZodExactOptional: () => ds,
  ZodFile: () => ss,
  ZodFunction: () => zs,
  ZodGUID: () => po,
  ZodIPv4: () => $o,
  ZodIPv6: () => Io,
  ZodIntersection: () => Yo,
  ZodJWT: () => Eo,
  ZodKSUID: () => wo,
  ZodLazy: () => Ss,
  ZodLiteral: () => os,
  ZodMAC: () => So,
  ZodMap: () => ns,
  ZodNaN: () => xs,
  ZodNanoID: () => go,
  ZodNever: () => Vo,
  ZodNonOptional: () => vs,
  ZodNull: () => Fo,
  ZodNullable: () => fs,
  ZodNumber: () => To,
  ZodNumberFormat: () => Ao,
  ZodObject: () => Wo,
  ZodOptional: () => ls,
  ZodPipe: () => _s,
  ZodPrefault: () => gs,
  ZodPromise: () => Is,
  ZodReadonly: () => $s,
  ZodRecord: () => ts,
  ZodSet: () => as,
  ZodString: () => co,
  ZodStringFormat: () => uo,
  ZodSuccess: () => bs,
  ZodSymbol: () => Lo,
  ZodTemplateLiteral: () => ks,
  ZodTransform: () => us,
  ZodTuple: () => Qo,
  ZodType: () => oo,
  ZodULID: () => xo,
  ZodURL: () => fo,
  ZodUUID: () => mo,
  ZodUndefined: () => Zo,
  ZodUnion: () => Go,
  ZodUnknown: () => Bo,
  ZodVoid: () => Mo,
  ZodXID: () => _o,
  ZodXor: () => Ho,
  _ZodString: () => so,
  _default: () => schemas_default,
  _function: () => _function,
  any: () => any,
  array: () => array,
  base64: () => schemas_base64,
  base64url: () => schemas_base64url,
  bigint: () => schemas_bigint,
  boolean: () => schemas_boolean,
  catch: () => schemas_catch,
  check: () => check,
  cidrv4: () => schemas_cidrv4,
  cidrv6: () => schemas_cidrv6,
  codec: () => codec,
  cuid: () => schemas_cuid,
  cuid2: () => schemas_cuid2,
  custom: () => custom,
  date: () => schemas_date,
  describe: () => Os,
  discriminatedUnion: () => discriminatedUnion,
  e164: () => schemas_e164,
  email: () => schemas_email,
  emoji: () => schemas_emoji,
  enum: () => schemas_enum,
  exactOptional: () => exactOptional,
  file: () => file,
  float32: () => float32,
  float64: () => float64,
  function: () => _function,
  guid: () => schemas_guid,
  hash: () => hash,
  hex: () => schemas_hex,
  hostname: () => schemas_hostname,
  httpUrl: () => httpUrl,
  instanceof: () => _instanceof,
  int: () => schemas_int,
  int32: () => int32,
  int64: () => int64,
  intersection: () => intersection,
  ipv4: () => schemas_ipv4,
  ipv6: () => schemas_ipv6,
  json: () => json,
  jwt: () => jwt,
  keyof: () => keyof,
  ksuid: () => schemas_ksuid,
  lazy: () => lazy,
  literal: () => literal,
  looseObject: () => looseObject,
  looseRecord: () => looseRecord,
  mac: () => schemas_mac,
  map: () => map,
  meta: () => Ps,
  nan: () => nan,
  nanoid: () => schemas_nanoid,
  nativeEnum: () => nativeEnum,
  never: () => never,
  nonoptional: () => nonoptional,
  null: () => schemas_null,
  nullable: () => nullable,
  nullish: () => schemas_nullish,
  number: () => schemas_number,
  object: () => object,
  optional: () => optional,
  partialRecord: () => partialRecord,
  pipe: () => pipe,
  prefault: () => prefault,
  preprocess: () => preprocess,
  promise: () => promise,
  readonly: () => readonly,
  record: () => record,
  refine: () => refine,
  set: () => set,
  strictObject: () => strictObject,
  string: () => schemas_string,
  stringFormat: () => stringFormat,
  stringbool: () => stringbool,
  success: () => success,
  superRefine: () => superRefine,
  symbol: () => symbol,
  templateLiteral: () => templateLiteral,
  transform: () => transform,
  tuple: () => tuple,
  uint32: () => uint32,
  uint64: () => uint64,
  ulid: () => schemas_ulid,
  undefined: () => schemas_undefined,
  union: () => union,
  unknown: () => unknown,
  url: () => url,
  uuid: () => schemas_uuid,
  uuidv4: () => uuidv4,
  uuidv6: () => uuidv6,
  uuidv7: () => uuidv7,
  void: () => schemas_void,
  xid: () => schemas_xid,
  xor: () => xor
});
var O = {};
__nccwpck_require__.r(O);
__nccwpck_require__.d(O, {
  bigint: () => coerce_bigint,
  boolean: () => coerce_boolean,
  date: () => coerce_date,
  number: () => coerce_number,
  string: () => coerce_string
});
var P = {};
__nccwpck_require__.r(P);
__nccwpck_require__.d(P, {
  $brand: () => cn,
  $input: () => Ar,
  $output: () => Tr,
  NEVER: () => sn,
  TimePrecision: () => Rr,
  ZodAny: () => qo,
  ZodArray: () => Ko,
  ZodBase64: () => Oo,
  ZodBase64URL: () => Po,
  ZodBigInt: () => Ro,
  ZodBigIntFormat: () => Co,
  ZodBoolean: () => No,
  ZodCIDRv4: () => zo,
  ZodCIDRv6: () => jo,
  ZodCUID: () => vo,
  ZodCUID2: () => bo,
  ZodCatch: () => ys,
  ZodCodec: () => ws,
  ZodCustom: () => js,
  ZodCustomStringFormat: () => Do,
  ZodDate: () => Jo,
  ZodDefault: () => hs,
  ZodDiscriminatedUnion: () => Xo,
  ZodE164: () => Uo,
  ZodEmail: () => lo,
  ZodEmoji: () => ho,
  ZodEnum: () => rs,
  ZodError: () => Vr,
  ZodExactOptional: () => ds,
  ZodFile: () => ss,
  ZodFirstPartyTypeKind: () => Es,
  ZodFunction: () => zs,
  ZodGUID: () => po,
  ZodIPv4: () => $o,
  ZodIPv6: () => Io,
  ZodISODate: () => Fr,
  ZodISODateTime: () => Zr,
  ZodISODuration: () => Br,
  ZodISOTime: () => qr,
  ZodIntersection: () => Yo,
  ZodIssueCode: () => Us,
  ZodJWT: () => Eo,
  ZodKSUID: () => wo,
  ZodLazy: () => Ss,
  ZodLiteral: () => os,
  ZodMAC: () => So,
  ZodMap: () => ns,
  ZodNaN: () => xs,
  ZodNanoID: () => go,
  ZodNever: () => Vo,
  ZodNonOptional: () => vs,
  ZodNull: () => Fo,
  ZodNullable: () => fs,
  ZodNumber: () => To,
  ZodNumberFormat: () => Ao,
  ZodObject: () => Wo,
  ZodOptional: () => ls,
  ZodPipe: () => _s,
  ZodPrefault: () => gs,
  ZodPromise: () => Is,
  ZodReadonly: () => $s,
  ZodRealError: () => Mr,
  ZodRecord: () => ts,
  ZodSet: () => as,
  ZodString: () => co,
  ZodStringFormat: () => uo,
  ZodSuccess: () => bs,
  ZodSymbol: () => Lo,
  ZodTemplateLiteral: () => ks,
  ZodTransform: () => us,
  ZodTuple: () => Qo,
  ZodType: () => oo,
  ZodULID: () => xo,
  ZodURL: () => fo,
  ZodUUID: () => mo,
  ZodUndefined: () => Zo,
  ZodUnion: () => Go,
  ZodUnknown: () => Bo,
  ZodVoid: () => Mo,
  ZodXID: () => _o,
  ZodXor: () => Ho,
  _ZodString: () => so,
  _default: () => schemas_default,
  _function: () => _function,
  any: () => any,
  array: () => array,
  base64: () => schemas_base64,
  base64url: () => schemas_base64url,
  bigint: () => schemas_bigint,
  boolean: () => schemas_boolean,
  catch: () => schemas_catch,
  check: () => check,
  cidrv4: () => schemas_cidrv4,
  cidrv6: () => schemas_cidrv6,
  clone: () => clone,
  codec: () => codec,
  coerce: () => O,
  config: () => config,
  core: () => S,
  cuid: () => schemas_cuid,
  cuid2: () => schemas_cuid2,
  custom: () => custom,
  date: () => schemas_date,
  decode: () => Xr,
  decodeAsync: () => Qr,
  describe: () => Os,
  discriminatedUnion: () => discriminatedUnion,
  e164: () => schemas_e164,
  email: () => schemas_email,
  emoji: () => schemas_emoji,
  encode: () => Hr,
  encodeAsync: () => Yr,
  endsWith: () => _endsWith,
  enum: () => schemas_enum,
  exactOptional: () => exactOptional,
  file: () => file,
  flattenError: () => flattenError,
  float32: () => float32,
  float64: () => float64,
  formatError: () => formatError,
  fromJSONSchema: () => fromJSONSchema,
  function: () => _function,
  getErrorMap: () => getErrorMap,
  globalRegistry: () => Nr,
  gt: () => _gt,
  gte: () => _gte,
  guid: () => schemas_guid,
  hash: () => hash,
  hex: () => schemas_hex,
  hostname: () => schemas_hostname,
  httpUrl: () => httpUrl,
  includes: () => _includes,
  instanceof: () => _instanceof,
  int: () => schemas_int,
  int32: () => int32,
  int64: () => int64,
  intersection: () => intersection,
  ipv4: () => schemas_ipv4,
  ipv6: () => schemas_ipv6,
  iso: () => z,
  json: () => json,
  jwt: () => jwt,
  keyof: () => keyof,
  ksuid: () => schemas_ksuid,
  lazy: () => lazy,
  length: () => _length,
  literal: () => literal,
  locales: () => $,
  looseObject: () => looseObject,
  looseRecord: () => looseRecord,
  lowercase: () => _lowercase,
  lt: () => _lt,
  lte: () => _lte,
  mac: () => schemas_mac,
  map: () => map,
  maxLength: () => _maxLength,
  maxSize: () => _maxSize,
  meta: () => Ps,
  mime: () => _mime,
  minLength: () => _minLength,
  minSize: () => _minSize,
  multipleOf: () => _multipleOf,
  nan: () => nan,
  nanoid: () => schemas_nanoid,
  nativeEnum: () => nativeEnum,
  negative: () => _negative,
  never: () => never,
  nonnegative: () => _nonnegative,
  nonoptional: () => nonoptional,
  nonpositive: () => _nonpositive,
  normalize: () => _normalize,
  null: () => schemas_null,
  nullable: () => nullable,
  nullish: () => schemas_nullish,
  number: () => schemas_number,
  object: () => object,
  optional: () => optional,
  overwrite: () => _overwrite,
  parse: () => Jr,
  parseAsync: () => Kr,
  partialRecord: () => partialRecord,
  pipe: () => pipe,
  positive: () => _positive,
  prefault: () => prefault,
  preprocess: () => preprocess,
  prettifyError: () => prettifyError,
  promise: () => promise,
  property: () => _property,
  readonly: () => readonly,
  record: () => record,
  refine: () => refine,
  regex: () => _regex,
  regexes: () => w,
  registry: () => registry,
  safeDecode: () => io,
  safeDecodeAsync: () => ro,
  safeEncode: () => to,
  safeEncodeAsync: () => ao,
  safeParse: () => Wr,
  safeParseAsync: () => Gr,
  set: () => set,
  setErrorMap: () => setErrorMap,
  size: () => _size,
  slugify: () => _slugify,
  startsWith: () => _startsWith,
  strictObject: () => strictObject,
  string: () => schemas_string,
  stringFormat: () => stringFormat,
  stringbool: () => stringbool,
  success: () => success,
  superRefine: () => superRefine,
  symbol: () => symbol,
  templateLiteral: () => templateLiteral,
  toJSONSchema: () => toJSONSchema,
  toLowerCase: () => _toLowerCase,
  toUpperCase: () => _toUpperCase,
  transform: () => transform,
  treeifyError: () => treeifyError,
  trim: () => _trim,
  tuple: () => tuple,
  uint32: () => uint32,
  uint64: () => uint64,
  ulid: () => schemas_ulid,
  undefined: () => schemas_undefined,
  union: () => union,
  unknown: () => unknown,
  uppercase: () => _uppercase,
  url: () => url,
  util: () => x,
  uuid: () => schemas_uuid,
  uuidv4: () => uuidv4,
  uuidv6: () => uuidv6,
  uuidv7: () => uuidv7,
  void: () => schemas_void,
  xid: () => schemas_xid,
  xor: () => xor
});
function bind(r, u) {
  return function wrap() {
    return r.apply(u, arguments);
  };
}
const { toString: U } = Object.prototype;
const { getPrototypeOf: E } = Object;
const { iterator: D, toStringTag: T } = Symbol;
const A = (r => u => {
  const m = U.call(u);
  return r[m] || (r[m] = m.slice(8, -1).toLowerCase());
})(Object.create(null));
const kindOfTest = r => {
  r = r.toLowerCase();
  return u => A(u) === r;
};
const typeOfTest = r => u => typeof u === r;
const { isArray: N } = Array;
const C = typeOfTest('undefined');
function isBuffer(r) {
  return (
    r !== null &&
    !C(r) &&
    r.constructor !== null &&
    !C(r.constructor) &&
    B(r.constructor.isBuffer) &&
    r.constructor.isBuffer(r)
  );
}
const L = kindOfTest('ArrayBuffer');
function isArrayBufferView(r) {
  let u;
  if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView) {
    u = ArrayBuffer.isView(r);
  } else {
    u = r && r.buffer && L(r.buffer);
  }
  return u;
}
const q = typeOfTest('string');
const B = typeOfTest('function');
const V = typeOfTest('number');
const isObject = r => r !== null && typeof r === 'object';
const isBoolean = r => r === true || r === false;
const isPlainObject = r => {
  if (A(r) !== 'object') {
    return false;
  }
  const u = E(r);
  return (
    (u === null || u === Object.prototype || Object.getPrototypeOf(u) === null) &&
    !(T in r) &&
    !(D in r)
  );
};
const isEmptyObject = r => {
  if (!isObject(r) || isBuffer(r)) {
    return false;
  }
  try {
    return Object.keys(r).length === 0 && Object.getPrototypeOf(r) === Object.prototype;
  } catch (r) {
    return false;
  }
};
const M = kindOfTest('Date');
const K = kindOfTest('File');
const isReactNativeBlob = r => !!(r && typeof r.uri !== 'undefined');
const isReactNative = r => r && typeof r.getParts !== 'undefined';
const W = kindOfTest('Blob');
const G = kindOfTest('FileList');
const isStream = r => isObject(r) && B(r.pipe);
function getGlobal() {
  if (typeof globalThis !== 'undefined') return globalThis;
  if (typeof self !== 'undefined') return self;
  if (typeof window !== 'undefined') return window;
  if (typeof global !== 'undefined') return global;
  return {};
}
const Y = getGlobal();
const Q = typeof Y.FormData !== 'undefined' ? Y.FormData : undefined;
const isFormData = r => {
  let u;
  return (
    r &&
    ((Q && r instanceof Q) ||
      (B(r.append) &&
        ((u = A(r)) === 'formdata' ||
          (u === 'object' && B(r.toString) && r.toString() === '[object FormData]'))))
  );
};
const ee = kindOfTest('URLSearchParams');
const [te, ne, ie, ae] = ['ReadableStream', 'Request', 'Response', 'Headers'].map(kindOfTest);
const trim = r => (r.trim ? r.trim() : r.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, ''));
function forEach(r, u, { allOwnKeys: m = false } = {}) {
  if (r === null || typeof r === 'undefined') {
    return;
  }
  let v;
  let b;
  if (typeof r !== 'object') {
    r = [r];
  }
  if (N(r)) {
    for (v = 0, b = r.length; v < b; v++) {
      u.call(null, r[v], v, r);
    }
  } else {
    if (isBuffer(r)) {
      return;
    }
    const b = m ? Object.getOwnPropertyNames(r) : Object.keys(r);
    const x = b.length;
    let w;
    for (v = 0; v < x; v++) {
      w = b[v];
      u.call(null, r[w], w, r);
    }
  }
}
function findKey(r, u) {
  if (isBuffer(r)) {
    return null;
  }
  u = u.toLowerCase();
  const m = Object.keys(r);
  let v = m.length;
  let b;
  while (v-- > 0) {
    b = m[v];
    if (u === b.toLowerCase()) {
      return b;
    }
  }
  return null;
}
const re = (() => {
  if (typeof globalThis !== 'undefined') return globalThis;
  return typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : global;
})();
const isContextDefined = r => !C(r) && r !== re;
function merge() {
  const { caseless: r, skipUndefined: u } = (isContextDefined(this) && this) || {};
  const m = {};
  const assignValue = (v, b) => {
    if (b === '__proto__' || b === 'constructor' || b === 'prototype') {
      return;
    }
    const x = (r && findKey(m, b)) || b;
    if (isPlainObject(m[x]) && isPlainObject(v)) {
      m[x] = merge(m[x], v);
    } else if (isPlainObject(v)) {
      m[x] = merge({}, v);
    } else if (N(v)) {
      m[x] = v.slice();
    } else if (!u || !C(v)) {
      m[x] = v;
    }
  };
  for (let r = 0, u = arguments.length; r < u; r++) {
    arguments[r] && forEach(arguments[r], assignValue);
  }
  return m;
}
const extend = (r, u, m, { allOwnKeys: v } = {}) => {
  forEach(
    u,
    (u, v) => {
      if (m && B(u)) {
        Object.defineProperty(r, v, {
          value: bind(u, m),
          writable: true,
          enumerable: true,
          configurable: true
        });
      } else {
        Object.defineProperty(r, v, {
          value: u,
          writable: true,
          enumerable: true,
          configurable: true
        });
      }
    },
    { allOwnKeys: v }
  );
  return r;
};
const stripBOM = r => {
  if (r.charCodeAt(0) === 65279) {
    r = r.slice(1);
  }
  return r;
};
const inherits = (r, u, m, v) => {
  r.prototype = Object.create(u.prototype, v);
  Object.defineProperty(r.prototype, 'constructor', {
    value: r,
    writable: true,
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(r, 'super', { value: u.prototype });
  m && Object.assign(r.prototype, m);
};
const toFlatObject = (r, u, m, v) => {
  let b;
  let x;
  let w;
  const $ = {};
  u = u || {};
  if (r == null) return u;
  do {
    b = Object.getOwnPropertyNames(r);
    x = b.length;
    while (x-- > 0) {
      w = b[x];
      if ((!v || v(w, r, u)) && !$[w]) {
        u[w] = r[w];
        $[w] = true;
      }
    }
    r = m !== false && E(r);
  } while (r && (!m || m(r, u)) && r !== Object.prototype);
  return u;
};
const endsWith = (r, u, m) => {
  r = String(r);
  if (m === undefined || m > r.length) {
    m = r.length;
  }
  m -= u.length;
  const v = r.indexOf(u, m);
  return v !== -1 && v === m;
};
const toArray = r => {
  if (!r) return null;
  if (N(r)) return r;
  let u = r.length;
  if (!V(u)) return null;
  const m = new Array(u);
  while (u-- > 0) {
    m[u] = r[u];
  }
  return m;
};
const oe = (
  r => u =>
    r && u instanceof r
)(typeof Uint8Array !== 'undefined' && E(Uint8Array));
const forEachEntry = (r, u) => {
  const m = r && r[D];
  const v = m.call(r);
  let b;
  while ((b = v.next()) && !b.done) {
    const m = b.value;
    u.call(r, m[0], m[1]);
  }
};
const matchAll = (r, u) => {
  let m;
  const v = [];
  while ((m = r.exec(u)) !== null) {
    v.push(m);
  }
  return v;
};
const se = kindOfTest('HTMLFormElement');
const toCamelCase = r =>
  r.toLowerCase().replace(/[-_\s]([a-z\d])(\w*)/g, function replacer(r, u, m) {
    return u.toUpperCase() + m;
  });
const ce = (
  ({ hasOwnProperty: r }) =>
  (u, m) =>
    r.call(u, m)
)(Object.prototype);
const ue = kindOfTest('RegExp');
const reduceDescriptors = (r, u) => {
  const m = Object.getOwnPropertyDescriptors(r);
  const v = {};
  forEach(m, (m, b) => {
    let x;
    if ((x = u(m, b, r)) !== false) {
      v[b] = x || m;
    }
  });
  Object.defineProperties(r, v);
};
const freezeMethods = r => {
  reduceDescriptors(r, (u, m) => {
    if (B(r) && ['arguments', 'caller', 'callee'].indexOf(m) !== -1) {
      return false;
    }
    const v = r[m];
    if (!B(v)) return;
    u.enumerable = false;
    if ('writable' in u) {
      u.writable = false;
      return;
    }
    if (!u.set) {
      u.set = () => {
        throw Error("Can not rewrite read-only method '" + m + "'");
      };
    }
  });
};
const toObjectSet = (r, u) => {
  const m = {};
  const define = r => {
    r.forEach(r => {
      m[r] = true;
    });
  };
  N(r) ? define(r) : define(String(r).split(u));
  return m;
};
const noop = () => {};
const toFiniteNumber = (r, u) => (r != null && Number.isFinite((r = +r)) ? r : u);
function isSpecCompliantForm(r) {
  return !!(r && B(r.append) && r[T] === 'FormData' && r[D]);
}
const toJSONObject = r => {
  const u = new Array(10);
  const visit = (r, m) => {
    if (isObject(r)) {
      if (u.indexOf(r) >= 0) {
        return;
      }
      if (isBuffer(r)) {
        return r;
      }
      if (!('toJSON' in r)) {
        u[m] = r;
        const v = N(r) ? [] : {};
        forEach(r, (r, u) => {
          const b = visit(r, m + 1);
          !C(b) && (v[u] = b);
        });
        u[m] = undefined;
        return v;
      }
    }
    return r;
  };
  return visit(r, 0);
};
const le = kindOfTest('AsyncFunction');
const isThenable = r => r && (isObject(r) || B(r)) && B(r.then) && B(r.catch);
const pe = ((r, u) => {
  if (r) {
    return setImmediate;
  }
  return u
    ? ((r, u) => {
        re.addEventListener(
          'message',
          ({ source: m, data: v }) => {
            if (m === re && v === r) {
              u.length && u.shift()();
            }
          },
          false
        );
        return m => {
          u.push(m);
          re.postMessage(r, '*');
        };
      })(`axios@${Math.random()}`, [])
    : r => setTimeout(r);
})(typeof setImmediate === 'function', B(re.postMessage));
const me =
  typeof queueMicrotask !== 'undefined'
    ? queueMicrotask.bind(re)
    : (typeof process !== 'undefined' && process.nextTick) || pe;
const isIterable = r => r != null && B(r[D]);
const fe = {
  isArray: N,
  isArrayBuffer: L,
  isBuffer: isBuffer,
  isFormData: isFormData,
  isArrayBufferView: isArrayBufferView,
  isString: q,
  isNumber: V,
  isBoolean: isBoolean,
  isObject: isObject,
  isPlainObject: isPlainObject,
  isEmptyObject: isEmptyObject,
  isReadableStream: te,
  isRequest: ne,
  isResponse: ie,
  isHeaders: ae,
  isUndefined: C,
  isDate: M,
  isFile: K,
  isReactNativeBlob: isReactNativeBlob,
  isReactNative: isReactNative,
  isBlob: W,
  isRegExp: ue,
  isFunction: B,
  isStream: isStream,
  isURLSearchParams: ee,
  isTypedArray: oe,
  isFileList: G,
  forEach: forEach,
  merge: merge,
  extend: extend,
  trim: trim,
  stripBOM: stripBOM,
  inherits: inherits,
  toFlatObject: toFlatObject,
  kindOf: A,
  kindOfTest: kindOfTest,
  endsWith: endsWith,
  toArray: toArray,
  forEachEntry: forEachEntry,
  matchAll: matchAll,
  isHTMLForm: se,
  hasOwnProperty: ce,
  hasOwnProp: ce,
  reduceDescriptors: reduceDescriptors,
  freezeMethods: freezeMethods,
  toObjectSet: toObjectSet,
  toCamelCase: toCamelCase,
  noop: noop,
  toFiniteNumber: toFiniteNumber,
  findKey: findKey,
  global: re,
  isContextDefined: isContextDefined,
  isSpecCompliantForm: isSpecCompliantForm,
  toJSONObject: toJSONObject,
  isAsyncFn: le,
  isThenable: isThenable,
  setImmediate: pe,
  asap: me,
  isIterable: isIterable
};
class AxiosError extends Error {
  static from(r, u, m, v, b, x) {
    const w = new AxiosError(r.message, u || r.code, m, v, b);
    w.cause = r;
    w.name = r.name;
    if (r.status != null && w.status == null) {
      w.status = r.status;
    }
    x && Object.assign(w, x);
    return w;
  }
  constructor(r, u, m, v, b) {
    super(r);
    Object.defineProperty(this, 'message', {
      value: r,
      enumerable: true,
      writable: true,
      configurable: true
    });
    this.name = 'AxiosError';
    this.isAxiosError = true;
    u && (this.code = u);
    m && (this.config = m);
    v && (this.request = v);
    if (b) {
      this.response = b;
      this.status = b.status;
    }
  }
  toJSON() {
    return {
      message: this.message,
      name: this.name,
      description: this.description,
      number: this.number,
      fileName: this.fileName,
      lineNumber: this.lineNumber,
      columnNumber: this.columnNumber,
      stack: this.stack,
      config: fe.toJSONObject(this.config),
      code: this.code,
      status: this.status
    };
  }
}
AxiosError.ERR_BAD_OPTION_VALUE = 'ERR_BAD_OPTION_VALUE';
AxiosError.ERR_BAD_OPTION = 'ERR_BAD_OPTION';
AxiosError.ECONNABORTED = 'ECONNABORTED';
AxiosError.ETIMEDOUT = 'ETIMEDOUT';
AxiosError.ERR_NETWORK = 'ERR_NETWORK';
AxiosError.ERR_FR_TOO_MANY_REDIRECTS = 'ERR_FR_TOO_MANY_REDIRECTS';
AxiosError.ERR_DEPRECATED = 'ERR_DEPRECATED';
AxiosError.ERR_BAD_RESPONSE = 'ERR_BAD_RESPONSE';
AxiosError.ERR_BAD_REQUEST = 'ERR_BAD_REQUEST';
AxiosError.ERR_CANCELED = 'ERR_CANCELED';
AxiosError.ERR_NOT_SUPPORT = 'ERR_NOT_SUPPORT';
AxiosError.ERR_INVALID_URL = 'ERR_INVALID_URL';
const ge = AxiosError;
var ve = __nccwpck_require__(2099);
const ye = ve;
function isVisitable(r) {
  return fe.isPlainObject(r) || fe.isArray(r);
}
function removeBrackets(r) {
  return fe.endsWith(r, '[]') ? r.slice(0, -2) : r;
}
function renderKey(r, u, m) {
  if (!r) return u;
  return r
    .concat(u)
    .map(function each(r, u) {
      r = removeBrackets(r);
      return !m && u ? '[' + r + ']' : r;
    })
    .join(m ? '.' : '');
}
function isFlatArray(r) {
  return fe.isArray(r) && !r.some(isVisitable);
}
const xe = fe.toFlatObject(fe, {}, null, function filter(r) {
  return /^is[A-Z]/.test(r);
});
function toFormData(r, u, m) {
  if (!fe.isObject(r)) {
    throw new TypeError('target must be an object');
  }
  u = u || new (ye || FormData)();
  m = fe.toFlatObject(
    m,
    { metaTokens: true, dots: false, indexes: false },
    false,
    function defined(r, u) {
      return !fe.isUndefined(u[r]);
    }
  );
  const v = m.metaTokens;
  const b = m.visitor || defaultVisitor;
  const x = m.dots;
  const w = m.indexes;
  const $ = m.Blob || (typeof Blob !== 'undefined' && Blob);
  const k = $ && fe.isSpecCompliantForm(u);
  if (!fe.isFunction(b)) {
    throw new TypeError('visitor must be a function');
  }
  function convertValue(r) {
    if (r === null) return '';
    if (fe.isDate(r)) {
      return r.toISOString();
    }
    if (fe.isBoolean(r)) {
      return r.toString();
    }
    if (!k && fe.isBlob(r)) {
      throw new ge('Blob is not supported. Use a Buffer instead.');
    }
    if (fe.isArrayBuffer(r) || fe.isTypedArray(r)) {
      return k && typeof Blob === 'function' ? new Blob([r]) : Buffer.from(r);
    }
    return r;
  }
  function defaultVisitor(r, m, b) {
    let $ = r;
    if (fe.isReactNative(u) && fe.isReactNativeBlob(r)) {
      u.append(renderKey(b, m, x), convertValue(r));
      return false;
    }
    if (r && !b && typeof r === 'object') {
      if (fe.endsWith(m, '{}')) {
        m = v ? m : m.slice(0, -2);
        r = JSON.stringify(r);
      } else if (
        (fe.isArray(r) && isFlatArray(r)) ||
        ((fe.isFileList(r) || fe.endsWith(m, '[]')) && ($ = fe.toArray(r)))
      ) {
        m = removeBrackets(m);
        $.forEach(function each(r, v) {
          !(fe.isUndefined(r) || r === null) &&
            u.append(
              w === true ? renderKey([m], v, x) : w === null ? m : m + '[]',
              convertValue(r)
            );
        });
        return false;
      }
    }
    if (isVisitable(r)) {
      return true;
    }
    u.append(renderKey(b, m, x), convertValue(r));
    return false;
  }
  const S = [];
  const I = Object.assign(xe, {
    defaultVisitor: defaultVisitor,
    convertValue: convertValue,
    isVisitable: isVisitable
  });
  function build(r, m) {
    if (fe.isUndefined(r)) return;
    if (S.indexOf(r) !== -1) {
      throw Error('Circular reference detected in ' + m.join('.'));
    }
    S.push(r);
    fe.forEach(r, function each(r, v) {
      const x =
        !(fe.isUndefined(r) || r === null) &&
        b.call(u, r, fe.isString(v) ? v.trim() : v, m, I);
      if (x === true) {
        build(r, m ? m.concat(v) : [v]);
      }
    });
    S.pop();
  }
  if (!fe.isObject(r)) {
    throw new TypeError('data must be an object');
  }
  build(r);
  return u;
}
const _e = toFormData;
function encode(r) {
  const u = {
    '!': '%21',
    "'": '%27',
    '(': '%28',
    ')': '%29',
    '~': '%7E',
    '%20': '+',
    '%00': '\0'
  };
  return encodeURIComponent(r).replace(/[!'()~]|%20|%00/g, function replacer(r) {
    return u[r];
  });
}
function AxiosURLSearchParams(r, u) {
  this._pairs = [];
  r && _e(r, this, u);
}
const we = AxiosURLSearchParams.prototype;
we.append = function append(r, u) {
  this._pairs.push([r, u]);
};
we.toString = function toString(r) {
  const u = r
    ? function (u) {
        return r.call(this, u, encode);
      }
    : encode;
  return this._pairs
    .map(function each(r) {
      return u(r[0]) + '=' + u(r[1]);
    }, '')
    .join('&');
};
const $e = AxiosURLSearchParams;
function buildURL_encode(r) {
  return encodeURIComponent(r)
    .replace(/%3A/gi, ':')
    .replace(/%24/g, '$')
    .replace(/%2C/gi, ',')
    .replace(/%20/g, '+');
}
function buildURL(r, u, m) {
  if (!u) {
    return r;
  }
  const v = (m && m.encode) || buildURL_encode;
  const b = fe.isFunction(m) ? { serialize: m } : m;
  const x = b && b.serialize;
  let w;
  if (x) {
    w = x(u, b);
  } else {
    w = fe.isURLSearchParams(u) ? u.toString() : new $e(u, b).toString(v);
  }
  if (w) {
    const u = r.indexOf('#');
    if (u !== -1) {
      r = r.slice(0, u);
    }
    r += (r.indexOf('?') === -1 ? '?' : '&') + w;
  }
  return r;
}
class InterceptorManager {
  constructor() {
    this.handlers = [];
  }
  use(r, u, m) {
    this.handlers.push({
      fulfilled: r,
      rejected: u,
      synchronous: m ? m.synchronous : false,
      runWhen: m ? m.runWhen : null
    });
    return this.handlers.length - 1;
  }
  eject(r) {
    if (this.handlers[r]) {
      this.handlers[r] = null;
    }
  }
  clear() {
    if (this.handlers) {
      this.handlers = [];
    }
  }
  forEach(r) {
    fe.forEach(this.handlers, function forEachHandler(u) {
      if (u !== null) {
        r(u);
      }
    });
  }
}
const ke = InterceptorManager;
const Se = {
  silentJSONParsing: true,
  forcedJSONParsing: true,
  clarifyTimeoutError: false,
  legacyInterceptorReqResOrdering: true
};
var Ie = __nccwpck_require__(6982);
var ze = __nccwpck_require__(7016);
const je = ze.URLSearchParams;
const Oe = 'abcdefghijklmnopqrstuvwxyz';
const Pe = '0123456789';
const Ue = { DIGIT: Pe, ALPHA: Oe, ALPHA_DIGIT: Oe + Oe.toUpperCase() + Pe };
const generateString = (r = 16, u = Ue.ALPHA_DIGIT) => {
  let m = '';
  const { length: v } = u;
  const b = new Uint32Array(r);
  Ie.randomFillSync(b);
  for (let x = 0; x < r; x++) {
    m += u[b[x] % v];
  }
  return m;
};
const Ee = {
  isNode: true,
  classes: {
    URLSearchParams: je,
    FormData: ye,
    Blob: (typeof Blob !== 'undefined' && Blob) || null
  },
  ALPHABET: Ue,
  generateString: generateString,
  protocols: ['http', 'https', 'file', 'data']
};
const De = typeof window !== 'undefined' && typeof document !== 'undefined';
const Te = (typeof navigator === 'object' && navigator) || undefined;
const Ae = De && (!Te || ['ReactNative', 'NativeScript', 'NS'].indexOf(Te.product) < 0);
const Ne = (() =>
  typeof WorkerGlobalScope !== 'undefined' &&
  self instanceof WorkerGlobalScope &&
  typeof self.importScripts === 'function')();
const Re = (De && window.location.href) || 'http://localhost';
const Ce = { ...b, ...Ee };
function toURLEncodedForm(r, u) {
  return _e(r, new Ce.classes.URLSearchParams(), {
    visitor: function (r, u, m, v) {
      if (Ce.isNode && fe.isBuffer(r)) {
        this.append(u, r.toString('base64'));
        return false;
      }
      return v.defaultVisitor.apply(this, arguments);
    },
    ...u
  });
}
function parsePropPath(r) {
  return fe.matchAll(/\w+|\[(\w*)]/g, r).map(r => (r[0] === '[]' ? '' : r[1] || r[0]));
}
function arrayToObject(r) {
  const u = {};
  const m = Object.keys(r);
  let v;
  const b = m.length;
  let x;
  for (v = 0; v < b; v++) {
    x = m[v];
    u[x] = r[x];
  }
  return u;
}
function formDataToJSON(r) {
  function buildPath(r, u, m, v) {
    let b = r[v++];
    if (b === '__proto__') return true;
    const x = Number.isFinite(+b);
    const w = v >= r.length;
    b = !b && fe.isArray(m) ? m.length : b;
    if (w) {
      if (fe.hasOwnProp(m, b)) {
        m[b] = [m[b], u];
      } else {
        m[b] = u;
      }
      return !x;
    }
    if (!m[b] || !fe.isObject(m[b])) {
      m[b] = [];
    }
    const $ = buildPath(r, u, m[b], v);
    if ($ && fe.isArray(m[b])) {
      m[b] = arrayToObject(m[b]);
    }
    return !x;
  }
  if (fe.isFormData(r) && fe.isFunction(r.entries)) {
    const u = {};
    fe.forEachEntry(r, (r, m) => {
      buildPath(parsePropPath(r), m, u, 0);
    });
    return u;
  }
  return null;
}
const Le = formDataToJSON;
function stringifySafely(r, u, m) {
  if (fe.isString(r)) {
    try {
      (u || JSON.parse)(r);
      return fe.trim(r);
    } catch (r) {
      if (r.name !== 'SyntaxError') {
        throw r;
      }
    }
  }
  return (m || JSON.stringify)(r);
}
const Ze = {
  transitional: Se,
  adapter: ['xhr', 'http', 'fetch'],
  transformRequest: [
    function transformRequest(r, u) {
      const m = u.getContentType() || '';
      const v = m.indexOf('application/json') > -1;
      const b = fe.isObject(r);
      if (b && fe.isHTMLForm(r)) {
        r = new FormData(r);
      }
      const x = fe.isFormData(r);
      if (x) {
        return v ? JSON.stringify(Le(r)) : r;
      }
      if (
        fe.isArrayBuffer(r) ||
        fe.isBuffer(r) ||
        fe.isStream(r) ||
        fe.isFile(r) ||
        fe.isBlob(r) ||
        fe.isReadableStream(r)
      ) {
        return r;
      }
      if (fe.isArrayBufferView(r)) {
        return r.buffer;
      }
      if (fe.isURLSearchParams(r)) {
        u.setContentType('application/x-www-form-urlencoded;charset=utf-8', false);
        return r.toString();
      }
      let w;
      if (b) {
        if (m.indexOf('application/x-www-form-urlencoded') > -1) {
          return toURLEncodedForm(r, this.formSerializer).toString();
        }
        if ((w = fe.isFileList(r)) || m.indexOf('multipart/form-data') > -1) {
          const u = this.env && this.env.FormData;
          return _e(w ? { 'files[]': r } : r, u && new u(), this.formSerializer);
        }
      }
      if (b || v) {
        u.setContentType('application/json', false);
        return stringifySafely(r);
      }
      return r;
    }
  ],
  transformResponse: [
    function transformResponse(r) {
      const u = this.transitional || Ze.transitional;
      const m = u && u.forcedJSONParsing;
      const v = this.responseType === 'json';
      if (fe.isResponse(r) || fe.isReadableStream(r)) {
        return r;
      }
      if (r && fe.isString(r) && ((m && !this.responseType) || v)) {
        const m = u && u.silentJSONParsing;
        const b = !m && v;
        try {
          return JSON.parse(r, this.parseReviver);
        } catch (r) {
          if (b) {
            if (r.name === 'SyntaxError') {
              throw ge.from(r, ge.ERR_BAD_RESPONSE, this, null, this.response);
            }
            throw r;
          }
        }
      }
      return r;
    }
  ],
  timeout: 0,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  maxContentLength: -1,
  maxBodyLength: -1,
  env: { FormData: Ce.classes.FormData, Blob: Ce.classes.Blob },
  validateStatus: function validateStatus(r) {
    return r >= 200 && r < 300;
  },
  headers: {
    common: { Accept: 'application/json, text/plain, */*', 'Content-Type': undefined }
  }
};
fe.forEach(['delete', 'get', 'head', 'post', 'put', 'patch'], r => {
  Ze.headers[r] = {};
});
const Fe = Ze;
const qe = fe.toObjectSet([
  'age',
  'authorization',
  'content-length',
  'content-type',
  'etag',
  'expires',
  'from',
  'host',
  'if-modified-since',
  'if-unmodified-since',
  'last-modified',
  'location',
  'max-forwards',
  'proxy-authorization',
  'referer',
  'retry-after',
  'user-agent'
]);
const parseHeaders = r => {
  const u = {};
  let m;
  let v;
  let b;
  r &&
    r.split('\n').forEach(function parser(r) {
      b = r.indexOf(':');
      m = r.substring(0, b).trim().toLowerCase();
      v = r.substring(b + 1).trim();
      if (!m || (u[m] && qe[m])) {
        return;
      }
      if (m === 'set-cookie') {
        if (u[m]) {
          u[m].push(v);
        } else {
          u[m] = [v];
        }
      } else {
        u[m] = u[m] ? u[m] + ', ' + v : v;
      }
    });
  return u;
};
const Be = Symbol('internals');
function normalizeHeader(r) {
  return r && String(r).trim().toLowerCase();
}
function normalizeValue(r) {
  if (r === false || r == null) {
    return r;
  }
  return fe.isArray(r) ? r.map(normalizeValue) : String(r).replace(/[\r\n]+$/, '');
}
function parseTokens(r) {
  const u = Object.create(null);
  const m = /([^\s,;=]+)\s*(?:=\s*([^,;]+))?/g;
  let v;
  while ((v = m.exec(r))) {
    u[v[1]] = v[2];
  }
  return u;
}
const isValidHeaderName = r => /^[-_a-zA-Z0-9^`|~,!#$%&'*+.]+$/.test(r.trim());
function matchHeaderValue(r, u, m, v, b) {
  if (fe.isFunction(v)) {
    return v.call(this, u, m);
  }
  if (b) {
    u = m;
  }
  if (!fe.isString(u)) return;
  if (fe.isString(v)) {
    return u.indexOf(v) !== -1;
  }
  if (fe.isRegExp(v)) {
    return v.test(u);
  }
}
function formatHeader(r) {
  return r
    .trim()
    .toLowerCase()
    .replace(/([a-z\d])(\w*)/g, (r, u, m) => u.toUpperCase() + m);
}
function buildAccessors(r, u) {
  const m = fe.toCamelCase(' ' + u);
  ['get', 'set', 'has'].forEach(v => {
    Object.defineProperty(r, v + m, {
      value: function (r, m, b) {
        return this[v].call(this, u, r, m, b);
      },
      configurable: true
    });
  });
}
class AxiosHeaders {
  constructor(r) {
    r && this.set(r);
  }
  set(r, u, m) {
    const v = this;
    function setHeader(r, u, m) {
      const b = normalizeHeader(u);
      if (!b) {
        throw new Error('header name must be a non-empty string');
      }
      const x = fe.findKey(v, b);
      if (!x || v[x] === undefined || m === true || (m === undefined && v[x] !== false)) {
        v[x || u] = normalizeValue(r);
      }
    }
    const setHeaders = (r, u) => fe.forEach(r, (r, m) => setHeader(r, m, u));
    if (fe.isPlainObject(r) || r instanceof this.constructor) {
      setHeaders(r, u);
    } else if (fe.isString(r) && (r = r.trim()) && !isValidHeaderName(r)) {
      setHeaders(parseHeaders(r), u);
    } else if (fe.isObject(r) && fe.isIterable(r)) {
      let m = {},
        v,
        b;
      for (const u of r) {
        if (!fe.isArray(u)) {
          throw TypeError('Object iterator must return a key-value pair');
        }
        m[(b = u[0])] = (v = m[b]) ? (fe.isArray(v) ? [...v, u[1]] : [v, u[1]]) : u[1];
      }
      setHeaders(m, u);
    } else {
      r != null && setHeader(u, r, m);
    }
    return this;
  }
  get(r, u) {
    r = normalizeHeader(r);
    if (r) {
      const m = fe.findKey(this, r);
      if (m) {
        const r = this[m];
        if (!u) {
          return r;
        }
        if (u === true) {
          return parseTokens(r);
        }
        if (fe.isFunction(u)) {
          return u.call(this, r, m);
        }
        if (fe.isRegExp(u)) {
          return u.exec(r);
        }
        throw new TypeError('parser must be boolean|regexp|function');
      }
    }
  }
  has(r, u) {
    r = normalizeHeader(r);
    if (r) {
      const m = fe.findKey(this, r);
      return !!(m && this[m] !== undefined && (!u || matchHeaderValue(this, this[m], m, u)));
    }
    return false;
  }
  delete(r, u) {
    const m = this;
    let v = false;
    function deleteHeader(r) {
      r = normalizeHeader(r);
      if (r) {
        const b = fe.findKey(m, r);
        if (b && (!u || matchHeaderValue(m, m[b], b, u))) {
          delete m[b];
          v = true;
        }
      }
    }
    if (fe.isArray(r)) {
      r.forEach(deleteHeader);
    } else {
      deleteHeader(r);
    }
    return v;
  }
  clear(r) {
    const u = Object.keys(this);
    let m = u.length;
    let v = false;
    while (m--) {
      const b = u[m];
      if (!r || matchHeaderValue(this, this[b], b, r, true)) {
        delete this[b];
        v = true;
      }
    }
    return v;
  }
  normalize(r) {
    const u = this;
    const m = {};
    fe.forEach(this, (v, b) => {
      const x = fe.findKey(m, b);
      if (x) {
        u[x] = normalizeValue(v);
        delete u[b];
        return;
      }
      const w = r ? formatHeader(b) : String(b).trim();
      if (w !== b) {
        delete u[b];
      }
      u[w] = normalizeValue(v);
      m[w] = true;
    });
    return this;
  }
  concat(...r) {
    return this.constructor.concat(this, ...r);
  }
  toJSON(r) {
    const u = Object.create(null);
    fe.forEach(this, (m, v) => {
      m != null && m !== false && (u[v] = r && fe.isArray(m) ? m.join(', ') : m);
    });
    return u;
  }
  [Symbol.iterator]() {
    return Object.entries(this.toJSON())[Symbol.iterator]();
  }
  toString() {
    return Object.entries(this.toJSON())
      .map(([r, u]) => r + ': ' + u)
      .join('\n');
  }
  getSetCookie() {
    return this.get('set-cookie') || [];
  }
  get [Symbol.toStringTag]() {
    return 'AxiosHeaders';
  }
  static from(r) {
    return r instanceof this ? r : new this(r);
  }
  static concat(r, ...u) {
    const m = new this(r);
    u.forEach(r => m.set(r));
    return m;
  }
  static accessor(r) {
    const u = (this[Be] = this[Be] = { accessors: {} });
    const m = u.accessors;
    const v = this.prototype;
    function defineAccessor(r) {
      const u = normalizeHeader(r);
      if (!m[u]) {
        buildAccessors(v, r);
        m[u] = true;
      }
    }
    fe.isArray(r) ? r.forEach(defineAccessor) : defineAccessor(r);
    return this;
  }
}
AxiosHeaders.accessor([
  'Content-Type',
  'Content-Length',
  'Accept',
  'Accept-Encoding',
  'User-Agent',
  'Authorization'
]);
fe.reduceDescriptors(AxiosHeaders.prototype, ({ value: r }, u) => {
  let m = u[0].toUpperCase() + u.slice(1);
  return {
    get: () => r,
    set(r) {
      this[m] = r;
    }
  };
});
fe.freezeMethods(AxiosHeaders);
const Ve = AxiosHeaders;
function transformData(r, u) {
  const m = this || Fe;
  const v = u || m;
  const b = Ve.from(v.headers);
  let x = v.data;
  fe.forEach(r, function transform(r) {
    x = r.call(m, x, b.normalize(), u ? u.status : undefined);
  });
  b.normalize();
  return x;
}
function isCancel(r) {
  return !!(r && r.__CANCEL__);
}
class CanceledError extends ge {
  constructor(r, u, m) {
    super(r == null ? 'canceled' : r, ge.ERR_CANCELED, u, m);
    this.name = 'CanceledError';
    this.__CANCEL__ = true;
  }
}
const Me = CanceledError;
function settle(r, u, m) {
  const v = m.config.validateStatus;
  if (!m.status || !v || v(m.status)) {
    r(m);
  } else {
    u(
      new ge(
        'Request failed with status code ' + m.status,
        [ge.ERR_BAD_REQUEST, ge.ERR_BAD_RESPONSE][Math.floor(m.status / 100) - 4],
        m.config,
        m.request,
        m
      )
    );
  }
}
function isAbsoluteURL(r) {
  if (typeof r !== 'string') {
    return false;
  }
  return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(r);
}
function combineURLs(r, u) {
  return u ? r.replace(/\/?\/$/, '') + '/' + u.replace(/^\/+/, '') : r;
}
function buildFullPath(r, u, m) {
  let v = !isAbsoluteURL(u);
  if (r && (v || m == false)) {
    return combineURLs(r, u);
  }
  return u;
}
var Je = { ftp: 21, gopher: 70, http: 80, https: 443, ws: 80, wss: 443 };
function parseUrl(r) {
  try {
    return new URL(r);
  } catch {
    return null;
  }
}
function getProxyForUrl(r) {
  var u = (typeof r === 'string' ? parseUrl(r) : r) || {};
  var m = u.protocol;
  var v = u.host;
  var b = u.port;
  if (typeof v !== 'string' || !v || typeof m !== 'string') {
    return '';
  }
  m = m.split(':', 1)[0];
  v = v.replace(/:\d*$/, '');
  b = parseInt(b) || Je[m] || 0;
  if (!shouldProxy(v, b)) {
    return '';
  }
  var x = getEnv(m + '_proxy') || getEnv('all_proxy');
  if (x && x.indexOf('://') === -1) {
    x = m + '://' + x;
  }
  return x;
}
function shouldProxy(r, u) {
  var m = getEnv('no_proxy').toLowerCase();
  if (!m) {
    return true;
  }
  if (m === '*') {
    return false;
  }
  return m.split(/[,\s]/).every(function (m) {
    if (!m) {
      return true;
    }
    var v = m.match(/^(.+):(\d+)$/);
    var b = v ? v[1] : m;
    var x = v ? parseInt(v[2]) : 0;
    if (x && x !== u) {
      return true;
    }
    if (!/^[.*]/.test(b)) {
      return r !== b;
    }
    if (b.charAt(0) === '*') {
      b = b.slice(1);
    }
    return !r.endsWith(b);
  });
}
function getEnv(r) {
  return process.env[r.toLowerCase()] || process.env[r.toUpperCase()] || '';
}
var Ke = __nccwpck_require__(8611);
var We = __nccwpck_require__(5692);
const Ge = r(import.meta.url)('http2');
var He = __nccwpck_require__(9023);
var Xe = __nccwpck_require__(7058);
const Ye = r(import.meta.url)('zlib');
const Qe = '1.14.0';
function parseProtocol(r) {
  const u = /^([-+\w]{1,25})(:?\/\/|:)/.exec(r);
  return (u && u[1]) || '';
}
const et = /^(?:([^;]+);)?(?:[^;]+;)?(base64|),([\s\S]*)$/;
function fromDataURI(r, u, m) {
  const v = (m && m.Blob) || Ce.classes.Blob;
  const b = parseProtocol(r);
  if (u === undefined && v) {
    u = true;
  }
  if (b === 'data') {
    r = b.length ? r.slice(b.length + 1) : r;
    const m = et.exec(r);
    if (!m) {
      throw new ge('Invalid URL', ge.ERR_INVALID_URL);
    }
    const x = m[1];
    const w = m[2];
    const $ = m[3];
    const k = Buffer.from(decodeURIComponent($), w ? 'base64' : 'utf8');
    if (u) {
      if (!v) {
        throw new ge('Blob is not supported', ge.ERR_NOT_SUPPORT);
      }
      return new v([k], { type: x });
    }
    return k;
  }
  throw new ge('Unsupported protocol ' + b, ge.ERR_NOT_SUPPORT);
}
var tt = __nccwpck_require__(2203);
const nt = Symbol('internals');
class AxiosTransformStream extends tt.Transform {
  constructor(r) {
    r = fe.toFlatObject(
      r,
      {
        maxRate: 0,
        chunkSize: 64 * 1024,
        minChunkSize: 100,
        timeWindow: 500,
        ticksRate: 2,
        samplesCount: 15
      },
      null,
      (r, u) => !fe.isUndefined(u[r])
    );
    super({ readableHighWaterMark: r.chunkSize });
    const u = (this[nt] = {
      timeWindow: r.timeWindow,
      chunkSize: r.chunkSize,
      maxRate: r.maxRate,
      minChunkSize: r.minChunkSize,
      bytesSeen: 0,
      isCaptured: false,
      notifiedBytesLoaded: 0,
      ts: Date.now(),
      bytes: 0,
      onReadCallback: null
    });
    this.on('newListener', r => {
      if (r === 'progress') {
        if (!u.isCaptured) {
          u.isCaptured = true;
        }
      }
    });
  }
  _read(r) {
    const u = this[nt];
    if (u.onReadCallback) {
      u.onReadCallback();
    }
    return super._read(r);
  }
  _transform(r, u, m) {
    const v = this[nt];
    const b = v.maxRate;
    const x = this.readableHighWaterMark;
    const w = v.timeWindow;
    const $ = 1e3 / w;
    const k = b / $;
    const S = v.minChunkSize !== false ? Math.max(v.minChunkSize, k * 0.01) : 0;
    const pushChunk = (r, u) => {
      const m = Buffer.byteLength(r);
      v.bytesSeen += m;
      v.bytes += m;
      v.isCaptured && this.emit('progress', v.bytesSeen);
      if (this.push(r)) {
        process.nextTick(u);
      } else {
        v.onReadCallback = () => {
          v.onReadCallback = null;
          process.nextTick(u);
        };
      }
    };
    const transformChunk = (r, u) => {
      const m = Buffer.byteLength(r);
      let $ = null;
      let I = x;
      let z;
      let j = 0;
      if (b) {
        const r = Date.now();
        if (!v.ts || (j = r - v.ts) >= w) {
          v.ts = r;
          z = k - v.bytes;
          v.bytes = z < 0 ? -z : 0;
          j = 0;
        }
        z = k - v.bytes;
      }
      if (b) {
        if (z <= 0) {
          return setTimeout(() => {
            u(null, r);
          }, w - j);
        }
        if (z < I) {
          I = z;
        }
      }
      if (I && m > I && m - I > S) {
        $ = r.subarray(I);
        r = r.subarray(0, I);
      }
      pushChunk(
        r,
        $
          ? () => {
              process.nextTick(u, null, $);
            }
          : u
      );
    };
    transformChunk(r, function transformNextChunk(r, u) {
      if (r) {
        return m(r);
      }
      if (u) {
        transformChunk(u, transformNextChunk);
      } else {
        m(null);
      }
    });
  }
}
const at = AxiosTransformStream;
const rt = r(import.meta.url)('events');
const { asyncIterator: ot } = Symbol;
const readBlob = async function* (r) {
  if (r.stream) {
    yield* r.stream();
  } else if (r.arrayBuffer) {
    yield await r.arrayBuffer();
  } else if (r[ot]) {
    yield* r[ot]();
  } else {
    yield r;
  }
};
const st = readBlob;
const ct = Ce.ALPHABET.ALPHA_DIGIT + '-_';
const ut = typeof TextEncoder === 'function' ? new TextEncoder() : new He.TextEncoder();
const dt = '\r\n';
const mt = ut.encode(dt);
const ht = 2;
class FormDataPart {
  constructor(r, u) {
    const { escapeName: m } = this.constructor;
    const v = fe.isString(u);
    let b = `Content-Disposition: form-data; name="${m(r)}"${!v && u.name ? `; filename="${m(u.name)}"` : ''}${dt}`;
    if (v) {
      u = ut.encode(String(u).replace(/\r?\n|\r\n?/g, dt));
    } else {
      b += `Content-Type: ${u.type || 'application/octet-stream'}${dt}`;
    }
    this.headers = ut.encode(b + dt);
    this.contentLength = v ? u.byteLength : u.size;
    this.size = this.headers.byteLength + this.contentLength + ht;
    this.name = r;
    this.value = u;
  }
  async *encode() {
    yield this.headers;
    const { value: r } = this;
    if (fe.isTypedArray(r)) {
      yield r;
    } else {
      yield* st(r);
    }
    yield mt;
  }
  static escapeName(r) {
    return String(r).replace(/[\r\n"]/g, r => ({ '\r': '%0D', '\n': '%0A', '"': '%22' })[r]);
  }
}
const formDataToStream = (r, u, m) => {
  const {
    tag: v = 'form-data-boundary',
    size: b = 25,
    boundary: x = v + '-' + Ce.generateString(b, ct)
  } = m || {};
  if (!fe.isFormData(r)) {
    throw TypeError('FormData instance required');
  }
  if (x.length < 1 || x.length > 70) {
    throw Error('boundary must be 10-70 characters long');
  }
  const w = ut.encode('--' + x + dt);
  const $ = ut.encode('--' + x + '--' + dt);
  let k = $.byteLength;
  const S = Array.from(r.entries()).map(([r, u]) => {
    const m = new FormDataPart(r, u);
    k += m.size;
    return m;
  });
  k += w.byteLength * S.length;
  k = fe.toFiniteNumber(k);
  const I = { 'Content-Type': `multipart/form-data; boundary=${x}` };
  if (Number.isFinite(k)) {
    I['Content-Length'] = k;
  }
  u && u(I);
  return tt.Readable.from(
    (async function* () {
      for (const r of S) {
        yield w;
        yield* r.encode();
      }
      yield $;
    })()
  );
};
const gt = formDataToStream;
class ZlibHeaderTransformStream extends tt.Transform {
  __transform(r, u, m) {
    this.push(r);
    m();
  }
  _transform(r, u, m) {
    if (r.length !== 0) {
      this._transform = this.__transform;
      if (r[0] !== 120) {
        const r = Buffer.alloc(2);
        r[0] = 120;
        r[1] = 156;
        this.push(r, u);
      }
    }
    this.__transform(r, u, m);
  }
}
const vt = ZlibHeaderTransformStream;
const callbackify = (r, u) =>
  fe.isAsyncFn(r)
    ? function (...m) {
        const v = m.pop();
        r.apply(this, m).then(r => {
          try {
            u ? v(null, ...u(r)) : v(null, r);
          } catch (r) {
            v(r);
          }
        }, v);
      }
    : r;
const bt = callbackify;
function speedometer(r, u) {
  r = r || 10;
  const m = new Array(r);
  const v = new Array(r);
  let b = 0;
  let x = 0;
  let w;
  u = u !== undefined ? u : 1e3;
  return function push($) {
    const k = Date.now();
    const S = v[x];
    if (!w) {
      w = k;
    }
    m[b] = $;
    v[b] = k;
    let I = x;
    let z = 0;
    while (I !== b) {
      z += m[I++];
      I = I % r;
    }
    b = (b + 1) % r;
    if (b === x) {
      x = (x + 1) % r;
    }
    if (k - w < u) {
      return;
    }
    const j = S && k - S;
    return j ? Math.round((z * 1e3) / j) : undefined;
  };
}
const yt = speedometer;
function throttle(r, u) {
  let m = 0;
  let v = 1e3 / u;
  let b;
  let x;
  const invoke = (u, v = Date.now()) => {
    m = v;
    b = null;
    if (x) {
      clearTimeout(x);
      x = null;
    }
    r(...u);
  };
  const throttled = (...r) => {
    const u = Date.now();
    const w = u - m;
    if (w >= v) {
      invoke(r, u);
    } else {
      b = r;
      if (!x) {
        x = setTimeout(() => {
          x = null;
          invoke(b);
        }, v - w);
      }
    }
  };
  const flush = () => b && invoke(b);
  return [throttled, flush];
}
const xt = throttle;
const progressEventReducer = (r, u, m = 3) => {
  let v = 0;
  const b = yt(50, 250);
  return xt(m => {
    const x = m.loaded;
    const w = m.lengthComputable ? m.total : undefined;
    const $ = x - v;
    const k = b($);
    const S = x <= w;
    v = x;
    const I = {
      loaded: x,
      total: w,
      progress: w ? x / w : undefined,
      bytes: $,
      rate: k ? k : undefined,
      estimated: k && w && S ? (w - x) / k : undefined,
      event: m,
      lengthComputable: w != null,
      [u ? 'download' : 'upload']: true
    };
    r(I);
  }, m);
};
const progressEventDecorator = (r, u) => {
  const m = r != null;
  return [v => u[0]({ lengthComputable: m, total: r, loaded: v }), u[1]];
};
const asyncDecorator =
  r =>
  (...u) =>
    fe.asap(() => r(...u));
function estimateDataURLDecodedBytes(r) {
  if (!r || typeof r !== 'string') return 0;
  if (!r.startsWith('data:')) return 0;
  const u = r.indexOf(',');
  if (u < 0) return 0;
  const m = r.slice(5, u);
  const v = r.slice(u + 1);
  const b = /;base64/i.test(m);
  if (b) {
    let r = v.length;
    const u = v.length;
    for (let m = 0; m < u; m++) {
      if (v.charCodeAt(m) === 37 && m + 2 < u) {
        const u = v.charCodeAt(m + 1);
        const b = v.charCodeAt(m + 2);
        const x =
          ((u >= 48 && u <= 57) || (u >= 65 && u <= 70) || (u >= 97 && u <= 102)) &&
          ((b >= 48 && b <= 57) || (b >= 65 && b <= 70) || (b >= 97 && b <= 102));
        if (x) {
          r -= 2;
          m += 2;
        }
      }
    }
    let m = 0;
    let b = u - 1;
    const tailIsPct3D = r =>
      r >= 2 &&
      v.charCodeAt(r - 2) === 37 &&
      v.charCodeAt(r - 1) === 51 &&
      (v.charCodeAt(r) === 68 || v.charCodeAt(r) === 100);
    if (b >= 0) {
      if (v.charCodeAt(b) === 61) {
        m++;
        b--;
      } else if (tailIsPct3D(b)) {
        m++;
        b -= 3;
      }
    }
    if (m === 1 && b >= 0) {
      if (v.charCodeAt(b) === 61) {
        m++;
      } else if (tailIsPct3D(b)) {
        m++;
      }
    }
    const x = Math.floor(r / 4);
    const w = x * 3 - (m || 0);
    return w > 0 ? w : 0;
  }
  return Buffer.byteLength(v, 'utf8');
}
const _t = { flush: Ye.constants.Z_SYNC_FLUSH, finishFlush: Ye.constants.Z_SYNC_FLUSH };
const wt = {
  flush: Ye.constants.BROTLI_OPERATION_FLUSH,
  finishFlush: Ye.constants.BROTLI_OPERATION_FLUSH
};
const $t = fe.isFunction(Ye.createBrotliDecompress);
const { http: kt, https: St } = Xe;
const It = /https:?/;
const zt = Ce.protocols.map(r => r + ':');
const flushOnFinish = (r, [u, m]) => {
  r.on('end', m).on('error', m);
  return u;
};
class Http2Sessions {
  constructor() {
    this.sessions = Object.create(null);
  }
  getSession(r, u) {
    u = Object.assign({ sessionTimeout: 1e3 }, u);
    let m = this.sessions[r];
    if (m) {
      let r = m.length;
      for (let v = 0; v < r; v++) {
        const [r, b] = m[v];
        if (!r.destroyed && !r.closed && He.isDeepStrictEqual(b, u)) {
          return r;
        }
      }
    }
    const v = Ge.connect(r, u);
    let b;
    const removeSession = () => {
      if (b) {
        return;
      }
      b = true;
      let u = m,
        x = u.length,
        w = x;
      while (w--) {
        if (u[w][0] === v) {
          if (x === 1) {
            delete this.sessions[r];
          } else {
            u.splice(w, 1);
          }
          if (!v.closed) {
            v.close();
          }
          return;
        }
      }
    };
    const x = v.request;
    const { sessionTimeout: w } = u;
    if (w != null) {
      let r;
      let u = 0;
      v.request = function () {
        const m = x.apply(this, arguments);
        u++;
        if (r) {
          clearTimeout(r);
          r = null;
        }
        m.once('close', () => {
          if (!--u) {
            r = setTimeout(() => {
              r = null;
              removeSession();
            }, w);
          }
        });
        return m;
      };
    }
    v.once('close', removeSession);
    let $ = [v, u];
    m ? m.push($) : (m = this.sessions[r] = [$]);
    return v;
  }
}
const jt = new Http2Sessions();
function dispatchBeforeRedirect(r, u) {
  if (r.beforeRedirects.proxy) {
    r.beforeRedirects.proxy(r);
  }
  if (r.beforeRedirects.config) {
    r.beforeRedirects.config(r, u);
  }
}
function setProxy(r, u, m) {
  let v = u;
  if (!v && v !== false) {
    const r = getProxyForUrl(m);
    if (r) {
      v = new URL(r);
    }
  }
  if (v) {
    if (v.username) {
      v.auth = (v.username || '') + ':' + (v.password || '');
    }
    if (v.auth) {
      const u = Boolean(v.auth.username || v.auth.password);
      if (u) {
        v.auth = (v.auth.username || '') + ':' + (v.auth.password || '');
      } else if (typeof v.auth === 'object') {
        throw new ge('Invalid proxy authorization', ge.ERR_BAD_OPTION, { proxy: v });
      }
      const m = Buffer.from(v.auth, 'utf8').toString('base64');
      r.headers['Proxy-Authorization'] = 'Basic ' + m;
    }
    r.headers.host = r.hostname + (r.port ? ':' + r.port : '');
    const u = v.hostname || v.host;
    r.hostname = u;
    r.host = u;
    r.port = v.port;
    r.path = m;
    if (v.protocol) {
      r.protocol = v.protocol.includes(':') ? v.protocol : `${v.protocol}:`;
    }
  }
  r.beforeRedirects.proxy = function beforeRedirect(r) {
    setProxy(r, u, r.href);
  };
}
const Ot = typeof process !== 'undefined' && fe.kindOf(process) === 'process';
const wrapAsync = r =>
  new Promise((u, m) => {
    let v;
    let b;
    const done = (r, u) => {
      if (b) return;
      b = true;
      v && v(r, u);
    };
    const _resolve = r => {
      done(r);
      u(r);
    };
    const _reject = r => {
      done(r, true);
      m(r);
    };
    r(_resolve, _reject, r => (v = r)).catch(_reject);
  });
const resolveFamily = ({ address: r, family: u }) => {
  if (!fe.isString(r)) {
    throw TypeError('address must be a string');
  }
  return { address: r, family: u || (r.indexOf('.') < 0 ? 6 : 4) };
};
const buildAddressEntry = (r, u) =>
  resolveFamily(fe.isObject(r) ? r : { address: r, family: u });
const Pt = {
  request(r, u) {
    const m =
      r.protocol + '//' + r.hostname + ':' + (r.port || (r.protocol === 'https:' ? 443 : 80));
    const { http2Options: v, headers: b } = r;
    const x = jt.getSession(m, v);
    const {
      HTTP2_HEADER_SCHEME: w,
      HTTP2_HEADER_METHOD: $,
      HTTP2_HEADER_PATH: k,
      HTTP2_HEADER_STATUS: S
    } = Ge.constants;
    const I = { [w]: r.protocol.replace(':', ''), [$]: r.method, [k]: r.path };
    fe.forEach(b, (r, u) => {
      u.charAt(0) !== ':' && (I[u] = r);
    });
    const z = x.request(I);
    z.once('response', r => {
      const m = z;
      r = Object.assign({}, r);
      const v = r[S];
      delete r[S];
      m.headers = r;
      m.statusCode = +v;
      u(m);
    });
    return z;
  }
};
const Ut =
  Ot &&
  function httpAdapter(r) {
    return wrapAsync(async function dispatchHttpRequest(u, m, v) {
      let { data: b, lookup: x, family: w, httpVersion: $ = 1, http2Options: k } = r;
      const { responseType: S, responseEncoding: I } = r;
      const z = r.method.toUpperCase();
      let j;
      let O = false;
      let P;
      $ = +$;
      if (Number.isNaN($)) {
        throw TypeError(`Invalid protocol version: '${r.httpVersion}' is not a number`);
      }
      if ($ !== 1 && $ !== 2) {
        throw TypeError(`Unsupported protocol version '${$}'`);
      }
      const U = $ === 2;
      if (x) {
        const r = bt(x, r => (fe.isArray(r) ? r : [r]));
        x = (u, m, v) => {
          r(u, m, (r, u, b) => {
            if (r) {
              return v(r);
            }
            const x = fe.isArray(u)
              ? u.map(r => buildAddressEntry(r))
              : [buildAddressEntry(u, b)];
            m.all ? v(r, x) : v(r, x[0].address, x[0].family);
          });
        };
      }
      const E = new rt.EventEmitter();
      function abort(u) {
        try {
          E.emit('abort', !u || u.type ? new Me(null, r, P) : u);
        } catch (r) {
          console.warn('emit error', r);
        }
      }
      E.once('abort', m);
      const onFinished = () => {
        if (r.cancelToken) {
          r.cancelToken.unsubscribe(abort);
        }
        if (r.signal) {
          r.signal.removeEventListener('abort', abort);
        }
        E.removeAllListeners();
      };
      if (r.cancelToken || r.signal) {
        r.cancelToken && r.cancelToken.subscribe(abort);
        if (r.signal) {
          r.signal.aborted ? abort() : r.signal.addEventListener('abort', abort);
        }
      }
      v((r, u) => {
        j = true;
        if (u) {
          O = true;
          onFinished();
          return;
        }
        const { data: m } = r;
        if (m instanceof tt.Readable || m instanceof tt.Duplex) {
          const r = tt.finished(m, () => {
            r();
            onFinished();
          });
        } else {
          onFinished();
        }
      });
      const D = buildFullPath(r.baseURL, r.url, r.allowAbsoluteUrls);
      const T = new URL(D, Ce.hasBrowserEnv ? Ce.origin : undefined);
      const A = T.protocol || zt[0];
      if (A === 'data:') {
        if (r.maxContentLength > -1) {
          const u = String(r.url || D || '');
          const v = estimateDataURLDecodedBytes(u);
          if (v > r.maxContentLength) {
            return m(
              new ge(
                'maxContentLength size of ' + r.maxContentLength + ' exceeded',
                ge.ERR_BAD_RESPONSE,
                r
              )
            );
          }
        }
        let v;
        if (z !== 'GET') {
          return settle(u, m, {
            status: 405,
            statusText: 'method not allowed',
            headers: {},
            config: r
          });
        }
        try {
          v = fromDataURI(r.url, S === 'blob', { Blob: r.env && r.env.Blob });
        } catch (u) {
          throw ge.from(u, ge.ERR_BAD_REQUEST, r);
        }
        if (S === 'text') {
          v = v.toString(I);
          if (!I || I === 'utf8') {
            v = fe.stripBOM(v);
          }
        } else if (S === 'stream') {
          v = tt.Readable.from(v);
        }
        return settle(u, m, {
          data: v,
          status: 200,
          statusText: 'OK',
          headers: new Ve(),
          config: r
        });
      }
      if (zt.indexOf(A) === -1) {
        return m(new ge('Unsupported protocol ' + A, ge.ERR_BAD_REQUEST, r));
      }
      const N = Ve.from(r.headers).normalize();
      N.set('User-Agent', 'axios/' + Qe, false);
      const { onUploadProgress: C, onDownloadProgress: L } = r;
      const q = r.maxRate;
      let B = undefined;
      let V = undefined;
      if (fe.isSpecCompliantForm(b)) {
        const r = N.getContentType(/boundary=([-_\w\d]{10,70})/i);
        b = gt(
          b,
          r => {
            N.set(r);
          },
          { tag: `axios-${Qe}-boundary`, boundary: (r && r[1]) || undefined }
        );
      } else if (fe.isFormData(b) && fe.isFunction(b.getHeaders)) {
        N.set(b.getHeaders());
        if (!N.hasContentLength()) {
          try {
            const r = await He.promisify(b.getLength).call(b);
            Number.isFinite(r) && r >= 0 && N.setContentLength(r);
          } catch (r) {}
        }
      } else if (fe.isBlob(b) || fe.isFile(b)) {
        b.size && N.setContentType(b.type || 'application/octet-stream');
        N.setContentLength(b.size || 0);
        b = tt.Readable.from(st(b));
      } else if (b && !fe.isStream(b)) {
        if (Buffer.isBuffer(b)) {
        } else if (fe.isArrayBuffer(b)) {
          b = Buffer.from(new Uint8Array(b));
        } else if (fe.isString(b)) {
          b = Buffer.from(b, 'utf-8');
        } else {
          return m(
            new ge(
              'Data after transformation must be a string, an ArrayBuffer, a Buffer, or a Stream',
              ge.ERR_BAD_REQUEST,
              r
            )
          );
        }
        N.setContentLength(b.length, false);
        if (r.maxBodyLength > -1 && b.length > r.maxBodyLength) {
          return m(
            new ge('Request body larger than maxBodyLength limit', ge.ERR_BAD_REQUEST, r)
          );
        }
      }
      const M = fe.toFiniteNumber(N.getContentLength());
      if (fe.isArray(q)) {
        B = q[0];
        V = q[1];
      } else {
        B = V = q;
      }
      if (b && (C || B)) {
        if (!fe.isStream(b)) {
          b = tt.Readable.from(b, { objectMode: false });
        }
        b = tt.pipeline([b, new at({ maxRate: fe.toFiniteNumber(B) })], fe.noop);
        C &&
          b.on(
            'progress',
            flushOnFinish(
              b,
              progressEventDecorator(M, progressEventReducer(asyncDecorator(C), false, 3))
            )
          );
      }
      let K = undefined;
      if (r.auth) {
        const u = r.auth.username || '';
        const m = r.auth.password || '';
        K = u + ':' + m;
      }
      if (!K && T.username) {
        const r = T.username;
        const u = T.password;
        K = r + ':' + u;
      }
      K && N.delete('authorization');
      let W;
      try {
        W = buildURL(T.pathname + T.search, r.params, r.paramsSerializer).replace(/^\?/, '');
      } catch (u) {
        const v = new Error(u.message);
        v.config = r;
        v.url = r.url;
        v.exists = true;
        return m(v);
      }
      N.set('Accept-Encoding', 'gzip, compress, deflate' + ($t ? ', br' : ''), false);
      const G = {
        path: W,
        method: z,
        headers: N.toJSON(),
        agents: { http: r.httpAgent, https: r.httpsAgent },
        auth: K,
        protocol: A,
        family: w,
        beforeRedirect: dispatchBeforeRedirect,
        beforeRedirects: {},
        http2Options: k
      };
      !fe.isUndefined(x) && (G.lookup = x);
      if (r.socketPath) {
        G.socketPath = r.socketPath;
      } else {
        G.hostname = T.hostname.startsWith('[') ? T.hostname.slice(1, -1) : T.hostname;
        G.port = T.port;
        setProxy(G, r.proxy, A + '//' + T.hostname + (T.port ? ':' + T.port : '') + G.path);
      }
      let Y;
      const Q = It.test(G.protocol);
      G.agent = Q ? r.httpsAgent : r.httpAgent;
      if (U) {
        Y = Pt;
      } else {
        if (r.transport) {
          Y = r.transport;
        } else if (r.maxRedirects === 0) {
          Y = Q ? We : Ke;
        } else {
          if (r.maxRedirects) {
            G.maxRedirects = r.maxRedirects;
          }
          if (r.beforeRedirect) {
            G.beforeRedirects.config = r.beforeRedirect;
          }
          Y = Q ? St : kt;
        }
      }
      if (r.maxBodyLength > -1) {
        G.maxBodyLength = r.maxBodyLength;
      } else {
        G.maxBodyLength = Infinity;
      }
      if (r.insecureHTTPParser) {
        G.insecureHTTPParser = r.insecureHTTPParser;
      }
      P = Y.request(G, function handleResponse(v) {
        if (P.destroyed) return;
        const b = [v];
        const x = fe.toFiniteNumber(v.headers['content-length']);
        if (L || V) {
          const r = new at({ maxRate: fe.toFiniteNumber(V) });
          L &&
            r.on(
              'progress',
              flushOnFinish(
                r,
                progressEventDecorator(x, progressEventReducer(asyncDecorator(L), true, 3))
              )
            );
          b.push(r);
        }
        let w = v;
        const $ = v.req || P;
        if (r.decompress !== false && v.headers['content-encoding']) {
          if (z === 'HEAD' || v.statusCode === 204) {
            delete v.headers['content-encoding'];
          }
          switch ((v.headers['content-encoding'] || '').toLowerCase()) {
            case 'gzip':
            case 'x-gzip':
            case 'compress':
            case 'x-compress':
              b.push(Ye.createUnzip(_t));
              delete v.headers['content-encoding'];
              break;
            case 'deflate':
              b.push(new vt());
              b.push(Ye.createUnzip(_t));
              delete v.headers['content-encoding'];
              break;
            case 'br':
              if ($t) {
                b.push(Ye.createBrotliDecompress(wt));
                delete v.headers['content-encoding'];
              }
          }
        }
        w = b.length > 1 ? tt.pipeline(b, fe.noop) : b[0];
        const k = {
          status: v.statusCode,
          statusText: v.statusMessage,
          headers: new Ve(v.headers),
          config: r,
          request: $
        };
        if (S === 'stream') {
          k.data = w;
          settle(u, m, k);
        } else {
          const v = [];
          let b = 0;
          w.on('data', function handleStreamData(u) {
            v.push(u);
            b += u.length;
            if (r.maxContentLength > -1 && b > r.maxContentLength) {
              O = true;
              w.destroy();
              abort(
                new ge(
                  'maxContentLength size of ' + r.maxContentLength + ' exceeded',
                  ge.ERR_BAD_RESPONSE,
                  r,
                  $
                )
              );
            }
          });
          w.on('aborted', function handlerStreamAborted() {
            if (O) {
              return;
            }
            const u = new ge('stream has been aborted', ge.ERR_BAD_RESPONSE, r, $);
            w.destroy(u);
            m(u);
          });
          w.on('error', function handleStreamError(u) {
            if (P.destroyed) return;
            m(ge.from(u, null, r, $));
          });
          w.on('end', function handleStreamEnd() {
            try {
              let r = v.length === 1 ? v[0] : Buffer.concat(v);
              if (S !== 'arraybuffer') {
                r = r.toString(I);
                if (!I || I === 'utf8') {
                  r = fe.stripBOM(r);
                }
              }
              k.data = r;
            } catch (u) {
              return m(ge.from(u, null, r, k.request, k));
            }
            settle(u, m, k);
          });
        }
        E.once('abort', r => {
          if (!w.destroyed) {
            w.emit('error', r);
            w.destroy();
          }
        });
      });
      E.once('abort', r => {
        if (P.close) {
          P.close();
        } else {
          P.destroy(r);
        }
      });
      P.on('error', function handleRequestError(u) {
        m(ge.from(u, null, r, P));
      });
      P.on('socket', function handleRequestSocket(r) {
        r.setKeepAlive(true, 1e3 * 60);
      });
      if (r.timeout) {
        const u = parseInt(r.timeout, 10);
        if (Number.isNaN(u)) {
          abort(
            new ge(
              'error trying to parse `config.timeout` to int',
              ge.ERR_BAD_OPTION_VALUE,
              r,
              P
            )
          );
          return;
        }
        P.setTimeout(u, function handleRequestTimeout() {
          if (j) return;
          let u = r.timeout ? 'timeout of ' + r.timeout + 'ms exceeded' : 'timeout exceeded';
          const m = r.transitional || Se;
          if (r.timeoutErrorMessage) {
            u = r.timeoutErrorMessage;
          }
          abort(new ge(u, m.clarifyTimeoutError ? ge.ETIMEDOUT : ge.ECONNABORTED, r, P));
        });
      } else {
        P.setTimeout(0);
      }
      if (fe.isStream(b)) {
        let u = false;
        let m = false;
        b.on('end', () => {
          u = true;
        });
        b.once('error', r => {
          m = true;
          P.destroy(r);
        });
        b.on('close', () => {
          if (!u && !m) {
            abort(new Me('Request stream has been aborted', r, P));
          }
        });
        b.pipe(P);
      } else {
        b && P.write(b);
        P.end();
      }
    });
  };
const Et = null && setProxy;
const Dt = Ce.hasStandardBrowserEnv
  ? ((r, u) => m => {
      m = new URL(m, Ce.origin);
      return r.protocol === m.protocol && r.host === m.host && (u || r.port === m.port);
    })(new URL(Ce.origin), Ce.navigator && /(msie|trident)/i.test(Ce.navigator.userAgent))
  : () => true;
const Tt = Ce.hasStandardBrowserEnv
  ? {
      write(r, u, m, v, b, x, w) {
        if (typeof document === 'undefined') return;
        const $ = [`${r}=${encodeURIComponent(u)}`];
        if (fe.isNumber(m)) {
          $.push(`expires=${new Date(m).toUTCString()}`);
        }
        if (fe.isString(v)) {
          $.push(`path=${v}`);
        }
        if (fe.isString(b)) {
          $.push(`domain=${b}`);
        }
        if (x === true) {
          $.push('secure');
        }
        if (fe.isString(w)) {
          $.push(`SameSite=${w}`);
        }
        document.cookie = $.join('; ');
      },
      read(r) {
        if (typeof document === 'undefined') return null;
        const u = document.cookie.match(new RegExp('(?:^|; )' + r + '=([^;]*)'));
        return u ? decodeURIComponent(u[1]) : null;
      },
      remove(r) {
        this.write(r, '', Date.now() - 864e5, '/');
      }
    }
  : {
      write() {},
      read() {
        return null;
      },
      remove() {}
    };
const headersToObject = r => (r instanceof Ve ? { ...r } : r);
function mergeConfig(r, u) {
  u = u || {};
  const m = {};
  function getMergedValue(r, u, m, v) {
    if (fe.isPlainObject(r) && fe.isPlainObject(u)) {
      return fe.merge.call({ caseless: v }, r, u);
    } else if (fe.isPlainObject(u)) {
      return fe.merge({}, u);
    } else if (fe.isArray(u)) {
      return u.slice();
    }
    return u;
  }
  function mergeDeepProperties(r, u, m, v) {
    if (!fe.isUndefined(u)) {
      return getMergedValue(r, u, m, v);
    } else if (!fe.isUndefined(r)) {
      return getMergedValue(undefined, r, m, v);
    }
  }
  function valueFromConfig2(r, u) {
    if (!fe.isUndefined(u)) {
      return getMergedValue(undefined, u);
    }
  }
  function defaultToConfig2(r, u) {
    if (!fe.isUndefined(u)) {
      return getMergedValue(undefined, u);
    } else if (!fe.isUndefined(r)) {
      return getMergedValue(undefined, r);
    }
  }
  function mergeDirectKeys(m, v, b) {
    if (b in u) {
      return getMergedValue(m, v);
    } else if (b in r) {
      return getMergedValue(undefined, m);
    }
  }
  const v = {
    url: valueFromConfig2,
    method: valueFromConfig2,
    data: valueFromConfig2,
    baseURL: defaultToConfig2,
    transformRequest: defaultToConfig2,
    transformResponse: defaultToConfig2,
    paramsSerializer: defaultToConfig2,
    timeout: defaultToConfig2,
    timeoutMessage: defaultToConfig2,
    withCredentials: defaultToConfig2,
    withXSRFToken: defaultToConfig2,
    adapter: defaultToConfig2,
    responseType: defaultToConfig2,
    xsrfCookieName: defaultToConfig2,
    xsrfHeaderName: defaultToConfig2,
    onUploadProgress: defaultToConfig2,
    onDownloadProgress: defaultToConfig2,
    decompress: defaultToConfig2,
    maxContentLength: defaultToConfig2,
    maxBodyLength: defaultToConfig2,
    beforeRedirect: defaultToConfig2,
    transport: defaultToConfig2,
    httpAgent: defaultToConfig2,
    httpsAgent: defaultToConfig2,
    cancelToken: defaultToConfig2,
    socketPath: defaultToConfig2,
    responseEncoding: defaultToConfig2,
    validateStatus: mergeDirectKeys,
    headers: (r, u, m) => mergeDeepProperties(headersToObject(r), headersToObject(u), m, true)
  };
  fe.forEach(Object.keys({ ...r, ...u }), function computeConfigValue(b) {
    if (b === '__proto__' || b === 'constructor' || b === 'prototype') return;
    const x = fe.hasOwnProp(v, b) ? v[b] : mergeDeepProperties;
    const w = x(r[b], u[b], b);
    (fe.isUndefined(w) && x !== mergeDirectKeys) || (m[b] = w);
  });
  return m;
}
const resolveConfig = r => {
  const u = mergeConfig({}, r);
  let {
    data: m,
    withXSRFToken: v,
    xsrfHeaderName: b,
    xsrfCookieName: x,
    headers: w,
    auth: $
  } = u;
  u.headers = w = Ve.from(w);
  u.url = buildURL(
    buildFullPath(u.baseURL, u.url, u.allowAbsoluteUrls),
    r.params,
    r.paramsSerializer
  );
  if ($) {
    w.set(
      'Authorization',
      'Basic ' +
        btoa(
          ($.username || '') +
            ':' +
            ($.password ? unescape(encodeURIComponent($.password)) : '')
        )
    );
  }
  if (fe.isFormData(m)) {
    if (Ce.hasStandardBrowserEnv || Ce.hasStandardBrowserWebWorkerEnv) {
      w.setContentType(undefined);
    } else if (fe.isFunction(m.getHeaders)) {
      const r = m.getHeaders();
      const u = ['content-type', 'content-length'];
      Object.entries(r).forEach(([r, m]) => {
        if (u.includes(r.toLowerCase())) {
          w.set(r, m);
        }
      });
    }
  }
  if (Ce.hasStandardBrowserEnv) {
    v && fe.isFunction(v) && (v = v(u));
    if (v || (v !== false && Dt(u.url))) {
      const r = b && x && Tt.read(x);
      if (r) {
        w.set(b, r);
      }
    }
  }
  return u;
};
const At = typeof XMLHttpRequest !== 'undefined';
const Nt =
  At &&
  function (r) {
    return new Promise(function dispatchXhrRequest(u, m) {
      const v = resolveConfig(r);
      let b = v.data;
      const x = Ve.from(v.headers).normalize();
      let { responseType: w, onUploadProgress: $, onDownloadProgress: k } = v;
      let S;
      let I, z;
      let j, O;
      function done() {
        j && j();
        O && O();
        v.cancelToken && v.cancelToken.unsubscribe(S);
        v.signal && v.signal.removeEventListener('abort', S);
      }
      let P = new XMLHttpRequest();
      P.open(v.method.toUpperCase(), v.url, true);
      P.timeout = v.timeout;
      function onloadend() {
        if (!P) {
          return;
        }
        const v = Ve.from('getAllResponseHeaders' in P && P.getAllResponseHeaders());
        const b = !w || w === 'text' || w === 'json' ? P.responseText : P.response;
        const x = {
          data: b,
          status: P.status,
          statusText: P.statusText,
          headers: v,
          config: r,
          request: P
        };
        settle(
          function _resolve(r) {
            u(r);
            done();
          },
          function _reject(r) {
            m(r);
            done();
          },
          x
        );
        P = null;
      }
      if ('onloadend' in P) {
        P.onloadend = onloadend;
      } else {
        P.onreadystatechange = function handleLoad() {
          if (!P || P.readyState !== 4) {
            return;
          }
          if (P.status === 0 && !(P.responseURL && P.responseURL.indexOf('file:') === 0)) {
            return;
          }
          setTimeout(onloadend);
        };
      }
      P.onabort = function handleAbort() {
        if (!P) {
          return;
        }
        m(new ge('Request aborted', ge.ECONNABORTED, r, P));
        P = null;
      };
      P.onerror = function handleError(u) {
        const v = u && u.message ? u.message : 'Network Error';
        const b = new ge(v, ge.ERR_NETWORK, r, P);
        b.event = u || null;
        m(b);
        P = null;
      };
      P.ontimeout = function handleTimeout() {
        let u = v.timeout ? 'timeout of ' + v.timeout + 'ms exceeded' : 'timeout exceeded';
        const b = v.transitional || Se;
        if (v.timeoutErrorMessage) {
          u = v.timeoutErrorMessage;
        }
        m(new ge(u, b.clarifyTimeoutError ? ge.ETIMEDOUT : ge.ECONNABORTED, r, P));
        P = null;
      };
      b === undefined && x.setContentType(null);
      if ('setRequestHeader' in P) {
        fe.forEach(x.toJSON(), function setRequestHeader(r, u) {
          P.setRequestHeader(u, r);
        });
      }
      if (!fe.isUndefined(v.withCredentials)) {
        P.withCredentials = !!v.withCredentials;
      }
      if (w && w !== 'json') {
        P.responseType = v.responseType;
      }
      if (k) {
        [z, O] = progressEventReducer(k, true);
        P.addEventListener('progress', z);
      }
      if ($ && P.upload) {
        [I, j] = progressEventReducer($);
        P.upload.addEventListener('progress', I);
        P.upload.addEventListener('loadend', j);
      }
      if (v.cancelToken || v.signal) {
        S = u => {
          if (!P) {
            return;
          }
          m(!u || u.type ? new Me(null, r, P) : u);
          P.abort();
          P = null;
        };
        v.cancelToken && v.cancelToken.subscribe(S);
        if (v.signal) {
          v.signal.aborted ? S() : v.signal.addEventListener('abort', S);
        }
      }
      const U = parseProtocol(v.url);
      if (U && Ce.protocols.indexOf(U) === -1) {
        m(new ge('Unsupported protocol ' + U + ':', ge.ERR_BAD_REQUEST, r));
        return;
      }
      P.send(b || null);
    });
  };
const composeSignals = (r, u) => {
  const { length: m } = (r = r ? r.filter(Boolean) : []);
  if (u || m) {
    let m = new AbortController();
    let v;
    const onabort = function (r) {
      if (!v) {
        v = true;
        unsubscribe();
        const u = r instanceof Error ? r : this.reason;
        m.abort(u instanceof ge ? u : new Me(u instanceof Error ? u.message : u));
      }
    };
    let b =
      u &&
      setTimeout(() => {
        b = null;
        onabort(new ge(`timeout of ${u}ms exceeded`, ge.ETIMEDOUT));
      }, u);
    const unsubscribe = () => {
      if (r) {
        b && clearTimeout(b);
        b = null;
        r.forEach(r => {
          r.unsubscribe ? r.unsubscribe(onabort) : r.removeEventListener('abort', onabort);
        });
        r = null;
      }
    };
    r.forEach(r => r.addEventListener('abort', onabort));
    const { signal: x } = m;
    x.unsubscribe = () => fe.asap(unsubscribe);
    return x;
  }
};
const Rt = composeSignals;
const streamChunk = function* (r, u) {
  let m = r.byteLength;
  if (!u || m < u) {
    yield r;
    return;
  }
  let v = 0;
  let b;
  while (v < m) {
    b = v + u;
    yield r.slice(v, b);
    v = b;
  }
};
const readBytes = async function* (r, u) {
  for await (const m of readStream(r)) {
    yield* streamChunk(m, u);
  }
};
const readStream = async function* (r) {
  if (r[Symbol.asyncIterator]) {
    yield* r;
    return;
  }
  const u = r.getReader();
  try {
    for (;;) {
      const { done: r, value: m } = await u.read();
      if (r) {
        break;
      }
      yield m;
    }
  } finally {
    await u.cancel();
  }
};
const trackStream = (r, u, m, v) => {
  const b = readBytes(r, u);
  let x = 0;
  let w;
  let _onFinish = r => {
    if (!w) {
      w = true;
      v && v(r);
    }
  };
  return new ReadableStream(
    {
      async pull(r) {
        try {
          const { done: u, value: v } = await b.next();
          if (u) {
            _onFinish();
            r.close();
            return;
          }
          let w = v.byteLength;
          if (m) {
            let r = (x += w);
            m(r);
          }
          r.enqueue(new Uint8Array(v));
        } catch (r) {
          _onFinish(r);
          throw r;
        }
      },
      cancel(r) {
        _onFinish(r);
        return b.return();
      }
    },
    { highWaterMark: 2 }
  );
};
const Ct = 64 * 1024;
const { isFunction: Lt } = fe;
const Zt = (({ Request: r, Response: u }) => ({ Request: r, Response: u }))(fe.global);
const { ReadableStream: Ft, TextEncoder: qt } = fe.global;
const test = (r, ...u) => {
  try {
    return !!r(...u);
  } catch (r) {
    return false;
  }
};
const factory = r => {
  r = fe.merge.call({ skipUndefined: true }, Zt, r);
  const { fetch: u, Request: m, Response: v } = r;
  const b = u ? Lt(u) : typeof fetch === 'function';
  const x = Lt(m);
  const w = Lt(v);
  if (!b) {
    return false;
  }
  const $ = b && Lt(Ft);
  const k =
    b &&
    (typeof qt === 'function'
      ? (
          r => u =>
            r.encode(u)
        )(new qt())
      : async r => new Uint8Array(await new m(r).arrayBuffer()));
  const S =
    x &&
    $ &&
    test(() => {
      let r = false;
      const u = new Ft();
      const v = new m(Ce.origin, {
        body: u,
        method: 'POST',
        get duplex() {
          r = true;
          return 'half';
        }
      }).headers.has('Content-Type');
      u.cancel();
      return r && !v;
    });
  const I = w && $ && test(() => fe.isReadableStream(new v('').body));
  const z = { stream: I && (r => r.body) };
  b &&
    (() => {
      ['text', 'arrayBuffer', 'blob', 'formData', 'stream'].forEach(r => {
        !z[r] &&
          (z[r] = (u, m) => {
            let v = u && u[r];
            if (v) {
              return v.call(u);
            }
            throw new ge(`Response type '${r}' is not supported`, ge.ERR_NOT_SUPPORT, m);
          });
      });
    })();
  const getBodyLength = async r => {
    if (r == null) {
      return 0;
    }
    if (fe.isBlob(r)) {
      return r.size;
    }
    if (fe.isSpecCompliantForm(r)) {
      const u = new m(Ce.origin, { method: 'POST', body: r });
      return (await u.arrayBuffer()).byteLength;
    }
    if (fe.isArrayBufferView(r) || fe.isArrayBuffer(r)) {
      return r.byteLength;
    }
    if (fe.isURLSearchParams(r)) {
      r = r + '';
    }
    if (fe.isString(r)) {
      return (await k(r)).byteLength;
    }
  };
  const resolveBodyLength = async (r, u) => {
    const m = fe.toFiniteNumber(r.getContentLength());
    return m == null ? getBodyLength(u) : m;
  };
  return async r => {
    let {
      url: b,
      method: w,
      data: $,
      signal: k,
      cancelToken: j,
      timeout: O,
      onDownloadProgress: P,
      onUploadProgress: U,
      responseType: E,
      headers: D,
      withCredentials: T = 'same-origin',
      fetchOptions: A
    } = resolveConfig(r);
    let N = u || fetch;
    E = E ? (E + '').toLowerCase() : 'text';
    let C = Rt([k, j && j.toAbortSignal()], O);
    let L = null;
    const q =
      C &&
      C.unsubscribe &&
      (() => {
        C.unsubscribe();
      });
    let B;
    try {
      if (U && S && w !== 'get' && w !== 'head' && (B = await resolveBodyLength(D, $)) !== 0) {
        let r = new m(b, { method: 'POST', body: $, duplex: 'half' });
        let u;
        if (fe.isFormData($) && (u = r.headers.get('content-type'))) {
          D.setContentType(u);
        }
        if (r.body) {
          const [u, m] = progressEventDecorator(B, progressEventReducer(asyncDecorator(U)));
          $ = trackStream(r.body, Ct, u, m);
        }
      }
      if (!fe.isString(T)) {
        T = T ? 'include' : 'omit';
      }
      const u = x && 'credentials' in m.prototype;
      const k = {
        ...A,
        signal: C,
        method: w.toUpperCase(),
        headers: D.normalize().toJSON(),
        body: $,
        duplex: 'half',
        credentials: u ? T : undefined
      };
      L = x && new m(b, k);
      let j = await (x ? N(L, A) : N(b, k));
      const O = I && (E === 'stream' || E === 'response');
      if (I && (P || (O && q))) {
        const r = {};
        ['status', 'statusText', 'headers'].forEach(u => {
          r[u] = j[u];
        });
        const u = fe.toFiniteNumber(j.headers.get('content-length'));
        const [m, b] =
          (P && progressEventDecorator(u, progressEventReducer(asyncDecorator(P), true))) ||
          [];
        j = new v(
          trackStream(j.body, Ct, m, () => {
            b && b();
            q && q();
          }),
          r
        );
      }
      E = E || 'text';
      let V = await z[fe.findKey(z, E) || 'text'](j, r);
      !O && q && q();
      return await new Promise((u, m) => {
        settle(u, m, {
          data: V,
          headers: Ve.from(j.headers),
          status: j.status,
          statusText: j.statusText,
          config: r,
          request: L
        });
      });
    } catch (u) {
      q && q();
      if (u && u.name === 'TypeError' && /Load failed|fetch/i.test(u.message)) {
        throw Object.assign(new ge('Network Error', ge.ERR_NETWORK, r, L, u && u.response), {
          cause: u.cause || u
        });
      }
      throw ge.from(u, u && u.code, r, L, u && u.response);
    }
  };
};
const Bt = new Map();
const getFetch = r => {
  let u = (r && r.env) || {};
  const { fetch: m, Request: v, Response: b } = u;
  const x = [v, b, m];
  let w = x.length,
    $ = w,
    k,
    S,
    I = Bt;
  while ($--) {
    k = x[$];
    S = I.get(k);
    S === undefined && I.set(k, (S = $ ? new Map() : factory(u)));
    I = S;
  }
  return S;
};
const Vt = getFetch();
const Mt = null && Vt;
const Jt = { http: Ut, xhr: Nt, fetch: { get: getFetch } };
fe.forEach(Jt, (r, u) => {
  if (r) {
    try {
      Object.defineProperty(r, 'name', { value: u });
    } catch (r) {}
    Object.defineProperty(r, 'adapterName', { value: u });
  }
});
const renderReason = r => `- ${r}`;
const isResolvedHandle = r => fe.isFunction(r) || r === null || r === false;
function getAdapter(r, u) {
  r = fe.isArray(r) ? r : [r];
  const { length: m } = r;
  let v;
  let b;
  const x = {};
  for (let w = 0; w < m; w++) {
    v = r[w];
    let m;
    b = v;
    if (!isResolvedHandle(v)) {
      b = Jt[(m = String(v)).toLowerCase()];
      if (b === undefined) {
        throw new ge(`Unknown adapter '${m}'`);
      }
    }
    if (b && (fe.isFunction(b) || (b = b.get(u)))) {
      break;
    }
    x[m || '#' + w] = b;
  }
  if (!b) {
    const r = Object.entries(x).map(
      ([r, u]) =>
        `adapter ${r} ` +
        (u === false ? 'is not supported by the environment' : 'is not available in the build')
    );
    let u = m
      ? r.length > 1
        ? 'since :\n' + r.map(renderReason).join('\n')
        : ' ' + renderReason(r[0])
      : 'as no adapter specified';
    throw new ge(
      `There is no suitable adapter to dispatch the request ` + u,
      'ERR_NOT_SUPPORT'
    );
  }
  return b;
}
const Kt = { getAdapter: getAdapter, adapters: Jt };
function throwIfCancellationRequested(r) {
  if (r.cancelToken) {
    r.cancelToken.throwIfRequested();
  }
  if (r.signal && r.signal.aborted) {
    throw new Me(null, r);
  }
}
function dispatchRequest(r) {
  throwIfCancellationRequested(r);
  r.headers = Ve.from(r.headers);
  r.data = transformData.call(r, r.transformRequest);
  if (['post', 'put', 'patch'].indexOf(r.method) !== -1) {
    r.headers.setContentType('application/x-www-form-urlencoded', false);
  }
  const u = Kt.getAdapter(r.adapter || Fe.adapter, r);
  return u(r).then(
    function onAdapterResolution(u) {
      throwIfCancellationRequested(r);
      u.data = transformData.call(r, r.transformResponse, u);
      u.headers = Ve.from(u.headers);
      return u;
    },
    function onAdapterRejection(u) {
      if (!isCancel(u)) {
        throwIfCancellationRequested(r);
        if (u && u.response) {
          u.response.data = transformData.call(r, r.transformResponse, u.response);
          u.response.headers = Ve.from(u.response.headers);
        }
      }
      return Promise.reject(u);
    }
  );
}
const Wt = {};
['object', 'boolean', 'number', 'function', 'string', 'symbol'].forEach((r, u) => {
  Wt[r] = function validator(m) {
    return typeof m === r || 'a' + (u < 1 ? 'n ' : ' ') + r;
  };
});
const Gt = {};
Wt.transitional = function transitional(r, u, m) {
  function formatMessage(r, u) {
    return '[Axios v' + Qe + "] Transitional option '" + r + "'" + u + (m ? '. ' + m : '');
  }
  return (m, v, b) => {
    if (r === false) {
      throw new ge(
        formatMessage(v, ' has been removed' + (u ? ' in ' + u : '')),
        ge.ERR_DEPRECATED
      );
    }
    if (u && !Gt[v]) {
      Gt[v] = true;
      console.warn(
        formatMessage(
          v,
          ' has been deprecated since v' + u + ' and will be removed in the near future'
        )
      );
    }
    return r ? r(m, v, b) : true;
  };
};
Wt.spelling = function spelling(r) {
  return (u, m) => {
    console.warn(`${m} is likely a misspelling of ${r}`);
    return true;
  };
};
function assertOptions(r, u, m) {
  if (typeof r !== 'object') {
    throw new ge('options must be an object', ge.ERR_BAD_OPTION_VALUE);
  }
  const v = Object.keys(r);
  let b = v.length;
  while (b-- > 0) {
    const x = v[b];
    const w = u[x];
    if (w) {
      const u = r[x];
      const m = u === undefined || w(u, x, r);
      if (m !== true) {
        throw new ge('option ' + x + ' must be ' + m, ge.ERR_BAD_OPTION_VALUE);
      }
      continue;
    }
    if (m !== true) {
      throw new ge('Unknown option ' + x, ge.ERR_BAD_OPTION);
    }
  }
}
const Ht = { assertOptions: assertOptions, validators: Wt };
const Xt = Ht.validators;
class Axios {
  constructor(r) {
    this.defaults = r || {};
    this.interceptors = { request: new ke(), response: new ke() };
  }
  async request(r, u) {
    try {
      return await this._request(r, u);
    } catch (r) {
      if (r instanceof Error) {
        let u = {};
        Error.captureStackTrace ? Error.captureStackTrace(u) : (u = new Error());
        const m = u.stack ? u.stack.replace(/^.+\n/, '') : '';
        try {
          if (!r.stack) {
            r.stack = m;
          } else if (m && !String(r.stack).endsWith(m.replace(/^.+\n.+\n/, ''))) {
            r.stack += '\n' + m;
          }
        } catch (r) {}
      }
      throw r;
    }
  }
  _request(r, u) {
    if (typeof r === 'string') {
      u = u || {};
      u.url = r;
    } else {
      u = r || {};
    }
    u = mergeConfig(this.defaults, u);
    const { transitional: m, paramsSerializer: v, headers: b } = u;
    if (m !== undefined) {
      Ht.assertOptions(
        m,
        {
          silentJSONParsing: Xt.transitional(Xt.boolean),
          forcedJSONParsing: Xt.transitional(Xt.boolean),
          clarifyTimeoutError: Xt.transitional(Xt.boolean),
          legacyInterceptorReqResOrdering: Xt.transitional(Xt.boolean)
        },
        false
      );
    }
    if (v != null) {
      if (fe.isFunction(v)) {
        u.paramsSerializer = { serialize: v };
      } else {
        Ht.assertOptions(v, { encode: Xt.function, serialize: Xt.function }, true);
      }
    }
    if (u.allowAbsoluteUrls !== undefined) {
    } else if (this.defaults.allowAbsoluteUrls !== undefined) {
      u.allowAbsoluteUrls = this.defaults.allowAbsoluteUrls;
    } else {
      u.allowAbsoluteUrls = true;
    }
    Ht.assertOptions(
      u,
      { baseUrl: Xt.spelling('baseURL'), withXsrfToken: Xt.spelling('withXSRFToken') },
      true
    );
    u.method = (u.method || this.defaults.method || 'get').toLowerCase();
    let x = b && fe.merge(b.common, b[u.method]);
    b &&
      fe.forEach(['delete', 'get', 'head', 'post', 'put', 'patch', 'common'], r => {
        delete b[r];
      });
    u.headers = Ve.concat(x, b);
    const w = [];
    let $ = true;
    this.interceptors.request.forEach(function unshiftRequestInterceptors(r) {
      if (typeof r.runWhen === 'function' && r.runWhen(u) === false) {
        return;
      }
      $ = $ && r.synchronous;
      const m = u.transitional || Se;
      const v = m && m.legacyInterceptorReqResOrdering;
      if (v) {
        w.unshift(r.fulfilled, r.rejected);
      } else {
        w.push(r.fulfilled, r.rejected);
      }
    });
    const k = [];
    this.interceptors.response.forEach(function pushResponseInterceptors(r) {
      k.push(r.fulfilled, r.rejected);
    });
    let S;
    let I = 0;
    let z;
    if (!$) {
      const r = [dispatchRequest.bind(this), undefined];
      r.unshift(...w);
      r.push(...k);
      z = r.length;
      S = Promise.resolve(u);
      while (I < z) {
        S = S.then(r[I++], r[I++]);
      }
      return S;
    }
    z = w.length;
    let j = u;
    while (I < z) {
      const r = w[I++];
      const u = w[I++];
      try {
        j = r(j);
      } catch (r) {
        u.call(this, r);
        break;
      }
    }
    try {
      S = dispatchRequest.call(this, j);
    } catch (r) {
      return Promise.reject(r);
    }
    I = 0;
    z = k.length;
    while (I < z) {
      S = S.then(k[I++], k[I++]);
    }
    return S;
  }
  getUri(r) {
    r = mergeConfig(this.defaults, r);
    const u = buildFullPath(r.baseURL, r.url, r.allowAbsoluteUrls);
    return buildURL(u, r.params, r.paramsSerializer);
  }
}
fe.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(r) {
  Axios.prototype[r] = function (u, m) {
    return this.request(mergeConfig(m || {}, { method: r, url: u, data: (m || {}).data }));
  };
});
fe.forEach(['post', 'put', 'patch'], function forEachMethodWithData(r) {
  function generateHTTPMethod(u) {
    return function httpMethod(m, v, b) {
      return this.request(
        mergeConfig(b || {}, {
          method: r,
          headers: u ? { 'Content-Type': 'multipart/form-data' } : {},
          url: m,
          data: v
        })
      );
    };
  }
  Axios.prototype[r] = generateHTTPMethod();
  Axios.prototype[r + 'Form'] = generateHTTPMethod(true);
});
const Yt = Axios;
class CancelToken {
  constructor(r) {
    if (typeof r !== 'function') {
      throw new TypeError('executor must be a function.');
    }
    let u;
    this.promise = new Promise(function promiseExecutor(r) {
      u = r;
    });
    const m = this;
    this.promise.then(r => {
      if (!m._listeners) return;
      let u = m._listeners.length;
      while (u-- > 0) {
        m._listeners[u](r);
      }
      m._listeners = null;
    });
    this.promise.then = r => {
      let u;
      const v = new Promise(r => {
        m.subscribe(r);
        u = r;
      }).then(r);
      v.cancel = function reject() {
        m.unsubscribe(u);
      };
      return v;
    };
    r(function cancel(r, v, b) {
      if (m.reason) {
        return;
      }
      m.reason = new Me(r, v, b);
      u(m.reason);
    });
  }
  throwIfRequested() {
    if (this.reason) {
      throw this.reason;
    }
  }
  subscribe(r) {
    if (this.reason) {
      r(this.reason);
      return;
    }
    if (this._listeners) {
      this._listeners.push(r);
    } else {
      this._listeners = [r];
    }
  }
  unsubscribe(r) {
    if (!this._listeners) {
      return;
    }
    const u = this._listeners.indexOf(r);
    if (u !== -1) {
      this._listeners.splice(u, 1);
    }
  }
  toAbortSignal() {
    const r = new AbortController();
    const abort = u => {
      r.abort(u);
    };
    this.subscribe(abort);
    r.signal.unsubscribe = () => this.unsubscribe(abort);
    return r.signal;
  }
  static source() {
    let r;
    const u = new CancelToken(function executor(u) {
      r = u;
    });
    return { token: u, cancel: r };
  }
}
const Qt = CancelToken;
function spread(r) {
  return function wrap(u) {
    return r.apply(null, u);
  };
}
function isAxiosError(r) {
  return fe.isObject(r) && r.isAxiosError === true;
}
const tn = {
  Continue: 100,
  SwitchingProtocols: 101,
  Processing: 102,
  EarlyHints: 103,
  Ok: 200,
  Created: 201,
  Accepted: 202,
  NonAuthoritativeInformation: 203,
  NoContent: 204,
  ResetContent: 205,
  PartialContent: 206,
  MultiStatus: 207,
  AlreadyReported: 208,
  ImUsed: 226,
  MultipleChoices: 300,
  MovedPermanently: 301,
  Found: 302,
  SeeOther: 303,
  NotModified: 304,
  UseProxy: 305,
  Unused: 306,
  TemporaryRedirect: 307,
  PermanentRedirect: 308,
  BadRequest: 400,
  Unauthorized: 401,
  PaymentRequired: 402,
  Forbidden: 403,
  NotFound: 404,
  MethodNotAllowed: 405,
  NotAcceptable: 406,
  ProxyAuthenticationRequired: 407,
  RequestTimeout: 408,
  Conflict: 409,
  Gone: 410,
  LengthRequired: 411,
  PreconditionFailed: 412,
  PayloadTooLarge: 413,
  UriTooLong: 414,
  UnsupportedMediaType: 415,
  RangeNotSatisfiable: 416,
  ExpectationFailed: 417,
  ImATeapot: 418,
  MisdirectedRequest: 421,
  UnprocessableEntity: 422,
  Locked: 423,
  FailedDependency: 424,
  TooEarly: 425,
  UpgradeRequired: 426,
  PreconditionRequired: 428,
  TooManyRequests: 429,
  RequestHeaderFieldsTooLarge: 431,
  UnavailableForLegalReasons: 451,
  InternalServerError: 500,
  NotImplemented: 501,
  BadGateway: 502,
  ServiceUnavailable: 503,
  GatewayTimeout: 504,
  HttpVersionNotSupported: 505,
  VariantAlsoNegotiates: 506,
  InsufficientStorage: 507,
  LoopDetected: 508,
  NotExtended: 510,
  NetworkAuthenticationRequired: 511,
  WebServerIsDown: 521,
  ConnectionTimedOut: 522,
  OriginIsUnreachable: 523,
  TimeoutOccurred: 524,
  SslHandshakeFailed: 525,
  InvalidSslCertificate: 526
};
Object.entries(tn).forEach(([r, u]) => {
  tn[u] = r;
});
const nn = tn;
function createInstance(r) {
  const u = new Yt(r);
  const m = bind(Yt.prototype.request, u);
  fe.extend(m, Yt.prototype, u, { allOwnKeys: true });
  fe.extend(m, u, null, { allOwnKeys: true });
  m.create = function create(u) {
    return createInstance(mergeConfig(r, u));
  };
  return m;
}
const an = createInstance(Fe);
an.Axios = Yt;
an.CanceledError = Me;
an.CancelToken = Qt;
an.isCancel = isCancel;
an.VERSION = Qe;
an.toFormData = _e;
an.AxiosError = ge;
an.Cancel = an.CanceledError;
an.all = function all(r) {
  return Promise.all(r);
};
an.spread = spread;
an.isAxiosError = isAxiosError;
an.mergeConfig = mergeConfig;
an.AxiosHeaders = Ve;
an.formToJSON = r => Le(fe.isHTMLForm(r) ? new FormData(r) : r);
an.getAdapter = Kt.getAdapter;
an.HttpStatusCode = nn;
an.default = an;
const rn = an;
const on = r(import.meta.url)('async_hooks');
const sn = Object.freeze({ status: 'aborted' });
function $constructor(r, u, m) {
  function init(m, v) {
    if (!m._zod) {
      Object.defineProperty(m, '_zod', {
        value: { def: v, constr: _, traits: new Set() },
        enumerable: false
      });
    }
    if (m._zod.traits.has(r)) {
      return;
    }
    m._zod.traits.add(r);
    u(m, v);
    const b = _.prototype;
    const x = Object.keys(b);
    for (let r = 0; r < x.length; r++) {
      const u = x[r];
      if (!(u in m)) {
        m[u] = b[u].bind(m);
      }
    }
  }
  const v = m?.Parent ?? Object;
  class Definition extends v {}
  Object.defineProperty(Definition, 'name', { value: r });
  function _(r) {
    var u;
    const v = m?.Parent ? new Definition() : this;
    init(v, r);
    (u = v._zod).deferred ?? (u.deferred = []);
    for (const r of v._zod.deferred) {
      r();
    }
    return v;
  }
  Object.defineProperty(_, 'init', { value: init });
  Object.defineProperty(_, Symbol.hasInstance, {
    value: u => {
      if (m?.Parent && u instanceof m.Parent) return true;
      return u?._zod?.traits?.has(r);
    }
  });
  Object.defineProperty(_, 'name', { value: r });
  return _;
}
const cn = Symbol('zod_brand');
class $ZodAsyncError extends Error {
  constructor() {
    super(`Encountered Promise during synchronous parse. Use .parseAsync() instead.`);
  }
}
class $ZodEncodeError extends Error {
  constructor(r) {
    super(`Encountered unidirectional transform during encode: ${r}`);
    this.name = 'ZodEncodeError';
  }
}
const un = {};
function config(r) {
  if (r) Object.assign(un, r);
  return un;
}
function assertEqual(r) {
  return r;
}
function assertNotEqual(r) {
  return r;
}
function assertIs(r) {}
function assertNever(r) {
  throw new Error('Unexpected value in exhaustive check');
}
function assert(r) {}
function getEnumValues(r) {
  const u = Object.values(r).filter(r => typeof r === 'number');
  const m = Object.entries(r)
    .filter(([r, m]) => u.indexOf(+r) === -1)
    .map(([r, u]) => u);
  return m;
}
function joinValues(r, u = '|') {
  return r.map(r => stringifyPrimitive(r)).join(u);
}
function jsonStringifyReplacer(r, u) {
  if (typeof u === 'bigint') return u.toString();
  return u;
}
function cached(r) {
  const u = false;
  return {
    get value() {
      if (!u) {
        const u = r();
        Object.defineProperty(this, 'value', { value: u });
        return u;
      }
      throw new Error('cached value already set');
    }
  };
}
function nullish(r) {
  return r === null || r === undefined;
}
function cleanRegex(r) {
  const u = r.startsWith('^') ? 1 : 0;
  const m = r.endsWith('$') ? r.length - 1 : r.length;
  return r.slice(u, m);
}
function floatSafeRemainder(r, u) {
  const m = (r.toString().split('.')[1] || '').length;
  const v = u.toString();
  let b = (v.split('.')[1] || '').length;
  if (b === 0 && /\d?e-\d?/.test(v)) {
    const r = v.match(/\d?e-(\d?)/);
    if (r?.[1]) {
      b = Number.parseInt(r[1]);
    }
  }
  const x = m > b ? m : b;
  const w = Number.parseInt(r.toFixed(x).replace('.', ''));
  const $ = Number.parseInt(u.toFixed(x).replace('.', ''));
  return (w % $) / 10 ** x;
}
const ln = Symbol('evaluating');
function defineLazy(r, u, m) {
  let v = undefined;
  Object.defineProperty(r, u, {
    get() {
      if (v === ln) {
        return undefined;
      }
      if (v === undefined) {
        v = ln;
        v = m();
      }
      return v;
    },
    set(m) {
      Object.defineProperty(r, u, { value: m });
    },
    configurable: true
  });
}
function objectClone(r) {
  return Object.create(Object.getPrototypeOf(r), Object.getOwnPropertyDescriptors(r));
}
function assignProp(r, u, m) {
  Object.defineProperty(r, u, {
    value: m,
    writable: true,
    enumerable: true,
    configurable: true
  });
}
function mergeDefs(...r) {
  const u = {};
  for (const m of r) {
    const r = Object.getOwnPropertyDescriptors(m);
    Object.assign(u, r);
  }
  return Object.defineProperties({}, u);
}
function cloneDef(r) {
  return mergeDefs(r._zod.def);
}
function getElementAtPath(r, u) {
  if (!u) return r;
  return u.reduce((r, u) => r?.[u], r);
}
function promiseAllObject(r) {
  const u = Object.keys(r);
  const m = u.map(u => r[u]);
  return Promise.all(m).then(r => {
    const m = {};
    for (let v = 0; v < u.length; v++) {
      m[u[v]] = r[v];
    }
    return m;
  });
}
function randomString(r = 10) {
  const u = 'abcdefghijklmnopqrstuvwxyz';
  let m = '';
  for (let v = 0; v < r; v++) {
    m += u[Math.floor(Math.random() * u.length)];
  }
  return m;
}
function esc(r) {
  return JSON.stringify(r);
}
function slugify(r) {
  return r
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
const pn = 'captureStackTrace' in Error ? Error.captureStackTrace : (...r) => {};
function util_isObject(r) {
  return typeof r === 'object' && r !== null && !Array.isArray(r);
}
const dn = cached(() => {
  if (typeof navigator !== 'undefined' && navigator?.userAgent?.includes('Cloudflare')) {
    return false;
  }
  try {
    const r = Function;
    new r('');
    return true;
  } catch (r) {
    return false;
  }
});
function util_isPlainObject(r) {
  if (util_isObject(r) === false) return false;
  const u = r.constructor;
  if (u === undefined) return true;
  if (typeof u !== 'function') return true;
  const m = u.prototype;
  if (util_isObject(m) === false) return false;
  if (Object.prototype.hasOwnProperty.call(m, 'isPrototypeOf') === false) {
    return false;
  }
  return true;
}
function shallowClone(r) {
  if (util_isPlainObject(r)) return { ...r };
  if (Array.isArray(r)) return [...r];
  return r;
}
function numKeys(r) {
  let u = 0;
  for (const m in r) {
    if (Object.prototype.hasOwnProperty.call(r, m)) {
      u++;
    }
  }
  return u;
}
const getParsedType = r => {
  const u = typeof r;
  switch (u) {
    case 'undefined':
      return 'undefined';
    case 'string':
      return 'string';
    case 'number':
      return Number.isNaN(r) ? 'nan' : 'number';
    case 'boolean':
      return 'boolean';
    case 'function':
      return 'function';
    case 'bigint':
      return 'bigint';
    case 'symbol':
      return 'symbol';
    case 'object':
      if (Array.isArray(r)) {
        return 'array';
      }
      if (r === null) {
        return 'null';
      }
      if (r.then && typeof r.then === 'function' && r.catch && typeof r.catch === 'function') {
        return 'promise';
      }
      if (typeof Map !== 'undefined' && r instanceof Map) {
        return 'map';
      }
      if (typeof Set !== 'undefined' && r instanceof Set) {
        return 'set';
      }
      if (typeof Date !== 'undefined' && r instanceof Date) {
        return 'date';
      }
      if (typeof File !== 'undefined' && r instanceof File) {
        return 'file';
      }
      return 'object';
    default:
      throw new Error(`Unknown data type: ${u}`);
  }
};
const mn = new Set(['string', 'number', 'symbol']);
const fn = new Set(['string', 'number', 'bigint', 'boolean', 'symbol', 'undefined']);
function escapeRegex(r) {
  return r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function clone(r, u, m) {
  const v = new r._zod.constr(u ?? r._zod.def);
  if (!u || m?.parent) v._zod.parent = r;
  return v;
}
function normalizeParams(r) {
  const u = r;
  if (!u) return {};
  if (typeof u === 'string') return { error: () => u };
  if (u?.message !== undefined) {
    if (u?.error !== undefined)
      throw new Error('Cannot specify both `message` and `error` params');
    u.error = u.message;
  }
  delete u.message;
  if (typeof u.error === 'string') return { ...u, error: () => u.error };
  return u;
}
function createTransparentProxy(r) {
  let u;
  return new Proxy(
    {},
    {
      get(m, v, b) {
        u ?? (u = r());
        return Reflect.get(u, v, b);
      },
      set(m, v, b, x) {
        u ?? (u = r());
        return Reflect.set(u, v, b, x);
      },
      has(m, v) {
        u ?? (u = r());
        return Reflect.has(u, v);
      },
      deleteProperty(m, v) {
        u ?? (u = r());
        return Reflect.deleteProperty(u, v);
      },
      ownKeys(m) {
        u ?? (u = r());
        return Reflect.ownKeys(u);
      },
      getOwnPropertyDescriptor(m, v) {
        u ?? (u = r());
        return Reflect.getOwnPropertyDescriptor(u, v);
      },
      defineProperty(m, v, b) {
        u ?? (u = r());
        return Reflect.defineProperty(u, v, b);
      }
    }
  );
}
function stringifyPrimitive(r) {
  if (typeof r === 'bigint') return r.toString() + 'n';
  if (typeof r === 'string') return `"${r}"`;
  return `${r}`;
}
function optionalKeys(r) {
  return Object.keys(r).filter(
    u => r[u]._zod.optin === 'optional' && r[u]._zod.optout === 'optional'
  );
}
const hn = {
  safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
  int32: [-2147483648, 2147483647],
  uint32: [0, 4294967295],
  float32: [-34028234663852886e22, 34028234663852886e22],
  float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
};
const gn = {
  int64: [BigInt('-9223372036854775808'), BigInt('9223372036854775807')],
  uint64: [BigInt(0), BigInt('18446744073709551615')]
};
function pick(r, u) {
  const m = r._zod.def;
  const v = m.checks;
  const b = v && v.length > 0;
  if (b) {
    throw new Error('.pick() cannot be used on object schemas containing refinements');
  }
  const x = mergeDefs(r._zod.def, {
    get shape() {
      const r = {};
      for (const v in u) {
        if (!(v in m.shape)) {
          throw new Error(`Unrecognized key: "${v}"`);
        }
        if (!u[v]) continue;
        r[v] = m.shape[v];
      }
      assignProp(this, 'shape', r);
      return r;
    },
    checks: []
  });
  return clone(r, x);
}
function omit(r, u) {
  const m = r._zod.def;
  const v = m.checks;
  const b = v && v.length > 0;
  if (b) {
    throw new Error('.omit() cannot be used on object schemas containing refinements');
  }
  const x = mergeDefs(r._zod.def, {
    get shape() {
      const v = { ...r._zod.def.shape };
      for (const r in u) {
        if (!(r in m.shape)) {
          throw new Error(`Unrecognized key: "${r}"`);
        }
        if (!u[r]) continue;
        delete v[r];
      }
      assignProp(this, 'shape', v);
      return v;
    },
    checks: []
  });
  return clone(r, x);
}
function util_extend(r, u) {
  if (!util_isPlainObject(u)) {
    throw new Error('Invalid input to extend: expected a plain object');
  }
  const m = r._zod.def.checks;
  const v = m && m.length > 0;
  if (v) {
    const m = r._zod.def.shape;
    for (const r in u) {
      if (Object.getOwnPropertyDescriptor(m, r) !== undefined) {
        throw new Error(
          'Cannot overwrite keys on object schemas containing refinements. Use `.safeExtend()` instead.'
        );
      }
    }
  }
  const b = mergeDefs(r._zod.def, {
    get shape() {
      const m = { ...r._zod.def.shape, ...u };
      assignProp(this, 'shape', m);
      return m;
    }
  });
  return clone(r, b);
}
function safeExtend(r, u) {
  if (!util_isPlainObject(u)) {
    throw new Error('Invalid input to safeExtend: expected a plain object');
  }
  const m = mergeDefs(r._zod.def, {
    get shape() {
      const m = { ...r._zod.def.shape, ...u };
      assignProp(this, 'shape', m);
      return m;
    }
  });
  return clone(r, m);
}
function util_merge(r, u) {
  const m = mergeDefs(r._zod.def, {
    get shape() {
      const m = { ...r._zod.def.shape, ...u._zod.def.shape };
      assignProp(this, 'shape', m);
      return m;
    },
    get catchall() {
      return u._zod.def.catchall;
    },
    checks: []
  });
  return clone(r, m);
}
function partial(r, u, m) {
  const v = u._zod.def;
  const b = v.checks;
  const x = b && b.length > 0;
  if (x) {
    throw new Error('.partial() cannot be used on object schemas containing refinements');
  }
  const w = mergeDefs(u._zod.def, {
    get shape() {
      const v = u._zod.def.shape;
      const b = { ...v };
      if (m) {
        for (const u in m) {
          if (!(u in v)) {
            throw new Error(`Unrecognized key: "${u}"`);
          }
          if (!m[u]) continue;
          b[u] = r ? new r({ type: 'optional', innerType: v[u] }) : v[u];
        }
      } else {
        for (const u in v) {
          b[u] = r ? new r({ type: 'optional', innerType: v[u] }) : v[u];
        }
      }
      assignProp(this, 'shape', b);
      return b;
    },
    checks: []
  });
  return clone(u, w);
}
function required(r, u, m) {
  const v = mergeDefs(u._zod.def, {
    get shape() {
      const v = u._zod.def.shape;
      const b = { ...v };
      if (m) {
        for (const u in m) {
          if (!(u in b)) {
            throw new Error(`Unrecognized key: "${u}"`);
          }
          if (!m[u]) continue;
          b[u] = new r({ type: 'nonoptional', innerType: v[u] });
        }
      } else {
        for (const u in v) {
          b[u] = new r({ type: 'nonoptional', innerType: v[u] });
        }
      }
      assignProp(this, 'shape', b);
      return b;
    }
  });
  return clone(u, v);
}
function aborted(r, u = 0) {
  if (r.aborted === true) return true;
  for (let m = u; m < r.issues.length; m++) {
    if (r.issues[m]?.continue !== true) {
      return true;
    }
  }
  return false;
}
function prefixIssues(r, u) {
  return u.map(u => {
    var m;
    (m = u).path ?? (m.path = []);
    u.path.unshift(r);
    return u;
  });
}
function unwrapMessage(r) {
  return typeof r === 'string' ? r : r?.message;
}
function finalizeIssue(r, u, m) {
  const v = { ...r, path: r.path ?? [] };
  if (!r.message) {
    const b =
      unwrapMessage(r.inst?._zod.def?.error?.(r)) ??
      unwrapMessage(u?.error?.(r)) ??
      unwrapMessage(m.customError?.(r)) ??
      unwrapMessage(m.localeError?.(r)) ??
      'Invalid input';
    v.message = b;
  }
  delete v.inst;
  delete v.continue;
  if (!u?.reportInput) {
    delete v.input;
  }
  return v;
}
function getSizableOrigin(r) {
  if (r instanceof Set) return 'set';
  if (r instanceof Map) return 'map';
  if (r instanceof File) return 'file';
  return 'unknown';
}
function getLengthableOrigin(r) {
  if (Array.isArray(r)) return 'array';
  if (typeof r === 'string') return 'string';
  return 'unknown';
}
function parsedType(r) {
  const u = typeof r;
  switch (u) {
    case 'number': {
      return Number.isNaN(r) ? 'nan' : 'number';
    }
    case 'object': {
      if (r === null) {
        return 'null';
      }
      if (Array.isArray(r)) {
        return 'array';
      }
      const u = r;
      if (
        u &&
        Object.getPrototypeOf(u) !== Object.prototype &&
        'constructor' in u &&
        u.constructor
      ) {
        return u.constructor.name;
      }
    }
  }
  return u;
}
function util_issue(...r) {
  const [u, m, v] = r;
  if (typeof u === 'string') {
    return { message: u, code: 'custom', input: m, inst: v };
  }
  return { ...u };
}
function cleanEnum(r) {
  return Object.entries(r)
    .filter(([r, u]) => Number.isNaN(Number.parseInt(r, 10)))
    .map(r => r[1]);
}
function base64ToUint8Array(r) {
  const u = atob(r);
  const m = new Uint8Array(u.length);
  for (let r = 0; r < u.length; r++) {
    m[r] = u.charCodeAt(r);
  }
  return m;
}
function uint8ArrayToBase64(r) {
  let u = '';
  for (let m = 0; m < r.length; m++) {
    u += String.fromCharCode(r[m]);
  }
  return btoa(u);
}
function base64urlToUint8Array(r) {
  const u = r.replace(/-/g, '+').replace(/_/g, '/');
  const m = '='.repeat((4 - (u.length % 4)) % 4);
  return base64ToUint8Array(u + m);
}
function uint8ArrayToBase64url(r) {
  return uint8ArrayToBase64(r).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
function hexToUint8Array(r) {
  const u = r.replace(/^0x/, '');
  if (u.length % 2 !== 0) {
    throw new Error('Invalid hex string length');
  }
  const m = new Uint8Array(u.length / 2);
  for (let r = 0; r < u.length; r += 2) {
    m[r / 2] = Number.parseInt(u.slice(r, r + 2), 16);
  }
  return m;
}
function uint8ArrayToHex(r) {
  return Array.from(r)
    .map(r => r.toString(16).padStart(2, '0'))
    .join('');
}
class Class {
  constructor(...r) {}
}
const initializer = (r, u) => {
  r.name = '$ZodError';
  Object.defineProperty(r, '_zod', { value: r._zod, enumerable: false });
  Object.defineProperty(r, 'issues', { value: u, enumerable: false });
  r.message = JSON.stringify(u, jsonStringifyReplacer, 2);
  Object.defineProperty(r, 'toString', { value: () => r.message, enumerable: false });
};
const vn = $constructor('$ZodError', initializer);
const bn = $constructor('$ZodError', initializer, { Parent: Error });
function flattenError(r, u = r => r.message) {
  const m = {};
  const v = [];
  for (const b of r.issues) {
    if (b.path.length > 0) {
      m[b.path[0]] = m[b.path[0]] || [];
      m[b.path[0]].push(u(b));
    } else {
      v.push(u(b));
    }
  }
  return { formErrors: v, fieldErrors: m };
}
function formatError(r, u = r => r.message) {
  const m = { _errors: [] };
  const processError = r => {
    for (const v of r.issues) {
      if (v.code === 'invalid_union' && v.errors.length) {
        v.errors.map(r => processError({ issues: r }));
      } else if (v.code === 'invalid_key') {
        processError({ issues: v.issues });
      } else if (v.code === 'invalid_element') {
        processError({ issues: v.issues });
      } else if (v.path.length === 0) {
        m._errors.push(u(v));
      } else {
        let r = m;
        let b = 0;
        while (b < v.path.length) {
          const m = v.path[b];
          const x = b === v.path.length - 1;
          if (!x) {
            r[m] = r[m] || { _errors: [] };
          } else {
            r[m] = r[m] || { _errors: [] };
            r[m]._errors.push(u(v));
          }
          r = r[m];
          b++;
        }
      }
    }
  };
  processError(r);
  return m;
}
function treeifyError(r, u = r => r.message) {
  const m = { errors: [] };
  const processError = (r, v = []) => {
    var b, x;
    for (const w of r.issues) {
      if (w.code === 'invalid_union' && w.errors.length) {
        w.errors.map(r => processError({ issues: r }, w.path));
      } else if (w.code === 'invalid_key') {
        processError({ issues: w.issues }, w.path);
      } else if (w.code === 'invalid_element') {
        processError({ issues: w.issues }, w.path);
      } else {
        const r = [...v, ...w.path];
        if (r.length === 0) {
          m.errors.push(u(w));
          continue;
        }
        let $ = m;
        let k = 0;
        while (k < r.length) {
          const m = r[k];
          const v = k === r.length - 1;
          if (typeof m === 'string') {
            $.properties ?? ($.properties = {});
            (b = $.properties)[m] ?? (b[m] = { errors: [] });
            $ = $.properties[m];
          } else {
            $.items ?? ($.items = []);
            (x = $.items)[m] ?? (x[m] = { errors: [] });
            $ = $.items[m];
          }
          if (v) {
            $.errors.push(u(w));
          }
          k++;
        }
      }
    }
  };
  processError(r);
  return m;
}
function toDotPath(r) {
  const u = [];
  const m = r.map(r => (typeof r === 'object' ? r.key : r));
  for (const r of m) {
    if (typeof r === 'number') u.push(`[${r}]`);
    else if (typeof r === 'symbol') u.push(`[${JSON.stringify(String(r))}]`);
    else if (/[^\w$]/.test(r)) u.push(`[${JSON.stringify(r)}]`);
    else {
      if (u.length) u.push('.');
      u.push(r);
    }
  }
  return u.join('');
}
function prettifyError(r) {
  const u = [];
  const m = [...r.issues].sort((r, u) => (r.path ?? []).length - (u.path ?? []).length);
  for (const r of m) {
    u.push(`✖ ${r.message}`);
    if (r.path?.length) u.push(`  → at ${toDotPath(r.path)}`);
  }
  return u.join('\n');
}
const _parse = r => (u, m, v, b) => {
  const x = v ? Object.assign(v, { async: false }) : { async: false };
  const w = u._zod.run({ value: m, issues: [] }, x);
  if (w instanceof Promise) {
    throw new $ZodAsyncError();
  }
  if (w.issues.length) {
    const u = new (b?.Err ?? r)(w.issues.map(r => finalizeIssue(r, x, config())));
    pn(u, b?.callee);
    throw u;
  }
  return w.value;
};
const yn = _parse(bn);
const _parseAsync = r => async (u, m, v, b) => {
  const x = v ? Object.assign(v, { async: true }) : { async: true };
  let w = u._zod.run({ value: m, issues: [] }, x);
  if (w instanceof Promise) w = await w;
  if (w.issues.length) {
    const u = new (b?.Err ?? r)(w.issues.map(r => finalizeIssue(r, x, config())));
    pn(u, b?.callee);
    throw u;
  }
  return w.value;
};
const xn = _parseAsync(bn);
const _safeParse = r => (u, m, v) => {
  const b = v ? { ...v, async: false } : { async: false };
  const x = u._zod.run({ value: m, issues: [] }, b);
  if (x instanceof Promise) {
    throw new $ZodAsyncError();
  }
  return x.issues.length
    ? {
        success: false,
        error: new (r ?? vn)(x.issues.map(r => finalizeIssue(r, b, config())))
      }
    : { success: true, data: x.value };
};
const _n = _safeParse(bn);
const _safeParseAsync = r => async (u, m, v) => {
  const b = v ? Object.assign(v, { async: true }) : { async: true };
  let x = u._zod.run({ value: m, issues: [] }, b);
  if (x instanceof Promise) x = await x;
  return x.issues.length
    ? { success: false, error: new r(x.issues.map(r => finalizeIssue(r, b, config()))) }
    : { success: true, data: x.value };
};
const wn = _safeParseAsync(bn);
const _encode = r => (u, m, v) => {
  const b = v ? Object.assign(v, { direction: 'backward' }) : { direction: 'backward' };
  return _parse(r)(u, m, b);
};
const $n = _encode(bn);
const _decode = r => (u, m, v) => _parse(r)(u, m, v);
const kn = _decode(bn);
const _encodeAsync = r => async (u, m, v) => {
  const b = v ? Object.assign(v, { direction: 'backward' }) : { direction: 'backward' };
  return _parseAsync(r)(u, m, b);
};
const Sn = _encodeAsync(bn);
const _decodeAsync = r => async (u, m, v) => _parseAsync(r)(u, m, v);
const In = _decodeAsync(bn);
const _safeEncode = r => (u, m, v) => {
  const b = v ? Object.assign(v, { direction: 'backward' }) : { direction: 'backward' };
  return _safeParse(r)(u, m, b);
};
const zn = _safeEncode(bn);
const _safeDecode = r => (u, m, v) => _safeParse(r)(u, m, v);
const jn = _safeDecode(bn);
const _safeEncodeAsync = r => async (u, m, v) => {
  const b = v ? Object.assign(v, { direction: 'backward' }) : { direction: 'backward' };
  return _safeParseAsync(r)(u, m, b);
};
const On = _safeEncodeAsync(bn);
const _safeDecodeAsync = r => async (u, m, v) => _safeParseAsync(r)(u, m, v);
const Pn = _safeDecodeAsync(bn);
const Un = /^[cC][^\s-]{8,}$/;
const En = /^[0-9a-z]+$/;
const Dn = /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/;
const Tn = /^[0-9a-vA-V]{20}$/;
const An = /^[A-Za-z0-9]{27}$/;
const Nn = /^[a-zA-Z0-9_-]{21}$/;
const Rn =
  /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/;
const Cn =
  /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
const Ln = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
const uuid = r => {
  if (!r)
    return /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;
  return new RegExp(
    `^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${r}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`
  );
};
const Zn = uuid(4);
const Fn = uuid(6);
const qn = uuid(7);
const Bn =
  /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
const Vn =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const Mn =
  /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
const Jn = /^[^\s@"]{1,64}@[^\s@]{1,255}$/u;
const Kn = Jn;
const Wn =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const Gn = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
function emoji() {
  return new RegExp(Gn, 'u');
}
const Hn =
  /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
const Xn =
  /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
const mac = r => {
  const u = escapeRegex(r ?? ':');
  return new RegExp(`^(?:[0-9A-F]{2}${u}){5}[0-9A-F]{2}$|^(?:[0-9a-f]{2}${u}){5}[0-9a-f]{2}$`);
};
const Yn =
  /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/;
const Qn =
  /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
const ei = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/;
const ti = /^[A-Za-z0-9_-]*$/;
const ni =
  /^(?=.{1,253}\.?$)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[-0-9a-zA-Z]{0,61}[0-9a-zA-Z])?)*\.?$/;
const ii = /^([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
const ai = /^\+[1-9]\d{6,14}$/;
const ri = `(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))`;
const oi = new RegExp(`^${ri}$`);
function timeSource(r) {
  const u = `(?:[01]\\d|2[0-3]):[0-5]\\d`;
  const m =
    typeof r.precision === 'number'
      ? r.precision === -1
        ? `${u}`
        : r.precision === 0
          ? `${u}:[0-5]\\d`
          : `${u}:[0-5]\\d\\.\\d{${r.precision}}`
      : `${u}(?::[0-5]\\d(?:\\.\\d+)?)?`;
  return m;
}
function time(r) {
  return new RegExp(`^${timeSource(r)}$`);
}
function datetime(r) {
  const u = timeSource({ precision: r.precision });
  const m = ['Z'];
  if (r.local) m.push('');
  if (r.offset) m.push(`([+-](?:[01]\\d|2[0-3]):[0-5]\\d)`);
  const v = `${u}(?:${m.join('|')})`;
  return new RegExp(`^${ri}T(?:${v})$`);
}
const string = r => {
  const u = r ? `[\\s\\S]{${r?.minimum ?? 0},${r?.maximum ?? ''}}` : `[\\s\\S]*`;
  return new RegExp(`^${u}$`);
};
const si = /^-?\d+n?$/;
const ci = /^-?\d+$/;
const ui = /^-?\d+(?:\.\d+)?$/;
const li = /^(?:true|false)$/i;
const pi = /^null$/i;
const di = /^undefined$/i;
const mi = /^[^A-Z]*$/;
const hi = /^[^a-z]*$/;
const gi = /^[0-9a-fA-F]*$/;
function fixedBase64(r, u) {
  return new RegExp(`^[A-Za-z0-9+/]{${r}}${u}$`);
}
function fixedBase64url(r) {
  return new RegExp(`^[A-Za-z0-9_-]{${r}}$`);
}
const bi = /^[0-9a-fA-F]{32}$/;
const yi = fixedBase64(22, '==');
const xi = fixedBase64url(22);
const _i = /^[0-9a-fA-F]{40}$/;
const wi = fixedBase64(27, '=');
const $i = fixedBase64url(27);
const ki = /^[0-9a-fA-F]{64}$/;
const Si = fixedBase64(43, '=');
const Ii = fixedBase64url(43);
const zi = /^[0-9a-fA-F]{96}$/;
const ji = fixedBase64(64, '');
const Oi = fixedBase64url(64);
const Pi = /^[0-9a-fA-F]{128}$/;
const Ui = fixedBase64(86, '==');
const Ei = fixedBase64url(86);
const Di = $constructor('$ZodCheck', (r, u) => {
  var m;
  r._zod ?? (r._zod = {});
  r._zod.def = u;
  (m = r._zod).onattach ?? (m.onattach = []);
});
const Ti = { number: 'number', bigint: 'bigint', object: 'date' };
const Ai = $constructor('$ZodCheckLessThan', (r, u) => {
  Di.init(r, u);
  const m = Ti[typeof u.value];
  r._zod.onattach.push(r => {
    const m = r._zod.bag;
    const v = (u.inclusive ? m.maximum : m.exclusiveMaximum) ?? Number.POSITIVE_INFINITY;
    if (u.value < v) {
      if (u.inclusive) m.maximum = u.value;
      else m.exclusiveMaximum = u.value;
    }
  });
  r._zod.check = v => {
    if (u.inclusive ? v.value <= u.value : v.value < u.value) {
      return;
    }
    v.issues.push({
      origin: m,
      code: 'too_big',
      maximum: typeof u.value === 'object' ? u.value.getTime() : u.value,
      input: v.value,
      inclusive: u.inclusive,
      inst: r,
      continue: !u.abort
    });
  };
});
const Ni = $constructor('$ZodCheckGreaterThan', (r, u) => {
  Di.init(r, u);
  const m = Ti[typeof u.value];
  r._zod.onattach.push(r => {
    const m = r._zod.bag;
    const v = (u.inclusive ? m.minimum : m.exclusiveMinimum) ?? Number.NEGATIVE_INFINITY;
    if (u.value > v) {
      if (u.inclusive) m.minimum = u.value;
      else m.exclusiveMinimum = u.value;
    }
  });
  r._zod.check = v => {
    if (u.inclusive ? v.value >= u.value : v.value > u.value) {
      return;
    }
    v.issues.push({
      origin: m,
      code: 'too_small',
      minimum: typeof u.value === 'object' ? u.value.getTime() : u.value,
      input: v.value,
      inclusive: u.inclusive,
      inst: r,
      continue: !u.abort
    });
  };
});
const Ri = $constructor('$ZodCheckMultipleOf', (r, u) => {
  Di.init(r, u);
  r._zod.onattach.push(r => {
    var m;
    (m = r._zod.bag).multipleOf ?? (m.multipleOf = u.value);
  });
  r._zod.check = m => {
    if (typeof m.value !== typeof u.value)
      throw new Error('Cannot mix number and bigint in multiple_of check.');
    const v =
      typeof m.value === 'bigint'
        ? m.value % u.value === BigInt(0)
        : floatSafeRemainder(m.value, u.value) === 0;
    if (v) return;
    m.issues.push({
      origin: typeof m.value,
      code: 'not_multiple_of',
      divisor: u.value,
      input: m.value,
      inst: r,
      continue: !u.abort
    });
  };
});
const Ci = $constructor('$ZodCheckNumberFormat', (r, u) => {
  Di.init(r, u);
  u.format = u.format || 'float64';
  const m = u.format?.includes('int');
  const v = m ? 'int' : 'number';
  const [b, x] = hn[u.format];
  r._zod.onattach.push(r => {
    const v = r._zod.bag;
    v.format = u.format;
    v.minimum = b;
    v.maximum = x;
    if (m) v.pattern = ci;
  });
  r._zod.check = w => {
    const $ = w.value;
    if (m) {
      if (!Number.isInteger($)) {
        w.issues.push({
          expected: v,
          format: u.format,
          code: 'invalid_type',
          continue: false,
          input: $,
          inst: r
        });
        return;
      }
      if (!Number.isSafeInteger($)) {
        if ($ > 0) {
          w.issues.push({
            input: $,
            code: 'too_big',
            maximum: Number.MAX_SAFE_INTEGER,
            note: 'Integers must be within the safe integer range.',
            inst: r,
            origin: v,
            inclusive: true,
            continue: !u.abort
          });
        } else {
          w.issues.push({
            input: $,
            code: 'too_small',
            minimum: Number.MIN_SAFE_INTEGER,
            note: 'Integers must be within the safe integer range.',
            inst: r,
            origin: v,
            inclusive: true,
            continue: !u.abort
          });
        }
        return;
      }
    }
    if ($ < b) {
      w.issues.push({
        origin: 'number',
        input: $,
        code: 'too_small',
        minimum: b,
        inclusive: true,
        inst: r,
        continue: !u.abort
      });
    }
    if ($ > x) {
      w.issues.push({
        origin: 'number',
        input: $,
        code: 'too_big',
        maximum: x,
        inclusive: true,
        inst: r,
        continue: !u.abort
      });
    }
  };
});
const Li = $constructor('$ZodCheckBigIntFormat', (r, u) => {
  Di.init(r, u);
  const [m, v] = gn[u.format];
  r._zod.onattach.push(r => {
    const b = r._zod.bag;
    b.format = u.format;
    b.minimum = m;
    b.maximum = v;
  });
  r._zod.check = b => {
    const x = b.value;
    if (x < m) {
      b.issues.push({
        origin: 'bigint',
        input: x,
        code: 'too_small',
        minimum: m,
        inclusive: true,
        inst: r,
        continue: !u.abort
      });
    }
    if (x > v) {
      b.issues.push({
        origin: 'bigint',
        input: x,
        code: 'too_big',
        maximum: v,
        inclusive: true,
        inst: r,
        continue: !u.abort
      });
    }
  };
});
const Zi = $constructor('$ZodCheckMaxSize', (r, u) => {
  var m;
  Di.init(r, u);
  (m = r._zod.def).when ??
    (m.when = r => {
      const u = r.value;
      return !nullish(u) && u.size !== undefined;
    });
  r._zod.onattach.push(r => {
    const m = r._zod.bag.maximum ?? Number.POSITIVE_INFINITY;
    if (u.maximum < m) r._zod.bag.maximum = u.maximum;
  });
  r._zod.check = m => {
    const v = m.value;
    const b = v.size;
    if (b <= u.maximum) return;
    m.issues.push({
      origin: getSizableOrigin(v),
      code: 'too_big',
      maximum: u.maximum,
      inclusive: true,
      input: v,
      inst: r,
      continue: !u.abort
    });
  };
});
const Fi = $constructor('$ZodCheckMinSize', (r, u) => {
  var m;
  Di.init(r, u);
  (m = r._zod.def).when ??
    (m.when = r => {
      const u = r.value;
      return !nullish(u) && u.size !== undefined;
    });
  r._zod.onattach.push(r => {
    const m = r._zod.bag.minimum ?? Number.NEGATIVE_INFINITY;
    if (u.minimum > m) r._zod.bag.minimum = u.minimum;
  });
  r._zod.check = m => {
    const v = m.value;
    const b = v.size;
    if (b >= u.minimum) return;
    m.issues.push({
      origin: getSizableOrigin(v),
      code: 'too_small',
      minimum: u.minimum,
      inclusive: true,
      input: v,
      inst: r,
      continue: !u.abort
    });
  };
});
const qi = $constructor('$ZodCheckSizeEquals', (r, u) => {
  var m;
  Di.init(r, u);
  (m = r._zod.def).when ??
    (m.when = r => {
      const u = r.value;
      return !nullish(u) && u.size !== undefined;
    });
  r._zod.onattach.push(r => {
    const m = r._zod.bag;
    m.minimum = u.size;
    m.maximum = u.size;
    m.size = u.size;
  });
  r._zod.check = m => {
    const v = m.value;
    const b = v.size;
    if (b === u.size) return;
    const x = b > u.size;
    m.issues.push({
      origin: getSizableOrigin(v),
      ...(x ? { code: 'too_big', maximum: u.size } : { code: 'too_small', minimum: u.size }),
      inclusive: true,
      exact: true,
      input: m.value,
      inst: r,
      continue: !u.abort
    });
  };
});
const Bi = $constructor('$ZodCheckMaxLength', (r, u) => {
  var m;
  Di.init(r, u);
  (m = r._zod.def).when ??
    (m.when = r => {
      const u = r.value;
      return !nullish(u) && u.length !== undefined;
    });
  r._zod.onattach.push(r => {
    const m = r._zod.bag.maximum ?? Number.POSITIVE_INFINITY;
    if (u.maximum < m) r._zod.bag.maximum = u.maximum;
  });
  r._zod.check = m => {
    const v = m.value;
    const b = v.length;
    if (b <= u.maximum) return;
    const x = getLengthableOrigin(v);
    m.issues.push({
      origin: x,
      code: 'too_big',
      maximum: u.maximum,
      inclusive: true,
      input: v,
      inst: r,
      continue: !u.abort
    });
  };
});
const Vi = $constructor('$ZodCheckMinLength', (r, u) => {
  var m;
  Di.init(r, u);
  (m = r._zod.def).when ??
    (m.when = r => {
      const u = r.value;
      return !nullish(u) && u.length !== undefined;
    });
  r._zod.onattach.push(r => {
    const m = r._zod.bag.minimum ?? Number.NEGATIVE_INFINITY;
    if (u.minimum > m) r._zod.bag.minimum = u.minimum;
  });
  r._zod.check = m => {
    const v = m.value;
    const b = v.length;
    if (b >= u.minimum) return;
    const x = getLengthableOrigin(v);
    m.issues.push({
      origin: x,
      code: 'too_small',
      minimum: u.minimum,
      inclusive: true,
      input: v,
      inst: r,
      continue: !u.abort
    });
  };
});
const Mi = $constructor('$ZodCheckLengthEquals', (r, u) => {
  var m;
  Di.init(r, u);
  (m = r._zod.def).when ??
    (m.when = r => {
      const u = r.value;
      return !nullish(u) && u.length !== undefined;
    });
  r._zod.onattach.push(r => {
    const m = r._zod.bag;
    m.minimum = u.length;
    m.maximum = u.length;
    m.length = u.length;
  });
  r._zod.check = m => {
    const v = m.value;
    const b = v.length;
    if (b === u.length) return;
    const x = getLengthableOrigin(v);
    const w = b > u.length;
    m.issues.push({
      origin: x,
      ...(w
        ? { code: 'too_big', maximum: u.length }
        : { code: 'too_small', minimum: u.length }),
      inclusive: true,
      exact: true,
      input: m.value,
      inst: r,
      continue: !u.abort
    });
  };
});
const Ji = $constructor('$ZodCheckStringFormat', (r, u) => {
  var m, v;
  Di.init(r, u);
  r._zod.onattach.push(r => {
    const m = r._zod.bag;
    m.format = u.format;
    if (u.pattern) {
      m.patterns ?? (m.patterns = new Set());
      m.patterns.add(u.pattern);
    }
  });
  if (u.pattern)
    (m = r._zod).check ??
      (m.check = m => {
        u.pattern.lastIndex = 0;
        if (u.pattern.test(m.value)) return;
        m.issues.push({
          origin: 'string',
          code: 'invalid_format',
          format: u.format,
          input: m.value,
          ...(u.pattern ? { pattern: u.pattern.toString() } : {}),
          inst: r,
          continue: !u.abort
        });
      });
  else (v = r._zod).check ?? (v.check = () => {});
});
const Ki = $constructor('$ZodCheckRegex', (r, u) => {
  Ji.init(r, u);
  r._zod.check = m => {
    u.pattern.lastIndex = 0;
    if (u.pattern.test(m.value)) return;
    m.issues.push({
      origin: 'string',
      code: 'invalid_format',
      format: 'regex',
      input: m.value,
      pattern: u.pattern.toString(),
      inst: r,
      continue: !u.abort
    });
  };
});
const Wi = $constructor('$ZodCheckLowerCase', (r, u) => {
  u.pattern ?? (u.pattern = mi);
  Ji.init(r, u);
});
const Gi = $constructor('$ZodCheckUpperCase', (r, u) => {
  u.pattern ?? (u.pattern = hi);
  Ji.init(r, u);
});
const Hi = $constructor('$ZodCheckIncludes', (r, u) => {
  Di.init(r, u);
  const m = escapeRegex(u.includes);
  const v = new RegExp(typeof u.position === 'number' ? `^.{${u.position}}${m}` : m);
  u.pattern = v;
  r._zod.onattach.push(r => {
    const u = r._zod.bag;
    u.patterns ?? (u.patterns = new Set());
    u.patterns.add(v);
  });
  r._zod.check = m => {
    if (m.value.includes(u.includes, u.position)) return;
    m.issues.push({
      origin: 'string',
      code: 'invalid_format',
      format: 'includes',
      includes: u.includes,
      input: m.value,
      inst: r,
      continue: !u.abort
    });
  };
});
const Xi = $constructor('$ZodCheckStartsWith', (r, u) => {
  Di.init(r, u);
  const m = new RegExp(`^${escapeRegex(u.prefix)}.*`);
  u.pattern ?? (u.pattern = m);
  r._zod.onattach.push(r => {
    const u = r._zod.bag;
    u.patterns ?? (u.patterns = new Set());
    u.patterns.add(m);
  });
  r._zod.check = m => {
    if (m.value.startsWith(u.prefix)) return;
    m.issues.push({
      origin: 'string',
      code: 'invalid_format',
      format: 'starts_with',
      prefix: u.prefix,
      input: m.value,
      inst: r,
      continue: !u.abort
    });
  };
});
const Yi = $constructor('$ZodCheckEndsWith', (r, u) => {
  Di.init(r, u);
  const m = new RegExp(`.*${escapeRegex(u.suffix)}$`);
  u.pattern ?? (u.pattern = m);
  r._zod.onattach.push(r => {
    const u = r._zod.bag;
    u.patterns ?? (u.patterns = new Set());
    u.patterns.add(m);
  });
  r._zod.check = m => {
    if (m.value.endsWith(u.suffix)) return;
    m.issues.push({
      origin: 'string',
      code: 'invalid_format',
      format: 'ends_with',
      suffix: u.suffix,
      input: m.value,
      inst: r,
      continue: !u.abort
    });
  };
});
function handleCheckPropertyResult(r, u, m) {
  if (r.issues.length) {
    u.issues.push(...prefixIssues(m, r.issues));
  }
}
const Qi = $constructor('$ZodCheckProperty', (r, u) => {
  Di.init(r, u);
  r._zod.check = r => {
    const m = u.schema._zod.run({ value: r.value[u.property], issues: [] }, {});
    if (m instanceof Promise) {
      return m.then(m => handleCheckPropertyResult(m, r, u.property));
    }
    handleCheckPropertyResult(m, r, u.property);
    return;
  };
});
const ea = $constructor('$ZodCheckMimeType', (r, u) => {
  Di.init(r, u);
  const m = new Set(u.mime);
  r._zod.onattach.push(r => {
    r._zod.bag.mime = u.mime;
  });
  r._zod.check = v => {
    if (m.has(v.value.type)) return;
    v.issues.push({
      code: 'invalid_value',
      values: u.mime,
      input: v.value.type,
      inst: r,
      continue: !u.abort
    });
  };
});
const na = $constructor('$ZodCheckOverwrite', (r, u) => {
  Di.init(r, u);
  r._zod.check = r => {
    r.value = u.tx(r.value);
  };
});
class Doc {
  constructor(r = []) {
    this.content = [];
    this.indent = 0;
    if (this) this.args = r;
  }
  indented(r) {
    this.indent += 1;
    r(this);
    this.indent -= 1;
  }
  write(r) {
    if (typeof r === 'function') {
      r(this, { execution: 'sync' });
      r(this, { execution: 'async' });
      return;
    }
    const u = r;
    const m = u.split('\n').filter(r => r);
    const v = Math.min(...m.map(r => r.length - r.trimStart().length));
    const b = m.map(r => r.slice(v)).map(r => ' '.repeat(this.indent * 2) + r);
    for (const r of b) {
      this.content.push(r);
    }
  }
  compile() {
    const r = Function;
    const u = this?.args;
    const m = this?.content ?? [``];
    const v = [...m.map(r => `  ${r}`)];
    return new r(...u, v.join('\n'));
  }
}
const ia = { major: 4, minor: 3, patch: 6 };
const aa = $constructor('$ZodType', (r, u) => {
  var m;
  r ?? (r = {});
  r._zod.def = u;
  r._zod.bag = r._zod.bag || {};
  r._zod.version = ia;
  const v = [...(r._zod.def.checks ?? [])];
  if (r._zod.traits.has('$ZodCheck')) {
    v.unshift(r);
  }
  for (const u of v) {
    for (const m of u._zod.onattach) {
      m(r);
    }
  }
  if (v.length === 0) {
    (m = r._zod).deferred ?? (m.deferred = []);
    r._zod.deferred?.push(() => {
      r._zod.run = r._zod.parse;
    });
  } else {
    const runChecks = (r, u, m) => {
      let v = aborted(r);
      let b;
      for (const x of u) {
        if (x._zod.def.when) {
          const u = x._zod.def.when(r);
          if (!u) continue;
        } else if (v) {
          continue;
        }
        const u = r.issues.length;
        const w = x._zod.check(r);
        if (w instanceof Promise && m?.async === false) {
          throw new $ZodAsyncError();
        }
        if (b || w instanceof Promise) {
          b = (b ?? Promise.resolve()).then(async () => {
            await w;
            const m = r.issues.length;
            if (m === u) return;
            if (!v) v = aborted(r, u);
          });
        } else {
          const m = r.issues.length;
          if (m === u) continue;
          if (!v) v = aborted(r, u);
        }
      }
      if (b) {
        return b.then(() => r);
      }
      return r;
    };
    const handleCanaryResult = (u, m, b) => {
      if (aborted(u)) {
        u.aborted = true;
        return u;
      }
      const x = runChecks(m, v, b);
      if (x instanceof Promise) {
        if (b.async === false) throw new $ZodAsyncError();
        return x.then(u => r._zod.parse(u, b));
      }
      return r._zod.parse(x, b);
    };
    r._zod.run = (u, m) => {
      if (m.skipChecks) {
        return r._zod.parse(u, m);
      }
      if (m.direction === 'backward') {
        const v = r._zod.parse({ value: u.value, issues: [] }, { ...m, skipChecks: true });
        if (v instanceof Promise) {
          return v.then(r => handleCanaryResult(r, u, m));
        }
        return handleCanaryResult(v, u, m);
      }
      const b = r._zod.parse(u, m);
      if (b instanceof Promise) {
        if (m.async === false) throw new $ZodAsyncError();
        return b.then(r => runChecks(r, v, m));
      }
      return runChecks(b, v, m);
    };
  }
  defineLazy(r, '~standard', () => ({
    validate: u => {
      try {
        const m = _n(r, u);
        return m.success ? { value: m.data } : { issues: m.error?.issues };
      } catch (m) {
        return wn(r, u).then(r =>
          r.success ? { value: r.data } : { issues: r.error?.issues }
        );
      }
    },
    vendor: 'zod',
    version: 1
  }));
});
const ra = $constructor('$ZodString', (r, u) => {
  aa.init(r, u);
  r._zod.pattern = [...(r?._zod.bag?.patterns ?? [])].pop() ?? string(r._zod.bag);
  r._zod.parse = (m, v) => {
    if (u.coerce)
      try {
        m.value = String(m.value);
      } catch (v) {}
    if (typeof m.value === 'string') return m;
    m.issues.push({ expected: 'string', code: 'invalid_type', input: m.value, inst: r });
    return m;
  };
});
const oa = $constructor('$ZodStringFormat', (r, u) => {
  Ji.init(r, u);
  ra.init(r, u);
});
const sa = $constructor('$ZodGUID', (r, u) => {
  u.pattern ?? (u.pattern = Ln);
  oa.init(r, u);
});
const la = $constructor('$ZodUUID', (r, u) => {
  if (u.version) {
    const r = { v1: 1, v2: 2, v3: 3, v4: 4, v5: 5, v6: 6, v7: 7, v8: 8 };
    const m = r[u.version];
    if (m === undefined) throw new Error(`Invalid UUID version: "${u.version}"`);
    u.pattern ?? (u.pattern = uuid(m));
  } else u.pattern ?? (u.pattern = uuid());
  oa.init(r, u);
});
const pa = $constructor('$ZodEmail', (r, u) => {
  u.pattern ?? (u.pattern = Bn);
  oa.init(r, u);
});
const ma = $constructor('$ZodURL', (r, u) => {
  oa.init(r, u);
  r._zod.check = m => {
    try {
      const v = m.value.trim();
      const b = new URL(v);
      if (u.hostname) {
        u.hostname.lastIndex = 0;
        if (!u.hostname.test(b.hostname)) {
          m.issues.push({
            code: 'invalid_format',
            format: 'url',
            note: 'Invalid hostname',
            pattern: u.hostname.source,
            input: m.value,
            inst: r,
            continue: !u.abort
          });
        }
      }
      if (u.protocol) {
        u.protocol.lastIndex = 0;
        if (
          !u.protocol.test(b.protocol.endsWith(':') ? b.protocol.slice(0, -1) : b.protocol)
        ) {
          m.issues.push({
            code: 'invalid_format',
            format: 'url',
            note: 'Invalid protocol',
            pattern: u.protocol.source,
            input: m.value,
            inst: r,
            continue: !u.abort
          });
        }
      }
      if (u.normalize) {
        m.value = b.href;
      } else {
        m.value = v;
      }
      return;
    } catch (v) {
      m.issues.push({
        code: 'invalid_format',
        format: 'url',
        input: m.value,
        inst: r,
        continue: !u.abort
      });
    }
  };
});
const ha = $constructor('$ZodEmoji', (r, u) => {
  u.pattern ?? (u.pattern = emoji());
  oa.init(r, u);
});
const ga = $constructor('$ZodNanoID', (r, u) => {
  u.pattern ?? (u.pattern = Nn);
  oa.init(r, u);
});
const va = $constructor('$ZodCUID', (r, u) => {
  u.pattern ?? (u.pattern = Un);
  oa.init(r, u);
});
const ba = $constructor('$ZodCUID2', (r, u) => {
  u.pattern ?? (u.pattern = En);
  oa.init(r, u);
});
const ya = $constructor('$ZodULID', (r, u) => {
  u.pattern ?? (u.pattern = Dn);
  oa.init(r, u);
});
const xa = $constructor('$ZodXID', (r, u) => {
  u.pattern ?? (u.pattern = Tn);
  oa.init(r, u);
});
const _a = $constructor('$ZodKSUID', (r, u) => {
  u.pattern ?? (u.pattern = An);
  oa.init(r, u);
});
const wa = $constructor('$ZodISODateTime', (r, u) => {
  u.pattern ?? (u.pattern = datetime(u));
  oa.init(r, u);
});
const $a = $constructor('$ZodISODate', (r, u) => {
  u.pattern ?? (u.pattern = oi);
  oa.init(r, u);
});
const Sa = $constructor('$ZodISOTime', (r, u) => {
  u.pattern ?? (u.pattern = time(u));
  oa.init(r, u);
});
const Ia = $constructor('$ZodISODuration', (r, u) => {
  u.pattern ?? (u.pattern = Rn);
  oa.init(r, u);
});
const za = $constructor('$ZodIPv4', (r, u) => {
  u.pattern ?? (u.pattern = Hn);
  oa.init(r, u);
  r._zod.bag.format = `ipv4`;
});
const Oa = $constructor('$ZodIPv6', (r, u) => {
  u.pattern ?? (u.pattern = Xn);
  oa.init(r, u);
  r._zod.bag.format = `ipv6`;
  r._zod.check = m => {
    try {
      new URL(`http://[${m.value}]`);
    } catch {
      m.issues.push({
        code: 'invalid_format',
        format: 'ipv6',
        input: m.value,
        inst: r,
        continue: !u.abort
      });
    }
  };
});
const Pa = $constructor('$ZodMAC', (r, u) => {
  u.pattern ?? (u.pattern = mac(u.delimiter));
  oa.init(r, u);
  r._zod.bag.format = `mac`;
});
const Ua = $constructor('$ZodCIDRv4', (r, u) => {
  u.pattern ?? (u.pattern = Yn);
  oa.init(r, u);
});
const Ea = $constructor('$ZodCIDRv6', (r, u) => {
  u.pattern ?? (u.pattern = Qn);
  oa.init(r, u);
  r._zod.check = m => {
    const v = m.value.split('/');
    try {
      if (v.length !== 2) throw new Error();
      const [r, u] = v;
      if (!u) throw new Error();
      const m = Number(u);
      if (`${m}` !== u) throw new Error();
      if (m < 0 || m > 128) throw new Error();
      new URL(`http://[${r}]`);
    } catch {
      m.issues.push({
        code: 'invalid_format',
        format: 'cidrv6',
        input: m.value,
        inst: r,
        continue: !u.abort
      });
    }
  };
});
function isValidBase64(r) {
  if (r === '') return true;
  if (r.length % 4 !== 0) return false;
  try {
    atob(r);
    return true;
  } catch {
    return false;
  }
}
const Da = $constructor('$ZodBase64', (r, u) => {
  u.pattern ?? (u.pattern = ei);
  oa.init(r, u);
  r._zod.bag.contentEncoding = 'base64';
  r._zod.check = m => {
    if (isValidBase64(m.value)) return;
    m.issues.push({
      code: 'invalid_format',
      format: 'base64',
      input: m.value,
      inst: r,
      continue: !u.abort
    });
  };
});
function isValidBase64URL(r) {
  if (!ti.test(r)) return false;
  const u = r.replace(/[-_]/g, r => (r === '-' ? '+' : '/'));
  const m = u.padEnd(Math.ceil(u.length / 4) * 4, '=');
  return isValidBase64(m);
}
const Ta = $constructor('$ZodBase64URL', (r, u) => {
  u.pattern ?? (u.pattern = ti);
  oa.init(r, u);
  r._zod.bag.contentEncoding = 'base64url';
  r._zod.check = m => {
    if (isValidBase64URL(m.value)) return;
    m.issues.push({
      code: 'invalid_format',
      format: 'base64url',
      input: m.value,
      inst: r,
      continue: !u.abort
    });
  };
});
const Aa = $constructor('$ZodE164', (r, u) => {
  u.pattern ?? (u.pattern = ai);
  oa.init(r, u);
});
function isValidJWT(r, u = null) {
  try {
    const m = r.split('.');
    if (m.length !== 3) return false;
    const [v] = m;
    if (!v) return false;
    const b = JSON.parse(atob(v));
    if ('typ' in b && b?.typ !== 'JWT') return false;
    if (!b.alg) return false;
    if (u && (!('alg' in b) || b.alg !== u)) return false;
    return true;
  } catch {
    return false;
  }
}
const Na = $constructor('$ZodJWT', (r, u) => {
  oa.init(r, u);
  r._zod.check = m => {
    if (isValidJWT(m.value, u.alg)) return;
    m.issues.push({
      code: 'invalid_format',
      format: 'jwt',
      input: m.value,
      inst: r,
      continue: !u.abort
    });
  };
});
const Ra = $constructor('$ZodCustomStringFormat', (r, u) => {
  oa.init(r, u);
  r._zod.check = m => {
    if (u.fn(m.value)) return;
    m.issues.push({
      code: 'invalid_format',
      format: u.format,
      input: m.value,
      inst: r,
      continue: !u.abort
    });
  };
});
const Ca = $constructor('$ZodNumber', (r, u) => {
  aa.init(r, u);
  r._zod.pattern = r._zod.bag.pattern ?? ui;
  r._zod.parse = (m, v) => {
    if (u.coerce)
      try {
        m.value = Number(m.value);
      } catch (r) {}
    const b = m.value;
    if (typeof b === 'number' && !Number.isNaN(b) && Number.isFinite(b)) {
      return m;
    }
    const x =
      typeof b === 'number'
        ? Number.isNaN(b)
          ? 'NaN'
          : !Number.isFinite(b)
            ? 'Infinity'
            : undefined
        : undefined;
    m.issues.push({
      expected: 'number',
      code: 'invalid_type',
      input: b,
      inst: r,
      ...(x ? { received: x } : {})
    });
    return m;
  };
});
const La = $constructor('$ZodNumberFormat', (r, u) => {
  Ci.init(r, u);
  Ca.init(r, u);
});
const Za = $constructor('$ZodBoolean', (r, u) => {
  aa.init(r, u);
  r._zod.pattern = li;
  r._zod.parse = (m, v) => {
    if (u.coerce)
      try {
        m.value = Boolean(m.value);
      } catch (r) {}
    const b = m.value;
    if (typeof b === 'boolean') return m;
    m.issues.push({ expected: 'boolean', code: 'invalid_type', input: b, inst: r });
    return m;
  };
});
const Fa = $constructor('$ZodBigInt', (r, u) => {
  aa.init(r, u);
  r._zod.pattern = si;
  r._zod.parse = (m, v) => {
    if (u.coerce)
      try {
        m.value = BigInt(m.value);
      } catch (r) {}
    if (typeof m.value === 'bigint') return m;
    m.issues.push({ expected: 'bigint', code: 'invalid_type', input: m.value, inst: r });
    return m;
  };
});
const qa = $constructor('$ZodBigIntFormat', (r, u) => {
  Li.init(r, u);
  Fa.init(r, u);
});
const Ba = $constructor('$ZodSymbol', (r, u) => {
  aa.init(r, u);
  r._zod.parse = (u, m) => {
    const v = u.value;
    if (typeof v === 'symbol') return u;
    u.issues.push({ expected: 'symbol', code: 'invalid_type', input: v, inst: r });
    return u;
  };
});
const Va = $constructor('$ZodUndefined', (r, u) => {
  aa.init(r, u);
  r._zod.pattern = di;
  r._zod.values = new Set([undefined]);
  r._zod.optin = 'optional';
  r._zod.optout = 'optional';
  r._zod.parse = (u, m) => {
    const v = u.value;
    if (typeof v === 'undefined') return u;
    u.issues.push({ expected: 'undefined', code: 'invalid_type', input: v, inst: r });
    return u;
  };
});
const Ma = $constructor('$ZodNull', (r, u) => {
  aa.init(r, u);
  r._zod.pattern = pi;
  r._zod.values = new Set([null]);
  r._zod.parse = (u, m) => {
    const v = u.value;
    if (v === null) return u;
    u.issues.push({ expected: 'null', code: 'invalid_type', input: v, inst: r });
    return u;
  };
});
const Ja = $constructor('$ZodAny', (r, u) => {
  aa.init(r, u);
  r._zod.parse = r => r;
});
const Ka = $constructor('$ZodUnknown', (r, u) => {
  aa.init(r, u);
  r._zod.parse = r => r;
});
const Wa = $constructor('$ZodNever', (r, u) => {
  aa.init(r, u);
  r._zod.parse = (u, m) => {
    u.issues.push({ expected: 'never', code: 'invalid_type', input: u.value, inst: r });
    return u;
  };
});
const Ga = $constructor('$ZodVoid', (r, u) => {
  aa.init(r, u);
  r._zod.parse = (u, m) => {
    const v = u.value;
    if (typeof v === 'undefined') return u;
    u.issues.push({ expected: 'void', code: 'invalid_type', input: v, inst: r });
    return u;
  };
});
const Ha = $constructor('$ZodDate', (r, u) => {
  aa.init(r, u);
  r._zod.parse = (m, v) => {
    if (u.coerce) {
      try {
        m.value = new Date(m.value);
      } catch (r) {}
    }
    const b = m.value;
    const x = b instanceof Date;
    const w = x && !Number.isNaN(b.getTime());
    if (w) return m;
    m.issues.push({
      expected: 'date',
      code: 'invalid_type',
      input: b,
      ...(x ? { received: 'Invalid Date' } : {}),
      inst: r
    });
    return m;
  };
});
function handleArrayResult(r, u, m) {
  if (r.issues.length) {
    u.issues.push(...prefixIssues(m, r.issues));
  }
  u.value[m] = r.value;
}
const Xa = $constructor('$ZodArray', (r, u) => {
  aa.init(r, u);
  r._zod.parse = (m, v) => {
    const b = m.value;
    if (!Array.isArray(b)) {
      m.issues.push({ expected: 'array', code: 'invalid_type', input: b, inst: r });
      return m;
    }
    m.value = Array(b.length);
    const x = [];
    for (let r = 0; r < b.length; r++) {
      const w = b[r];
      const $ = u.element._zod.run({ value: w, issues: [] }, v);
      if ($ instanceof Promise) {
        x.push($.then(u => handleArrayResult(u, m, r)));
      } else {
        handleArrayResult($, m, r);
      }
    }
    if (x.length) {
      return Promise.all(x).then(() => m);
    }
    return m;
  };
});
function handlePropertyResult(r, u, m, v, b) {
  if (r.issues.length) {
    if (b && !(m in v)) {
      return;
    }
    u.issues.push(...prefixIssues(m, r.issues));
  }
  if (r.value === undefined) {
    if (m in v) {
      u.value[m] = undefined;
    }
  } else {
    u.value[m] = r.value;
  }
}
function normalizeDef(r) {
  const u = Object.keys(r.shape);
  for (const m of u) {
    if (!r.shape?.[m]?._zod?.traits?.has('$ZodType')) {
      throw new Error(`Invalid element at key "${m}": expected a Zod schema`);
    }
  }
  const m = optionalKeys(r.shape);
  return { ...r, keys: u, keySet: new Set(u), numKeys: u.length, optionalKeys: new Set(m) };
}
function handleCatchall(r, u, m, v, b, x) {
  const w = [];
  const $ = b.keySet;
  const k = b.catchall._zod;
  const S = k.def.type;
  const I = k.optout === 'optional';
  for (const b in u) {
    if ($.has(b)) continue;
    if (S === 'never') {
      w.push(b);
      continue;
    }
    const x = k.run({ value: u[b], issues: [] }, v);
    if (x instanceof Promise) {
      r.push(x.then(r => handlePropertyResult(r, m, b, u, I)));
    } else {
      handlePropertyResult(x, m, b, u, I);
    }
  }
  if (w.length) {
    m.issues.push({ code: 'unrecognized_keys', keys: w, input: u, inst: x });
  }
  if (!r.length) return m;
  return Promise.all(r).then(() => m);
}
const Ya = $constructor('$ZodObject', (r, u) => {
  aa.init(r, u);
  const m = Object.getOwnPropertyDescriptor(u, 'shape');
  if (!m?.get) {
    const r = u.shape;
    Object.defineProperty(u, 'shape', {
      get: () => {
        const m = { ...r };
        Object.defineProperty(u, 'shape', { value: m });
        return m;
      }
    });
  }
  const v = cached(() => normalizeDef(u));
  defineLazy(r._zod, 'propValues', () => {
    const r = u.shape;
    const m = {};
    for (const u in r) {
      const v = r[u]._zod;
      if (v.values) {
        m[u] ?? (m[u] = new Set());
        for (const r of v.values) m[u].add(r);
      }
    }
    return m;
  });
  const b = util_isObject;
  const x = u.catchall;
  let w;
  r._zod.parse = (u, m) => {
    w ?? (w = v.value);
    const $ = u.value;
    if (!b($)) {
      u.issues.push({ expected: 'object', code: 'invalid_type', input: $, inst: r });
      return u;
    }
    u.value = {};
    const k = [];
    const S = w.shape;
    for (const r of w.keys) {
      const v = S[r];
      const b = v._zod.optout === 'optional';
      const x = v._zod.run({ value: $[r], issues: [] }, m);
      if (x instanceof Promise) {
        k.push(x.then(m => handlePropertyResult(m, u, r, $, b)));
      } else {
        handlePropertyResult(x, u, r, $, b);
      }
    }
    if (!x) {
      return k.length ? Promise.all(k).then(() => u) : u;
    }
    return handleCatchall(k, $, u, m, v.value, r);
  };
});
const Qa = $constructor('$ZodObjectJIT', (r, u) => {
  Ya.init(r, u);
  const m = r._zod.parse;
  const v = cached(() => normalizeDef(u));
  const generateFastpass = r => {
    const u = new Doc(['shape', 'payload', 'ctx']);
    const m = v.value;
    const parseStr = r => {
      const u = esc(r);
      return `shape[${u}]._zod.run({ value: input[${u}], issues: [] }, ctx)`;
    };
    u.write(`const input = payload.value;`);
    const b = Object.create(null);
    let x = 0;
    for (const r of m.keys) {
      b[r] = `key_${x++}`;
    }
    u.write(`const newResult = {};`);
    for (const v of m.keys) {
      const m = b[v];
      const x = esc(v);
      const w = r[v];
      const $ = w?._zod?.optout === 'optional';
      u.write(`const ${m} = ${parseStr(v)};`);
      if ($) {
        u.write(
          `\n        if (${m}.issues.length) {\n          if (${x} in input) {\n            payload.issues = payload.issues.concat(${m}.issues.map(iss => ({\n              ...iss,\n              path: iss.path ? [${x}, ...iss.path] : [${x}]\n            })));\n          }\n        }\n        \n        if (${m}.value === undefined) {\n          if (${x} in input) {\n            newResult[${x}] = undefined;\n          }\n        } else {\n          newResult[${x}] = ${m}.value;\n        }\n        \n      `
        );
      } else {
        u.write(
          `\n        if (${m}.issues.length) {\n          payload.issues = payload.issues.concat(${m}.issues.map(iss => ({\n            ...iss,\n            path: iss.path ? [${x}, ...iss.path] : [${x}]\n          })));\n        }\n        \n        if (${m}.value === undefined) {\n          if (${x} in input) {\n            newResult[${x}] = undefined;\n          }\n        } else {\n          newResult[${x}] = ${m}.value;\n        }\n        \n      `
        );
      }
    }
    u.write(`payload.value = newResult;`);
    u.write(`return payload;`);
    const w = u.compile();
    return (u, m) => w(r, u, m);
  };
  let b;
  const x = util_isObject;
  const w = !un.jitless;
  const $ = dn;
  const k = w && $.value;
  const S = u.catchall;
  let I;
  r._zod.parse = ($, z) => {
    I ?? (I = v.value);
    const j = $.value;
    if (!x(j)) {
      $.issues.push({ expected: 'object', code: 'invalid_type', input: j, inst: r });
      return $;
    }
    if (w && k && z?.async === false && z.jitless !== true) {
      if (!b) b = generateFastpass(u.shape);
      $ = b($, z);
      if (!S) return $;
      return handleCatchall([], j, $, z, I, r);
    }
    return m($, z);
  };
});
function handleUnionResults(r, u, m, v) {
  for (const m of r) {
    if (m.issues.length === 0) {
      u.value = m.value;
      return u;
    }
  }
  const b = r.filter(r => !aborted(r));
  if (b.length === 1) {
    u.value = b[0].value;
    return b[0];
  }
  u.issues.push({
    code: 'invalid_union',
    input: u.value,
    inst: m,
    errors: r.map(r => r.issues.map(r => finalizeIssue(r, v, config())))
  });
  return u;
}
const er = $constructor('$ZodUnion', (r, u) => {
  aa.init(r, u);
  defineLazy(r._zod, 'optin', () =>
    u.options.some(r => r._zod.optin === 'optional') ? 'optional' : undefined
  );
  defineLazy(r._zod, 'optout', () =>
    u.options.some(r => r._zod.optout === 'optional') ? 'optional' : undefined
  );
  defineLazy(r._zod, 'values', () => {
    if (u.options.every(r => r._zod.values)) {
      return new Set(u.options.flatMap(r => Array.from(r._zod.values)));
    }
    return undefined;
  });
  defineLazy(r._zod, 'pattern', () => {
    if (u.options.every(r => r._zod.pattern)) {
      const r = u.options.map(r => r._zod.pattern);
      return new RegExp(`^(${r.map(r => cleanRegex(r.source)).join('|')})$`);
    }
    return undefined;
  });
  const m = u.options.length === 1;
  const v = u.options[0]._zod.run;
  r._zod.parse = (b, x) => {
    if (m) {
      return v(b, x);
    }
    let w = false;
    const $ = [];
    for (const r of u.options) {
      const u = r._zod.run({ value: b.value, issues: [] }, x);
      if (u instanceof Promise) {
        $.push(u);
        w = true;
      } else {
        if (u.issues.length === 0) return u;
        $.push(u);
      }
    }
    if (!w) return handleUnionResults($, b, r, x);
    return Promise.all($).then(u => handleUnionResults(u, b, r, x));
  };
});
function handleExclusiveUnionResults(r, u, m, v) {
  const b = r.filter(r => r.issues.length === 0);
  if (b.length === 1) {
    u.value = b[0].value;
    return u;
  }
  if (b.length === 0) {
    u.issues.push({
      code: 'invalid_union',
      input: u.value,
      inst: m,
      errors: r.map(r => r.issues.map(r => finalizeIssue(r, v, config())))
    });
  } else {
    u.issues.push({
      code: 'invalid_union',
      input: u.value,
      inst: m,
      errors: [],
      inclusive: false
    });
  }
  return u;
}
const nr = $constructor('$ZodXor', (r, u) => {
  er.init(r, u);
  u.inclusive = false;
  const m = u.options.length === 1;
  const v = u.options[0]._zod.run;
  r._zod.parse = (b, x) => {
    if (m) {
      return v(b, x);
    }
    let w = false;
    const $ = [];
    for (const r of u.options) {
      const u = r._zod.run({ value: b.value, issues: [] }, x);
      if (u instanceof Promise) {
        $.push(u);
        w = true;
      } else {
        $.push(u);
      }
    }
    if (!w) return handleExclusiveUnionResults($, b, r, x);
    return Promise.all($).then(u => handleExclusiveUnionResults(u, b, r, x));
  };
});
const ir = $constructor('$ZodDiscriminatedUnion', (r, u) => {
  u.inclusive = false;
  er.init(r, u);
  const m = r._zod.parse;
  defineLazy(r._zod, 'propValues', () => {
    const r = {};
    for (const m of u.options) {
      const v = m._zod.propValues;
      if (!v || Object.keys(v).length === 0)
        throw new Error(
          `Invalid discriminated union option at index "${u.options.indexOf(m)}"`
        );
      for (const [u, m] of Object.entries(v)) {
        if (!r[u]) r[u] = new Set();
        for (const v of m) {
          r[u].add(v);
        }
      }
    }
    return r;
  });
  const v = cached(() => {
    const r = u.options;
    const m = new Map();
    for (const v of r) {
      const r = v._zod.propValues?.[u.discriminator];
      if (!r || r.size === 0)
        throw new Error(
          `Invalid discriminated union option at index "${u.options.indexOf(v)}"`
        );
      for (const u of r) {
        if (m.has(u)) {
          throw new Error(`Duplicate discriminator value "${String(u)}"`);
        }
        m.set(u, v);
      }
    }
    return m;
  });
  r._zod.parse = (b, x) => {
    const w = b.value;
    if (!util_isObject(w)) {
      b.issues.push({ code: 'invalid_type', expected: 'object', input: w, inst: r });
      return b;
    }
    const $ = v.value.get(w?.[u.discriminator]);
    if ($) {
      return $._zod.run(b, x);
    }
    if (u.unionFallback) {
      return m(b, x);
    }
    b.issues.push({
      code: 'invalid_union',
      errors: [],
      note: 'No matching discriminator',
      discriminator: u.discriminator,
      input: w,
      path: [u.discriminator],
      inst: r
    });
    return b;
  };
});
const rr = $constructor('$ZodIntersection', (r, u) => {
  aa.init(r, u);
  r._zod.parse = (r, m) => {
    const v = r.value;
    const b = u.left._zod.run({ value: v, issues: [] }, m);
    const x = u.right._zod.run({ value: v, issues: [] }, m);
    const w = b instanceof Promise || x instanceof Promise;
    if (w) {
      return Promise.all([b, x]).then(([u, m]) => handleIntersectionResults(r, u, m));
    }
    return handleIntersectionResults(r, b, x);
  };
});
function mergeValues(r, u) {
  if (r === u) {
    return { valid: true, data: r };
  }
  if (r instanceof Date && u instanceof Date && +r === +u) {
    return { valid: true, data: r };
  }
  if (util_isPlainObject(r) && util_isPlainObject(u)) {
    const m = Object.keys(u);
    const v = Object.keys(r).filter(r => m.indexOf(r) !== -1);
    const b = { ...r, ...u };
    for (const m of v) {
      const v = mergeValues(r[m], u[m]);
      if (!v.valid) {
        return { valid: false, mergeErrorPath: [m, ...v.mergeErrorPath] };
      }
      b[m] = v.data;
    }
    return { valid: true, data: b };
  }
  if (Array.isArray(r) && Array.isArray(u)) {
    if (r.length !== u.length) {
      return { valid: false, mergeErrorPath: [] };
    }
    const m = [];
    for (let v = 0; v < r.length; v++) {
      const b = r[v];
      const x = u[v];
      const w = mergeValues(b, x);
      if (!w.valid) {
        return { valid: false, mergeErrorPath: [v, ...w.mergeErrorPath] };
      }
      m.push(w.data);
    }
    return { valid: true, data: m };
  }
  return { valid: false, mergeErrorPath: [] };
}
function handleIntersectionResults(r, u, m) {
  const v = new Map();
  let b;
  for (const m of u.issues) {
    if (m.code === 'unrecognized_keys') {
      b ?? (b = m);
      for (const r of m.keys) {
        if (!v.has(r)) v.set(r, {});
        v.get(r).l = true;
      }
    } else {
      r.issues.push(m);
    }
  }
  for (const u of m.issues) {
    if (u.code === 'unrecognized_keys') {
      for (const r of u.keys) {
        if (!v.has(r)) v.set(r, {});
        v.get(r).r = true;
      }
    } else {
      r.issues.push(u);
    }
  }
  const x = [...v].filter(([, r]) => r.l && r.r).map(([r]) => r);
  if (x.length && b) {
    r.issues.push({ ...b, keys: x });
  }
  if (aborted(r)) return r;
  const w = mergeValues(u.value, m.value);
  if (!w.valid) {
    throw new Error(
      `Unmergable intersection. Error path: ` + `${JSON.stringify(w.mergeErrorPath)}`
    );
  }
  r.value = w.data;
  return r;
}
const or = $constructor('$ZodTuple', (r, u) => {
  aa.init(r, u);
  const m = u.items;
  r._zod.parse = (v, b) => {
    const x = v.value;
    if (!Array.isArray(x)) {
      v.issues.push({ input: x, inst: r, expected: 'tuple', code: 'invalid_type' });
      return v;
    }
    v.value = [];
    const w = [];
    const $ = [...m].reverse().findIndex(r => r._zod.optin !== 'optional');
    const k = $ === -1 ? 0 : m.length - $;
    if (!u.rest) {
      const u = x.length > m.length;
      const b = x.length < k - 1;
      if (u || b) {
        v.issues.push({
          ...(u
            ? { code: 'too_big', maximum: m.length, inclusive: true }
            : { code: 'too_small', minimum: m.length }),
          input: x,
          inst: r,
          origin: 'array'
        });
        return v;
      }
    }
    let S = -1;
    for (const r of m) {
      S++;
      if (S >= x.length) if (S >= k) continue;
      const u = r._zod.run({ value: x[S], issues: [] }, b);
      if (u instanceof Promise) {
        w.push(u.then(r => handleTupleResult(r, v, S)));
      } else {
        handleTupleResult(u, v, S);
      }
    }
    if (u.rest) {
      const r = x.slice(m.length);
      for (const m of r) {
        S++;
        const r = u.rest._zod.run({ value: m, issues: [] }, b);
        if (r instanceof Promise) {
          w.push(r.then(r => handleTupleResult(r, v, S)));
        } else {
          handleTupleResult(r, v, S);
        }
      }
    }
    if (w.length) return Promise.all(w).then(() => v);
    return v;
  };
});
function handleTupleResult(r, u, m) {
  if (r.issues.length) {
    u.issues.push(...prefixIssues(m, r.issues));
  }
  u.value[m] = r.value;
}
const sr = $constructor('$ZodRecord', (r, u) => {
  aa.init(r, u);
  r._zod.parse = (m, v) => {
    const b = m.value;
    if (!util_isPlainObject(b)) {
      m.issues.push({ expected: 'record', code: 'invalid_type', input: b, inst: r });
      return m;
    }
    const x = [];
    const w = u.keyType._zod.values;
    if (w) {
      m.value = {};
      const $ = new Set();
      for (const r of w) {
        if (typeof r === 'string' || typeof r === 'number' || typeof r === 'symbol') {
          $.add(typeof r === 'number' ? r.toString() : r);
          const w = u.valueType._zod.run({ value: b[r], issues: [] }, v);
          if (w instanceof Promise) {
            x.push(
              w.then(u => {
                if (u.issues.length) {
                  m.issues.push(...prefixIssues(r, u.issues));
                }
                m.value[r] = u.value;
              })
            );
          } else {
            if (w.issues.length) {
              m.issues.push(...prefixIssues(r, w.issues));
            }
            m.value[r] = w.value;
          }
        }
      }
      let k;
      for (const r in b) {
        if (!$.has(r)) {
          k = k ?? [];
          k.push(r);
        }
      }
      if (k && k.length > 0) {
        m.issues.push({ code: 'unrecognized_keys', input: b, inst: r, keys: k });
      }
    } else {
      m.value = {};
      for (const w of Reflect.ownKeys(b)) {
        if (w === '__proto__') continue;
        let $ = u.keyType._zod.run({ value: w, issues: [] }, v);
        if ($ instanceof Promise) {
          throw new Error('Async schemas not supported in object keys currently');
        }
        const k = typeof w === 'string' && ui.test(w) && $.issues.length;
        if (k) {
          const r = u.keyType._zod.run({ value: Number(w), issues: [] }, v);
          if (r instanceof Promise) {
            throw new Error('Async schemas not supported in object keys currently');
          }
          if (r.issues.length === 0) {
            $ = r;
          }
        }
        if ($.issues.length) {
          if (u.mode === 'loose') {
            m.value[w] = b[w];
          } else {
            m.issues.push({
              code: 'invalid_key',
              origin: 'record',
              issues: $.issues.map(r => finalizeIssue(r, v, config())),
              input: w,
              path: [w],
              inst: r
            });
          }
          continue;
        }
        const S = u.valueType._zod.run({ value: b[w], issues: [] }, v);
        if (S instanceof Promise) {
          x.push(
            S.then(r => {
              if (r.issues.length) {
                m.issues.push(...prefixIssues(w, r.issues));
              }
              m.value[$.value] = r.value;
            })
          );
        } else {
          if (S.issues.length) {
            m.issues.push(...prefixIssues(w, S.issues));
          }
          m.value[$.value] = S.value;
        }
      }
    }
    if (x.length) {
      return Promise.all(x).then(() => m);
    }
    return m;
  };
});
const cr = $constructor('$ZodMap', (r, u) => {
  aa.init(r, u);
  r._zod.parse = (m, v) => {
    const b = m.value;
    if (!(b instanceof Map)) {
      m.issues.push({ expected: 'map', code: 'invalid_type', input: b, inst: r });
      return m;
    }
    const x = [];
    m.value = new Map();
    for (const [w, $] of b) {
      const k = u.keyType._zod.run({ value: w, issues: [] }, v);
      const S = u.valueType._zod.run({ value: $, issues: [] }, v);
      if (k instanceof Promise || S instanceof Promise) {
        x.push(
          Promise.all([k, S]).then(([u, x]) => {
            handleMapResult(u, x, m, w, b, r, v);
          })
        );
      } else {
        handleMapResult(k, S, m, w, b, r, v);
      }
    }
    if (x.length) return Promise.all(x).then(() => m);
    return m;
  };
});
function handleMapResult(r, u, m, v, b, x, w) {
  if (r.issues.length) {
    if (mn.has(typeof v)) {
      m.issues.push(...prefixIssues(v, r.issues));
    } else {
      m.issues.push({
        code: 'invalid_key',
        origin: 'map',
        input: b,
        inst: x,
        issues: r.issues.map(r => finalizeIssue(r, w, config()))
      });
    }
  }
  if (u.issues.length) {
    if (mn.has(typeof v)) {
      m.issues.push(...prefixIssues(v, u.issues));
    } else {
      m.issues.push({
        origin: 'map',
        code: 'invalid_element',
        input: b,
        inst: x,
        key: v,
        issues: u.issues.map(r => finalizeIssue(r, w, config()))
      });
    }
  }
  m.value.set(r.value, u.value);
}
const lr = $constructor('$ZodSet', (r, u) => {
  aa.init(r, u);
  r._zod.parse = (m, v) => {
    const b = m.value;
    if (!(b instanceof Set)) {
      m.issues.push({ input: b, inst: r, expected: 'set', code: 'invalid_type' });
      return m;
    }
    const x = [];
    m.value = new Set();
    for (const r of b) {
      const b = u.valueType._zod.run({ value: r, issues: [] }, v);
      if (b instanceof Promise) {
        x.push(b.then(r => handleSetResult(r, m)));
      } else handleSetResult(b, m);
    }
    if (x.length) return Promise.all(x).then(() => m);
    return m;
  };
});
function handleSetResult(r, u) {
  if (r.issues.length) {
    u.issues.push(...r.issues);
  }
  u.value.add(r.value);
}
const pr = $constructor('$ZodEnum', (r, u) => {
  aa.init(r, u);
  const m = getEnumValues(u.entries);
  const v = new Set(m);
  r._zod.values = v;
  r._zod.pattern = new RegExp(
    `^(${m
      .filter(r => mn.has(typeof r))
      .map(r => (typeof r === 'string' ? escapeRegex(r) : r.toString()))
      .join('|')})$`
  );
  r._zod.parse = (u, b) => {
    const x = u.value;
    if (v.has(x)) {
      return u;
    }
    u.issues.push({ code: 'invalid_value', values: m, input: x, inst: r });
    return u;
  };
});
const dr = $constructor('$ZodLiteral', (r, u) => {
  aa.init(r, u);
  if (u.values.length === 0) {
    throw new Error('Cannot create literal schema with no valid values');
  }
  const m = new Set(u.values);
  r._zod.values = m;
  r._zod.pattern = new RegExp(
    `^(${u.values.map(r => (typeof r === 'string' ? escapeRegex(r) : r ? escapeRegex(r.toString()) : String(r))).join('|')})$`
  );
  r._zod.parse = (v, b) => {
    const x = v.value;
    if (m.has(x)) {
      return v;
    }
    v.issues.push({ code: 'invalid_value', values: u.values, input: x, inst: r });
    return v;
  };
});
const mr = $constructor('$ZodFile', (r, u) => {
  aa.init(r, u);
  r._zod.parse = (u, m) => {
    const v = u.value;
    if (v instanceof File) return u;
    u.issues.push({ expected: 'file', code: 'invalid_type', input: v, inst: r });
    return u;
  };
});
const hr = $constructor('$ZodTransform', (r, u) => {
  aa.init(r, u);
  r._zod.parse = (m, v) => {
    if (v.direction === 'backward') {
      throw new $ZodEncodeError(r.constructor.name);
    }
    const b = u.transform(m.value, m);
    if (v.async) {
      const r = b instanceof Promise ? b : Promise.resolve(b);
      return r.then(r => {
        m.value = r;
        return m;
      });
    }
    if (b instanceof Promise) {
      throw new $ZodAsyncError();
    }
    m.value = b;
    return m;
  };
});
function handleOptionalResult(r, u) {
  if (r.issues.length && u === undefined) {
    return { issues: [], value: undefined };
  }
  return r;
}
const gr = $constructor('$ZodOptional', (r, u) => {
  aa.init(r, u);
  r._zod.optin = 'optional';
  r._zod.optout = 'optional';
  defineLazy(r._zod, 'values', () =>
    u.innerType._zod.values ? new Set([...u.innerType._zod.values, undefined]) : undefined
  );
  defineLazy(r._zod, 'pattern', () => {
    const r = u.innerType._zod.pattern;
    return r ? new RegExp(`^(${cleanRegex(r.source)})?$`) : undefined;
  });
  r._zod.parse = (r, m) => {
    if (u.innerType._zod.optin === 'optional') {
      const v = u.innerType._zod.run(r, m);
      if (v instanceof Promise) return v.then(u => handleOptionalResult(u, r.value));
      return handleOptionalResult(v, r.value);
    }
    if (r.value === undefined) {
      return r;
    }
    return u.innerType._zod.run(r, m);
  };
});
const vr = $constructor('$ZodExactOptional', (r, u) => {
  gr.init(r, u);
  defineLazy(r._zod, 'values', () => u.innerType._zod.values);
  defineLazy(r._zod, 'pattern', () => u.innerType._zod.pattern);
  r._zod.parse = (r, m) => u.innerType._zod.run(r, m);
});
const br = $constructor('$ZodNullable', (r, u) => {
  aa.init(r, u);
  defineLazy(r._zod, 'optin', () => u.innerType._zod.optin);
  defineLazy(r._zod, 'optout', () => u.innerType._zod.optout);
  defineLazy(r._zod, 'pattern', () => {
    const r = u.innerType._zod.pattern;
    return r ? new RegExp(`^(${cleanRegex(r.source)}|null)$`) : undefined;
  });
  defineLazy(r._zod, 'values', () =>
    u.innerType._zod.values ? new Set([...u.innerType._zod.values, null]) : undefined
  );
  r._zod.parse = (r, m) => {
    if (r.value === null) return r;
    return u.innerType._zod.run(r, m);
  };
});
const yr = $constructor('$ZodDefault', (r, u) => {
  aa.init(r, u);
  r._zod.optin = 'optional';
  defineLazy(r._zod, 'values', () => u.innerType._zod.values);
  r._zod.parse = (r, m) => {
    if (m.direction === 'backward') {
      return u.innerType._zod.run(r, m);
    }
    if (r.value === undefined) {
      r.value = u.defaultValue;
      return r;
    }
    const v = u.innerType._zod.run(r, m);
    if (v instanceof Promise) {
      return v.then(r => handleDefaultResult(r, u));
    }
    return handleDefaultResult(v, u);
  };
});
function handleDefaultResult(r, u) {
  if (r.value === undefined) {
    r.value = u.defaultValue;
  }
  return r;
}
const xr = $constructor('$ZodPrefault', (r, u) => {
  aa.init(r, u);
  r._zod.optin = 'optional';
  defineLazy(r._zod, 'values', () => u.innerType._zod.values);
  r._zod.parse = (r, m) => {
    if (m.direction === 'backward') {
      return u.innerType._zod.run(r, m);
    }
    if (r.value === undefined) {
      r.value = u.defaultValue;
    }
    return u.innerType._zod.run(r, m);
  };
});
const _r = $constructor('$ZodNonOptional', (r, u) => {
  aa.init(r, u);
  defineLazy(r._zod, 'values', () => {
    const r = u.innerType._zod.values;
    return r ? new Set([...r].filter(r => r !== undefined)) : undefined;
  });
  r._zod.parse = (m, v) => {
    const b = u.innerType._zod.run(m, v);
    if (b instanceof Promise) {
      return b.then(u => handleNonOptionalResult(u, r));
    }
    return handleNonOptionalResult(b, r);
  };
});
function handleNonOptionalResult(r, u) {
  if (!r.issues.length && r.value === undefined) {
    r.issues.push({ code: 'invalid_type', expected: 'nonoptional', input: r.value, inst: u });
  }
  return r;
}
const wr = $constructor('$ZodSuccess', (r, u) => {
  aa.init(r, u);
  r._zod.parse = (r, m) => {
    if (m.direction === 'backward') {
      throw new $ZodEncodeError('ZodSuccess');
    }
    const v = u.innerType._zod.run(r, m);
    if (v instanceof Promise) {
      return v.then(u => {
        r.value = u.issues.length === 0;
        return r;
      });
    }
    r.value = v.issues.length === 0;
    return r;
  };
});
const $r = $constructor('$ZodCatch', (r, u) => {
  aa.init(r, u);
  defineLazy(r._zod, 'optin', () => u.innerType._zod.optin);
  defineLazy(r._zod, 'optout', () => u.innerType._zod.optout);
  defineLazy(r._zod, 'values', () => u.innerType._zod.values);
  r._zod.parse = (r, m) => {
    if (m.direction === 'backward') {
      return u.innerType._zod.run(r, m);
    }
    const v = u.innerType._zod.run(r, m);
    if (v instanceof Promise) {
      return v.then(v => {
        r.value = v.value;
        if (v.issues.length) {
          r.value = u.catchValue({
            ...r,
            error: { issues: v.issues.map(r => finalizeIssue(r, m, config())) },
            input: r.value
          });
          r.issues = [];
        }
        return r;
      });
    }
    r.value = v.value;
    if (v.issues.length) {
      r.value = u.catchValue({
        ...r,
        error: { issues: v.issues.map(r => finalizeIssue(r, m, config())) },
        input: r.value
      });
      r.issues = [];
    }
    return r;
  };
});
const kr = $constructor('$ZodNaN', (r, u) => {
  aa.init(r, u);
  r._zod.parse = (u, m) => {
    if (typeof u.value !== 'number' || !Number.isNaN(u.value)) {
      u.issues.push({ input: u.value, inst: r, expected: 'nan', code: 'invalid_type' });
      return u;
    }
    return u;
  };
});
const Sr = $constructor('$ZodPipe', (r, u) => {
  aa.init(r, u);
  defineLazy(r._zod, 'values', () => u.in._zod.values);
  defineLazy(r._zod, 'optin', () => u.in._zod.optin);
  defineLazy(r._zod, 'optout', () => u.out._zod.optout);
  defineLazy(r._zod, 'propValues', () => u.in._zod.propValues);
  r._zod.parse = (r, m) => {
    if (m.direction === 'backward') {
      const v = u.out._zod.run(r, m);
      if (v instanceof Promise) {
        return v.then(r => handlePipeResult(r, u.in, m));
      }
      return handlePipeResult(v, u.in, m);
    }
    const v = u.in._zod.run(r, m);
    if (v instanceof Promise) {
      return v.then(r => handlePipeResult(r, u.out, m));
    }
    return handlePipeResult(v, u.out, m);
  };
});
function handlePipeResult(r, u, m) {
  if (r.issues.length) {
    r.aborted = true;
    return r;
  }
  return u._zod.run({ value: r.value, issues: r.issues }, m);
}
const Ir = $constructor('$ZodCodec', (r, u) => {
  aa.init(r, u);
  defineLazy(r._zod, 'values', () => u.in._zod.values);
  defineLazy(r._zod, 'optin', () => u.in._zod.optin);
  defineLazy(r._zod, 'optout', () => u.out._zod.optout);
  defineLazy(r._zod, 'propValues', () => u.in._zod.propValues);
  r._zod.parse = (r, m) => {
    const v = m.direction || 'forward';
    if (v === 'forward') {
      const v = u.in._zod.run(r, m);
      if (v instanceof Promise) {
        return v.then(r => handleCodecAResult(r, u, m));
      }
      return handleCodecAResult(v, u, m);
    } else {
      const v = u.out._zod.run(r, m);
      if (v instanceof Promise) {
        return v.then(r => handleCodecAResult(r, u, m));
      }
      return handleCodecAResult(v, u, m);
    }
  };
});
function handleCodecAResult(r, u, m) {
  if (r.issues.length) {
    r.aborted = true;
    return r;
  }
  const v = m.direction || 'forward';
  if (v === 'forward') {
    const v = u.transform(r.value, r);
    if (v instanceof Promise) {
      return v.then(v => handleCodecTxResult(r, v, u.out, m));
    }
    return handleCodecTxResult(r, v, u.out, m);
  } else {
    const v = u.reverseTransform(r.value, r);
    if (v instanceof Promise) {
      return v.then(v => handleCodecTxResult(r, v, u.in, m));
    }
    return handleCodecTxResult(r, v, u.in, m);
  }
}
function handleCodecTxResult(r, u, m, v) {
  if (r.issues.length) {
    r.aborted = true;
    return r;
  }
  return m._zod.run({ value: u, issues: r.issues }, v);
}
const zr = $constructor('$ZodReadonly', (r, u) => {
  aa.init(r, u);
  defineLazy(r._zod, 'propValues', () => u.innerType._zod.propValues);
  defineLazy(r._zod, 'values', () => u.innerType._zod.values);
  defineLazy(r._zod, 'optin', () => u.innerType?._zod?.optin);
  defineLazy(r._zod, 'optout', () => u.innerType?._zod?.optout);
  r._zod.parse = (r, m) => {
    if (m.direction === 'backward') {
      return u.innerType._zod.run(r, m);
    }
    const v = u.innerType._zod.run(r, m);
    if (v instanceof Promise) {
      return v.then(handleReadonlyResult);
    }
    return handleReadonlyResult(v);
  };
});
function handleReadonlyResult(r) {
  r.value = Object.freeze(r.value);
  return r;
}
const jr = $constructor('$ZodTemplateLiteral', (r, u) => {
  aa.init(r, u);
  const m = [];
  for (const r of u.parts) {
    if (typeof r === 'object' && r !== null) {
      if (!r._zod.pattern) {
        throw new Error(
          `Invalid template literal part, no pattern found: ${[...r._zod.traits].shift()}`
        );
      }
      const u = r._zod.pattern instanceof RegExp ? r._zod.pattern.source : r._zod.pattern;
      if (!u) throw new Error(`Invalid template literal part: ${r._zod.traits}`);
      const v = u.startsWith('^') ? 1 : 0;
      const b = u.endsWith('$') ? u.length - 1 : u.length;
      m.push(u.slice(v, b));
    } else if (r === null || fn.has(typeof r)) {
      m.push(escapeRegex(`${r}`));
    } else {
      throw new Error(`Invalid template literal part: ${r}`);
    }
  }
  r._zod.pattern = new RegExp(`^${m.join('')}$`);
  r._zod.parse = (m, v) => {
    if (typeof m.value !== 'string') {
      m.issues.push({ input: m.value, inst: r, expected: 'string', code: 'invalid_type' });
      return m;
    }
    r._zod.pattern.lastIndex = 0;
    if (!r._zod.pattern.test(m.value)) {
      m.issues.push({
        input: m.value,
        inst: r,
        code: 'invalid_format',
        format: u.format ?? 'template_literal',
        pattern: r._zod.pattern.source
      });
      return m;
    }
    return m;
  };
});
const Or = $constructor('$ZodFunction', (r, u) => {
  aa.init(r, u);
  r._def = u;
  r._zod.def = u;
  r.implement = u => {
    if (typeof u !== 'function') {
      throw new Error('implement() must be called with a function');
    }
    return function (...m) {
      const v = r._def.input ? yn(r._def.input, m) : m;
      const b = Reflect.apply(u, this, v);
      if (r._def.output) {
        return yn(r._def.output, b);
      }
      return b;
    };
  };
  r.implementAsync = u => {
    if (typeof u !== 'function') {
      throw new Error('implementAsync() must be called with a function');
    }
    return async function (...m) {
      const v = r._def.input ? await xn(r._def.input, m) : m;
      const b = await Reflect.apply(u, this, v);
      if (r._def.output) {
        return await xn(r._def.output, b);
      }
      return b;
    };
  };
  r._zod.parse = (u, m) => {
    if (typeof u.value !== 'function') {
      u.issues.push({ code: 'invalid_type', expected: 'function', input: u.value, inst: r });
      return u;
    }
    const v = r._def.output && r._def.output._zod.def.type === 'promise';
    if (v) {
      u.value = r.implementAsync(u.value);
    } else {
      u.value = r.implement(u.value);
    }
    return u;
  };
  r.input = (...u) => {
    const m = r.constructor;
    if (Array.isArray(u[0])) {
      return new m({
        type: 'function',
        input: new or({ type: 'tuple', items: u[0], rest: u[1] }),
        output: r._def.output
      });
    }
    return new m({ type: 'function', input: u[0], output: r._def.output });
  };
  r.output = u => {
    const m = r.constructor;
    return new m({ type: 'function', input: r._def.input, output: u });
  };
  return r;
});
const Pr = $constructor('$ZodPromise', (r, u) => {
  aa.init(r, u);
  r._zod.parse = (r, m) =>
    Promise.resolve(r.value).then(r => u.innerType._zod.run({ value: r, issues: [] }, m));
});
const Ur = $constructor('$ZodLazy', (r, u) => {
  aa.init(r, u);
  defineLazy(r._zod, 'innerType', () => u.getter());
  defineLazy(r._zod, 'pattern', () => r._zod.innerType?._zod?.pattern);
  defineLazy(r._zod, 'propValues', () => r._zod.innerType?._zod?.propValues);
  defineLazy(r._zod, 'optin', () => r._zod.innerType?._zod?.optin ?? undefined);
  defineLazy(r._zod, 'optout', () => r._zod.innerType?._zod?.optout ?? undefined);
  r._zod.parse = (u, m) => {
    const v = r._zod.innerType;
    return v._zod.run(u, m);
  };
});
const Er = $constructor('$ZodCustom', (r, u) => {
  Di.init(r, u);
  aa.init(r, u);
  r._zod.parse = (r, u) => r;
  r._zod.check = m => {
    const v = m.value;
    const b = u.fn(v);
    if (b instanceof Promise) {
      return b.then(u => handleRefineResult(u, m, v, r));
    }
    handleRefineResult(b, m, v, r);
    return;
  };
});
function handleRefineResult(r, u, m, v) {
  if (!r) {
    const r = {
      code: 'custom',
      input: m,
      inst: v,
      path: [...(v._zod.def.path ?? [])],
      continue: !v._zod.def.abort
    };
    if (v._zod.def.params) r.params = v._zod.def.params;
    u.issues.push(util_issue(r));
  }
}
const error = () => {
  const r = {
    string: { unit: 'حرف', verb: 'أن يحوي' },
    file: { unit: 'بايت', verb: 'أن يحوي' },
    array: { unit: 'عنصر', verb: 'أن يحوي' },
    set: { unit: 'عنصر', verb: 'أن يحوي' }
  };
  function getSizing(u) {
    return r[u] ?? null;
  }
  const u = {
    regex: 'مدخل',
    email: 'بريد إلكتروني',
    url: 'رابط',
    emoji: 'إيموجي',
    uuid: 'UUID',
    uuidv4: 'UUIDv4',
    uuidv6: 'UUIDv6',
    nanoid: 'nanoid',
    guid: 'GUID',
    cuid: 'cuid',
    cuid2: 'cuid2',
    ulid: 'ULID',
    xid: 'XID',
    ksuid: 'KSUID',
    datetime: 'تاريخ ووقت بمعيار ISO',
    date: 'تاريخ بمعيار ISO',
    time: 'وقت بمعيار ISO',
    duration: 'مدة بمعيار ISO',
    ipv4: 'عنوان IPv4',
    ipv6: 'عنوان IPv6',
    cidrv4: 'مدى عناوين بصيغة IPv4',
    cidrv6: 'مدى عناوين بصيغة IPv6',
    base64: 'نَص بترميز base64-encoded',
    base64url: 'نَص بترميز base64url-encoded',
    json_string: 'نَص على هيئة JSON',
    e164: 'رقم هاتف بمعيار E.164',
    jwt: 'JWT',
    template_literal: 'مدخل'
  };
  const m = { nan: 'NaN' };
  return r => {
    switch (r.code) {
      case 'invalid_type': {
        const u = m[r.expected] ?? r.expected;
        const v = parsedType(r.input);
        const b = m[v] ?? v;
        if (/^[A-Z]/.test(r.expected)) {
          return `مدخلات غير مقبولة: يفترض إدخال instanceof ${r.expected}، ولكن تم إدخال ${b}`;
        }
        return `مدخلات غير مقبولة: يفترض إدخال ${u}، ولكن تم إدخال ${b}`;
      }
      case 'invalid_value':
        if (r.values.length === 1)
          return `مدخلات غير مقبولة: يفترض إدخال ${stringifyPrimitive(r.values[0])}`;
        return `اختيار غير مقبول: يتوقع انتقاء أحد هذه الخيارات: ${joinValues(r.values, '|')}`;
      case 'too_big': {
        const u = r.inclusive ? '<=' : '<';
        const m = getSizing(r.origin);
        if (m)
          return ` أكبر من اللازم: يفترض أن تكون ${r.origin ?? 'القيمة'} ${u} ${r.maximum.toString()} ${m.unit ?? 'عنصر'}`;
        return `أكبر من اللازم: يفترض أن تكون ${r.origin ?? 'القيمة'} ${u} ${r.maximum.toString()}`;
      }
      case 'too_small': {
        const u = r.inclusive ? '>=' : '>';
        const m = getSizing(r.origin);
        if (m) {
          return `أصغر من اللازم: يفترض لـ ${r.origin} أن يكون ${u} ${r.minimum.toString()} ${m.unit}`;
        }
        return `أصغر من اللازم: يفترض لـ ${r.origin} أن يكون ${u} ${r.minimum.toString()}`;
      }
      case 'invalid_format': {
        const m = r;
        if (m.format === 'starts_with') return `نَص غير مقبول: يجب أن يبدأ بـ "${r.prefix}"`;
        if (m.format === 'ends_with') return `نَص غير مقبول: يجب أن ينتهي بـ "${m.suffix}"`;
        if (m.format === 'includes') return `نَص غير مقبول: يجب أن يتضمَّن "${m.includes}"`;
        if (m.format === 'regex') return `نَص غير مقبول: يجب أن يطابق النمط ${m.pattern}`;
        return `${u[m.format] ?? r.format} غير مقبول`;
      }
      case 'not_multiple_of':
        return `رقم غير مقبول: يجب أن يكون من مضاعفات ${r.divisor}`;
      case 'unrecognized_keys':
        return `معرف${r.keys.length > 1 ? 'ات' : ''} غريب${r.keys.length > 1 ? 'ة' : ''}: ${joinValues(r.keys, '، ')}`;
      case 'invalid_key':
        return `معرف غير مقبول في ${r.origin}`;
      case 'invalid_union':
        return 'مدخل غير مقبول';
      case 'invalid_element':
        return `مدخل غير مقبول في ${r.origin}`;
      default:
        return 'مدخل غير مقبول';
    }
  };
};
function ar() {
  return { localeError: error() };
}
const az_error = () => {
  const r = {
    string: { unit: 'simvol', verb: 'olmalıdır' },
    file: { unit: 'bayt', verb: 'olmalıdır' },
    array: { unit: 'element', verb: 'olmalıdır' },
    set: { unit: 'element', verb: 'olmalıdır' }
  };
  function getSizing(u) {
    return r[u] ?? null;
  }
  const u = {
    regex: 'input',
    email: 'email address',
    url: 'URL',
    emoji: 'emoji',
    uuid: 'UUID',
    uuidv4: 'UUIDv4',
    uuidv6: 'UUIDv6',
    nanoid: 'nanoid',
    guid: 'GUID',
    cuid: 'cuid',
    cuid2: 'cuid2',
    ulid: 'ULID',
    xid: 'XID',
    ksuid: 'KSUID',
    datetime: 'ISO datetime',
    date: 'ISO date',
    time: 'ISO time',
    duration: 'ISO duration',
    ipv4: 'IPv4 address',
    ipv6: 'IPv6 address',
    cidrv4: 'IPv4 range',
    cidrv6: 'IPv6 range',
    base64: 'base64-encoded string',
    base64url: 'base64url-encoded string',
    json_string: 'JSON string',
    e164: 'E.164 number',
    jwt: 'JWT',
    template_literal: 'input'
  };
  const m = { nan: 'NaN' };
  return r => {
    switch (r.code) {
      case 'invalid_type': {
        const u = m[r.expected] ?? r.expected;
        const v = parsedType(r.input);
        const b = m[v] ?? v;
        if (/^[A-Z]/.test(r.expected)) {
          return `Yanlış dəyər: gözlənilən instanceof ${r.expected}, daxil olan ${b}`;
        }
        return `Yanlış dəyər: gözlənilən ${u}, daxil olan ${b}`;
      }
      case 'invalid_value':
        if (r.values.length === 1)
          return `Yanlış dəyər: gözlənilən ${stringifyPrimitive(r.values[0])}`;
        return `Yanlış seçim: aşağıdakılardan biri olmalıdır: ${joinValues(r.values, '|')}`;
      case 'too_big': {
        const u = r.inclusive ? '<=' : '<';
        const m = getSizing(r.origin);
        if (m)
          return `Çox böyük: gözlənilən ${r.origin ?? 'dəyər'} ${u}${r.maximum.toString()} ${m.unit ?? 'element'}`;
        return `Çox böyük: gözlənilən ${r.origin ?? 'dəyər'} ${u}${r.maximum.toString()}`;
      }
      case 'too_small': {
        const u = r.inclusive ? '>=' : '>';
        const m = getSizing(r.origin);
        if (m)
          return `Çox kiçik: gözlənilən ${r.origin} ${u}${r.minimum.toString()} ${m.unit}`;
        return `Çox kiçik: gözlənilən ${r.origin} ${u}${r.minimum.toString()}`;
      }
      case 'invalid_format': {
        const m = r;
        if (m.format === 'starts_with') return `Yanlış mətn: "${m.prefix}" ilə başlamalıdır`;
        if (m.format === 'ends_with') return `Yanlış mətn: "${m.suffix}" ilə bitməlidir`;
        if (m.format === 'includes') return `Yanlış mətn: "${m.includes}" daxil olmalıdır`;
        if (m.format === 'regex') return `Yanlış mətn: ${m.pattern} şablonuna uyğun olmalıdır`;
        return `Yanlış ${u[m.format] ?? r.format}`;
      }
      case 'not_multiple_of':
        return `Yanlış ədəd: ${r.divisor} ilə bölünə bilən olmalıdır`;
      case 'unrecognized_keys':
        return `Tanınmayan açar${r.keys.length > 1 ? 'lar' : ''}: ${joinValues(r.keys, ', ')}`;
      case 'invalid_key':
        return `${r.origin} daxilində yanlış açar`;
      case 'invalid_union':
        return 'Yanlış dəyər';
      case 'invalid_element':
        return `${r.origin} daxilində yanlış dəyər`;
      default:
        return `Yanlış dəyər`;
    }
  };
};
function az() {
  return { localeError: az_error() };
}
function getBelarusianPlural(r, u, m, v) {
  const b = Math.abs(r);
  const x = b % 10;
  const w = b % 100;
  if (w >= 11 && w <= 19) {
    return v;
  }
  if (x === 1) {
    return u;
  }
  if (x >= 2 && x <= 4) {
    return m;
  }
  return v;
}
const be_error = () => {
  const r = {
    string: { unit: { one: 'сімвал', few: 'сімвалы', many: 'сімвалаў' }, verb: 'мець' },
    array: { unit: { one: 'элемент', few: 'элементы', many: 'элементаў' }, verb: 'мець' },
    set: { unit: { one: 'элемент', few: 'элементы', many: 'элементаў' }, verb: 'мець' },
    file: { unit: { one: 'байт', few: 'байты', many: 'байтаў' }, verb: 'мець' }
  };
  function getSizing(u) {
    return r[u] ?? null;
  }
  const u = {
    regex: 'увод',
    email: 'email адрас',
    url: 'URL',
    emoji: 'эмодзі',
    uuid: 'UUID',
    uuidv4: 'UUIDv4',
    uuidv6: 'UUIDv6',
    nanoid: 'nanoid',
    guid: 'GUID',
    cuid: 'cuid',
    cuid2: 'cuid2',
    ulid: 'ULID',
    xid: 'XID',
    ksuid: 'KSUID',
    datetime: 'ISO дата і час',
    date: 'ISO дата',
    time: 'ISO час',
    duration: 'ISO працягласць',
    ipv4: 'IPv4 адрас',
    ipv6: 'IPv6 адрас',
    cidrv4: 'IPv4 дыяпазон',
    cidrv6: 'IPv6 дыяпазон',
    base64: 'радок у фармаце base64',
    base64url: 'радок у фармаце base64url',
    json_string: 'JSON радок',
    e164: 'нумар E.164',
    jwt: 'JWT',
    template_literal: 'увод'
  };
  const m = { nan: 'NaN', number: 'лік', array: 'масіў' };
  return r => {
    switch (r.code) {
      case 'invalid_type': {
        const u = m[r.expected] ?? r.expected;
        const v = parsedType(r.input);
        const b = m[v] ?? v;
        if (/^[A-Z]/.test(r.expected)) {
          return `Няправільны ўвод: чакаўся instanceof ${r.expected}, атрымана ${b}`;
        }
        return `Няправільны ўвод: чакаўся ${u}, атрымана ${b}`;
      }
      case 'invalid_value':
        if (r.values.length === 1)
          return `Няправільны ўвод: чакалася ${stringifyPrimitive(r.values[0])}`;
        return `Няправільны варыянт: чакаўся адзін з ${joinValues(r.values, '|')}`;
      case 'too_big': {
        const u = r.inclusive ? '<=' : '<';
        const m = getSizing(r.origin);
        if (m) {
          const v = Number(r.maximum);
          const b = getBelarusianPlural(v, m.unit.one, m.unit.few, m.unit.many);
          return `Занадта вялікі: чакалася, што ${r.origin ?? 'значэнне'} павінна ${m.verb} ${u}${r.maximum.toString()} ${b}`;
        }
        return `Занадта вялікі: чакалася, што ${r.origin ?? 'значэнне'} павінна быць ${u}${r.maximum.toString()}`;
      }
      case 'too_small': {
        const u = r.inclusive ? '>=' : '>';
        const m = getSizing(r.origin);
        if (m) {
          const v = Number(r.minimum);
          const b = getBelarusianPlural(v, m.unit.one, m.unit.few, m.unit.many);
          return `Занадта малы: чакалася, што ${r.origin} павінна ${m.verb} ${u}${r.minimum.toString()} ${b}`;
        }
        return `Занадта малы: чакалася, што ${r.origin} павінна быць ${u}${r.minimum.toString()}`;
      }
      case 'invalid_format': {
        const m = r;
        if (m.format === 'starts_with')
          return `Няправільны радок: павінен пачынацца з "${m.prefix}"`;
        if (m.format === 'ends_with')
          return `Няправільны радок: павінен заканчвацца на "${m.suffix}"`;
        if (m.format === 'includes')
          return `Няправільны радок: павінен змяшчаць "${m.includes}"`;
        if (m.format === 'regex')
          return `Няправільны радок: павінен адпавядаць шаблону ${m.pattern}`;
        return `Няправільны ${u[m.format] ?? r.format}`;
      }
      case 'not_multiple_of':
        return `Няправільны лік: павінен быць кратным ${r.divisor}`;
      case 'unrecognized_keys':
        return `Нераспазнаны ${r.keys.length > 1 ? 'ключы' : 'ключ'}: ${joinValues(r.keys, ', ')}`;
      case 'invalid_key':
        return `Няправільны ключ у ${r.origin}`;
      case 'invalid_union':
        return 'Няправільны ўвод';
      case 'invalid_element':
        return `Няправільнае значэнне ў ${r.origin}`;
      default:
        return `Няправільны ўвод`;
    }
  };
};
function be() {
  return { localeError: be_error() };
}
const bg_error = () => {
  const r = {
    string: { unit: 'символа', verb: 'да съдържа' },
    file: { unit: 'байта', verb: 'да съдържа' },
    array: { unit: 'елемента', verb: 'да съдържа' },
    set: { unit: 'елемента', verb: 'да съдържа' }
  };
  function getSizing(u) {
    return r[u] ?? null;
  }
  const u = {
    regex: 'вход',
    email: 'имейл адрес',
    url: 'URL',
    emoji: 'емоджи',
    uuid: 'UUID',
    uuidv4: 'UUIDv4',
    uuidv6: 'UUIDv6',
    nanoid: 'nanoid',
    guid: 'GUID',
    cuid: 'cuid',
    cuid2: 'cuid2',
    ulid: 'ULID',
    xid: 'XID',
    ksuid: 'KSUID',
    datetime: 'ISO време',
    date: 'ISO дата',
    time: 'ISO време',
    duration: 'ISO продължителност',
    ipv4: 'IPv4 адрес',
    ipv6: 'IPv6 адрес',
    cidrv4: 'IPv4 диапазон',
    cidrv6: 'IPv6 диапазон',
    base64: 'base64-кодиран низ',
    base64url: 'base64url-кодиран низ',
    json_string: 'JSON низ',
    e164: 'E.164 номер',
    jwt: 'JWT',
    template_literal: 'вход'
  };
  const m = { nan: 'NaN', number: 'число', array: 'масив' };
  return r => {
    switch (r.code) {
      case 'invalid_type': {
        const u = m[r.expected] ?? r.expected;
        const v = parsedType(r.input);
        const b = m[v] ?? v;
        if (/^[A-Z]/.test(r.expected)) {
          return `Невалиден вход: очакван instanceof ${r.expected}, получен ${b}`;
        }
        return `Невалиден вход: очакван ${u}, получен ${b}`;
      }
      case 'invalid_value':
        if (r.values.length === 1)
          return `Невалиден вход: очакван ${stringifyPrimitive(r.values[0])}`;
        return `Невалидна опция: очаквано едно от ${joinValues(r.values, '|')}`;
      case 'too_big': {
        const u = r.inclusive ? '<=' : '<';
        const m = getSizing(r.origin);
        if (m)
          return `Твърде голямо: очаква се ${r.origin ?? 'стойност'} да съдържа ${u}${r.maximum.toString()} ${m.unit ?? 'елемента'}`;
        return `Твърде голямо: очаква се ${r.origin ?? 'стойност'} да бъде ${u}${r.maximum.toString()}`;
      }
      case 'too_small': {
        const u = r.inclusive ? '>=' : '>';
        const m = getSizing(r.origin);
        if (m) {
          return `Твърде малко: очаква се ${r.origin} да съдържа ${u}${r.minimum.toString()} ${m.unit}`;
        }
        return `Твърде малко: очаква се ${r.origin} да бъде ${u}${r.minimum.toString()}`;
      }
      case 'invalid_format': {
        const m = r;
        if (m.format === 'starts_with') {
          return `Невалиден низ: трябва да започва с "${m.prefix}"`;
        }
        if (m.format === 'ends_with')
          return `Невалиден низ: трябва да завършва с "${m.suffix}"`;
        if (m.format === 'includes') return `Невалиден низ: трябва да включва "${m.includes}"`;
        if (m.format === 'regex') return `Невалиден низ: трябва да съвпада с ${m.pattern}`;
        let v = 'Невалиден';
        if (m.format === 'emoji') v = 'Невалидно';
        if (m.format === 'datetime') v = 'Невалидно';
        if (m.format === 'date') v = 'Невалидна';
        if (m.format === 'time') v = 'Невалидно';
        if (m.format === 'duration') v = 'Невалидна';
        return `${v} ${u[m.format] ?? r.format}`;
      }
      case 'not_multiple_of':
        return `Невалидно число: трябва да бъде кратно на ${r.divisor}`;
      case 'unrecognized_keys':
        return `Неразпознат${r.keys.length > 1 ? 'и' : ''} ключ${r.keys.length > 1 ? 'ове' : ''}: ${joinValues(r.keys, ', ')}`;
      case 'invalid_key':
        return `Невалиден ключ в ${r.origin}`;
      case 'invalid_union':
        return 'Невалиден вход';
      case 'invalid_element':
        return `Невалидна стойност в ${r.origin}`;
      default:
        return `Невалиден вход`;
    }
  };
};
function bg() {
  return { localeError: bg_error() };
}
const ca_error = () => {
  const r = {
    string: { unit: 'caràcters', verb: 'contenir' },
    file: { unit: 'bytes', verb: 'contenir' },
    array: { unit: 'elements', verb: 'contenir' },
    set: { unit: 'elements', verb: 'contenir' }
  };
  function getSizing(u) {
    return r[u] ?? null;
  }
  const u = {
    regex: 'entrada',
    email: 'adreça electrònica',
    url: 'URL',
    emoji: 'emoji',
    uuid: 'UUID',
    uuidv4: 'UUIDv4',
    uuidv6: 'UUIDv6',
    nanoid: 'nanoid',
    guid: 'GUID',
    cuid: 'cuid',
    cuid2: 'cuid2',
    ulid: 'ULID',
    xid: 'XID',
    ksuid: 'KSUID',
    datetime: 'data i hora ISO',
    date: 'data ISO',
    time: 'hora ISO',
    duration: 'durada ISO',
    ipv4: 'adreça IPv4',
    ipv6: 'adreça IPv6',
    cidrv4: 'rang IPv4',
    cidrv6: 'rang IPv6',
    base64: 'cadena codificada en base64',
    base64url: 'cadena codificada en base64url',
    json_string: 'cadena JSON',
    e164: 'número E.164',
    jwt: 'JWT',
    template_literal: 'entrada'
  };
  const m = { nan: 'NaN' };
  return r => {
    switch (r.code) {
      case 'invalid_type': {
        const u = m[r.expected] ?? r.expected;
        const v = parsedType(r.input);
        const b = m[v] ?? v;
        if (/^[A-Z]/.test(r.expected)) {
          return `Tipus invàlid: s'esperava instanceof ${r.expected}, s'ha rebut ${b}`;
        }
        return `Tipus invàlid: s'esperava ${u}, s'ha rebut ${b}`;
      }
      case 'invalid_value':
        if (r.values.length === 1)
          return `Valor invàlid: s'esperava ${stringifyPrimitive(r.values[0])}`;
        return `Opció invàlida: s'esperava una de ${joinValues(r.values, ' o ')}`;
      case 'too_big': {
        const u = r.inclusive ? 'com a màxim' : 'menys de';
        const m = getSizing(r.origin);
        if (m)
          return `Massa gran: s'esperava que ${r.origin ?? 'el valor'} contingués ${u} ${r.maximum.toString()} ${m.unit ?? 'elements'}`;
        return `Massa gran: s'esperava que ${r.origin ?? 'el valor'} fos ${u} ${r.maximum.toString()}`;
      }
      case 'too_small': {
        const u = r.inclusive ? 'com a mínim' : 'més de';
        const m = getSizing(r.origin);
        if (m) {
          return `Massa petit: s'esperava que ${r.origin} contingués ${u} ${r.minimum.toString()} ${m.unit}`;
        }
        return `Massa petit: s'esperava que ${r.origin} fos ${u} ${r.minimum.toString()}`;
      }
      case 'invalid_format': {
        const m = r;
        if (m.format === 'starts_with') {
          return `Format invàlid: ha de començar amb "${m.prefix}"`;
        }
        if (m.format === 'ends_with') return `Format invàlid: ha d'acabar amb "${m.suffix}"`;
        if (m.format === 'includes') return `Format invàlid: ha d'incloure "${m.includes}"`;
        if (m.format === 'regex')
          return `Format invàlid: ha de coincidir amb el patró ${m.pattern}`;
        return `Format invàlid per a ${u[m.format] ?? r.format}`;
      }
      case 'not_multiple_of':
        return `Número invàlid: ha de ser múltiple de ${r.divisor}`;
      case 'unrecognized_keys':
        return `Clau${r.keys.length > 1 ? 's' : ''} no reconeguda${r.keys.length > 1 ? 's' : ''}: ${joinValues(r.keys, ', ')}`;
      case 'invalid_key':
        return `Clau invàlida a ${r.origin}`;
      case 'invalid_union':
        return 'Entrada invàlida';
      case 'invalid_element':
        return `Element invàlid a ${r.origin}`;
      default:
        return `Entrada invàlida`;
    }
  };
};
function ca() {
  return { localeError: ca_error() };
}
const cs_error = () => {
  const r = {
    string: { unit: 'znaků', verb: 'mít' },
    file: { unit: 'bajtů', verb: 'mít' },
    array: { unit: 'prvků', verb: 'mít' },
    set: { unit: 'prvků', verb: 'mít' }
  };
  function getSizing(u) {
    return r[u] ?? null;
  }
  const u = {
    regex: 'regulární výraz',
    email: 'e-mailová adresa',
    url: 'URL',
    emoji: 'emoji',
    uuid: 'UUID',
    uuidv4: 'UUIDv4',
    uuidv6: 'UUIDv6',
    nanoid: 'nanoid',
    guid: 'GUID',
    cuid: 'cuid',
    cuid2: 'cuid2',
    ulid: 'ULID',
    xid: 'XID',
    ksuid: 'KSUID',
    datetime: 'datum a čas ve formátu ISO',
    date: 'datum ve formátu ISO',
    time: 'čas ve formátu ISO',
    duration: 'doba trvání ISO',
    ipv4: 'IPv4 adresa',
    ipv6: 'IPv6 adresa',
    cidrv4: 'rozsah IPv4',
    cidrv6: 'rozsah IPv6',
    base64: 'řetězec zakódovaný ve formátu base64',
    base64url: 'řetězec zakódovaný ve formátu base64url',
    json_string: 'řetězec ve formátu JSON',
    e164: 'číslo E.164',
    jwt: 'JWT',
    template_literal: 'vstup'
  };
  const m = {
    nan: 'NaN',
    number: 'číslo',
    string: 'řetězec',
    function: 'funkce',
    array: 'pole'
  };
  return r => {
    switch (r.code) {
      case 'invalid_type': {
        const u = m[r.expected] ?? r.expected;
        const v = parsedType(r.input);
        const b = m[v] ?? v;
        if (/^[A-Z]/.test(r.expected)) {
          return `Neplatný vstup: očekáváno instanceof ${r.expected}, obdrženo ${b}`;
        }
        return `Neplatný vstup: očekáváno ${u}, obdrženo ${b}`;
      }
      case 'invalid_value':
        if (r.values.length === 1)
          return `Neplatný vstup: očekáváno ${stringifyPrimitive(r.values[0])}`;
        return `Neplatná možnost: očekávána jedna z hodnot ${joinValues(r.values, '|')}`;
      case 'too_big': {
        const u = r.inclusive ? '<=' : '<';
        const m = getSizing(r.origin);
        if (m) {
          return `Hodnota je příliš velká: ${r.origin ?? 'hodnota'} musí mít ${u}${r.maximum.toString()} ${m.unit ?? 'prvků'}`;
        }
        return `Hodnota je příliš velká: ${r.origin ?? 'hodnota'} musí být ${u}${r.maximum.toString()}`;
      }
      case 'too_small': {
        const u = r.inclusive ? '>=' : '>';
        const m = getSizing(r.origin);
        if (m) {
          return `Hodnota je příliš malá: ${r.origin ?? 'hodnota'} musí mít ${u}${r.minimum.toString()} ${m.unit ?? 'prvků'}`;
        }
        return `Hodnota je příliš malá: ${r.origin ?? 'hodnota'} musí být ${u}${r.minimum.toString()}`;
      }
      case 'invalid_format': {
        const m = r;
        if (m.format === 'starts_with')
          return `Neplatný řetězec: musí začínat na "${m.prefix}"`;
        if (m.format === 'ends_with') return `Neplatný řetězec: musí končit na "${m.suffix}"`;
        if (m.format === 'includes') return `Neplatný řetězec: musí obsahovat "${m.includes}"`;
        if (m.format === 'regex') return `Neplatný řetězec: musí odpovídat vzoru ${m.pattern}`;
        return `Neplatný formát ${u[m.format] ?? r.format}`;
      }
      case 'not_multiple_of':
        return `Neplatné číslo: musí být násobkem ${r.divisor}`;
      case 'unrecognized_keys':
        return `Neznámé klíče: ${joinValues(r.keys, ', ')}`;
      case 'invalid_key':
        return `Neplatný klíč v ${r.origin}`;
      case 'invalid_union':
        return 'Neplatný vstup';
      case 'invalid_element':
        return `Neplatná hodnota v ${r.origin}`;
      default:
        return `Neplatný vstup`;
    }
  };
};
function cs() {
  return { localeError: cs_error() };
}
const da_error = () => {
  const r = {
    string: { unit: 'tegn', verb: 'havde' },
    file: { unit: 'bytes', verb: 'havde' },
    array: { unit: 'elementer', verb: 'indeholdt' },
    set: { unit: 'elementer', verb: 'indeholdt' }
  };
  function getSizing(u) {
    return r[u] ?? null;
  }
  const u = {
    regex: 'input',
    email: 'e-mailadresse',
    url: 'URL',
    emoji: 'emoji',
    uuid: 'UUID',
    uuidv4: 'UUIDv4',
    uuidv6: 'UUIDv6',
    nanoid: 'nanoid',
    guid: 'GUID',
    cuid: 'cuid',
    cuid2: 'cuid2',
    ulid: 'ULID',
    xid: 'XID',
    ksuid: 'KSUID',
    datetime: 'ISO dato- og klokkeslæt',
    date: 'ISO-dato',
    time: 'ISO-klokkeslæt',
    duration: 'ISO-varighed',
    ipv4: 'IPv4-område',
    ipv6: 'IPv6-område',
    cidrv4: 'IPv4-spektrum',
    cidrv6: 'IPv6-spektrum',
    base64: 'base64-kodet streng',
    base64url: 'base64url-kodet streng',
    json_string: 'JSON-streng',
    e164: 'E.164-nummer',
    jwt: 'JWT',
    template_literal: 'input'
  };
  const m = {
    nan: 'NaN',
    string: 'streng',
    number: 'tal',
    boolean: 'boolean',
    array: 'liste',
    object: 'objekt',
    set: 'sæt',
    file: 'fil'
  };
  return r => {
    switch (r.code) {
      case 'invalid_type': {
        const u = m[r.expected] ?? r.expected;
        const v = parsedType(r.input);
        const b = m[v] ?? v;
        if (/^[A-Z]/.test(r.expected)) {
          return `Ugyldigt input: forventede instanceof ${r.expected}, fik ${b}`;
        }
        return `Ugyldigt input: forventede ${u}, fik ${b}`;
      }
      case 'invalid_value':
        if (r.values.length === 1)
          return `Ugyldig værdi: forventede ${stringifyPrimitive(r.values[0])}`;
        return `Ugyldigt valg: forventede en af følgende ${joinValues(r.values, '|')}`;
      case 'too_big': {
        const u = r.inclusive ? '<=' : '<';
        const v = getSizing(r.origin);
        const b = m[r.origin] ?? r.origin;
        if (v)
          return `For stor: forventede ${b ?? 'value'} ${v.verb} ${u} ${r.maximum.toString()} ${v.unit ?? 'elementer'}`;
        return `For stor: forventede ${b ?? 'value'} havde ${u} ${r.maximum.toString()}`;
      }
      case 'too_small': {
        const u = r.inclusive ? '>=' : '>';
        const v = getSizing(r.origin);
        const b = m[r.origin] ?? r.origin;
        if (v) {
          return `For lille: forventede ${b} ${v.verb} ${u} ${r.minimum.toString()} ${v.unit}`;
        }
        return `For lille: forventede ${b} havde ${u} ${r.minimum.toString()}`;
      }
      case 'invalid_format': {
        const m = r;
        if (m.format === 'starts_with') return `Ugyldig streng: skal starte med "${m.prefix}"`;
        if (m.format === 'ends_with') return `Ugyldig streng: skal ende med "${m.suffix}"`;
        if (m.format === 'includes') return `Ugyldig streng: skal indeholde "${m.includes}"`;
        if (m.format === 'regex') return `Ugyldig streng: skal matche mønsteret ${m.pattern}`;
        return `Ugyldig ${u[m.format] ?? r.format}`;
      }
      case 'not_multiple_of':
        return `Ugyldigt tal: skal være deleligt med ${r.divisor}`;
      case 'unrecognized_keys':
        return `${r.keys.length > 1 ? 'Ukendte nøgler' : 'Ukendt nøgle'}: ${joinValues(r.keys, ', ')}`;
      case 'invalid_key':
        return `Ugyldig nøgle i ${r.origin}`;
      case 'invalid_union':
        return 'Ugyldigt input: matcher ingen af de tilladte typer';
      case 'invalid_element':
        return `Ugyldig værdi i ${r.origin}`;
      default:
        return `Ugyldigt input`;
    }
  };
};
function da() {
  return { localeError: da_error() };
}
const de_error = () => {
  const r = {
    string: { unit: 'Zeichen', verb: 'zu haben' },
    file: { unit: 'Bytes', verb: 'zu haben' },
    array: { unit: 'Elemente', verb: 'zu haben' },
    set: { unit: 'Elemente', verb: 'zu haben' }
  };
  function getSizing(u) {
    return r[u] ?? null;
  }
  const u = {
    regex: 'Eingabe',
    email: 'E-Mail-Adresse',
    url: 'URL',
    emoji: 'Emoji',
    uuid: 'UUID',
    uuidv4: 'UUIDv4',
    uuidv6: 'UUIDv6',
    nanoid: 'nanoid',
    guid: 'GUID',
    cuid: 'cuid',
    cuid2: 'cuid2',
    ulid: 'ULID',
    xid: 'XID',
    ksuid: 'KSUID',
    datetime: 'ISO-Datum und -Uhrzeit',
    date: 'ISO-Datum',
    time: 'ISO-Uhrzeit',
    duration: 'ISO-Dauer',
    ipv4: 'IPv4-Adresse',
    ipv6: 'IPv6-Adresse',
    cidrv4: 'IPv4-Bereich',
    cidrv6: 'IPv6-Bereich',
    base64: 'Base64-codierter String',
    base64url: 'Base64-URL-codierter String',
    json_string: 'JSON-String',
    e164: 'E.164-Nummer',
    jwt: 'JWT',
    template_literal: 'Eingabe'
  };
  const m = { nan: 'NaN', number: 'Zahl', array: 'Array' };
  return r => {
    switch (r.code) {
      case 'invalid_type': {
        const u = m[r.expected] ?? r.expected;
        const v = parsedType(r.input);
        const b = m[v] ?? v;
        if (/^[A-Z]/.test(r.expected)) {
          return `Ungültige Eingabe: erwartet instanceof ${r.expected}, erhalten ${b}`;
        }
        return `Ungültige Eingabe: erwartet ${u}, erhalten ${b}`;
      }
      case 'invalid_value':
        if (r.values.length === 1)
          return `Ungültige Eingabe: erwartet ${stringifyPrimitive(r.values[0])}`;
        return `Ungültige Option: erwartet eine von ${joinValues(r.values, '|')}`;
      case 'too_big': {
        const u = r.inclusive ? '<=' : '<';
        const m = getSizing(r.origin);
        if (m)
          return `Zu groß: erwartet, dass ${r.origin ?? 'Wert'} ${u}${r.maximum.toString()} ${m.unit ?? 'Elemente'} hat`;
        return `Zu groß: erwartet, dass ${r.origin ?? 'Wert'} ${u}${r.maximum.toString()} ist`;
      }
      case 'too_small': {
        const u = r.inclusive ? '>=' : '>';
        const m = getSizing(r.origin);
        if (m) {
          return `Zu klein: erwartet, dass ${r.origin} ${u}${r.minimum.toString()} ${m.unit} hat`;
        }
        return `Zu klein: erwartet, dass ${r.origin} ${u}${r.minimum.toString()} ist`;
      }
      case 'invalid_format': {
        const m = r;
        if (m.format === 'starts_with')
          return `Ungültiger String: muss mit "${m.prefix}" beginnen`;
        if (m.format === 'ends_with') return `Ungültiger String: muss mit "${m.suffix}" enden`;
        if (m.format === 'includes')
          return `Ungültiger String: muss "${m.includes}" enthalten`;
        if (m.format === 'regex')
          return `Ungültiger String: muss dem Muster ${m.pattern} entsprechen`;
        return `Ungültig: ${u[m.format] ?? r.format}`;
      }
      case 'not_multiple_of':
        return `Ungültige Zahl: muss ein Vielfaches von ${r.divisor} sein`;
      case 'unrecognized_keys':
        return `${r.keys.length > 1 ? 'Unbekannte Schlüssel' : 'Unbekannter Schlüssel'}: ${joinValues(r.keys, ', ')}`;
      case 'invalid_key':
        return `Ungültiger Schlüssel in ${r.origin}`;
      case 'invalid_union':
        return 'Ungültige Eingabe';
      case 'invalid_element':
        return `Ungültiger Wert in ${r.origin}`;
      default:
        return `Ungültige Eingabe`;
    }
  };
};
function de() {
  return { localeError: de_error() };
}
const en_error = () => {
  const r = {
    string: { unit: 'characters', verb: 'to have' },
    file: { unit: 'bytes', verb: 'to have' },
    array: { unit: 'items', verb: 'to have' },
    set: { unit: 'items', verb: 'to have' },
    map: { unit: 'entries', verb: 'to have' }
  };
  function getSizing(u) {
    return r[u] ?? null;
  }
  const u = {
    regex: 'input',
    email: 'email address',
    url: 'URL',
    emoji: 'emoji',
    uuid: 'UUID',
    uuidv4: 'UUIDv4',
    uuidv6: 'UUIDv6',
    nanoid: 'nanoid',
    guid: 'GUID',
    cuid: 'cuid',
    cuid2: 'cuid2',
    ulid: 'ULID',
    xid: 'XID',
    ksuid: 'KSUID',
    datetime: 'ISO datetime',
    date: 'ISO date',
    time: 'ISO time',
    duration: 'ISO duration',
    ipv4: 'IPv4 address',
    ipv6: 'IPv6 address',
    mac: 'MAC address',
    cidrv4: 'IPv4 range',
    cidrv6: 'IPv6 range',
    base64: 'base64-encoded string',
    base64url: 'base64url-encoded string',
    json_string: 'JSON string',
    e164: 'E.164 number',
    jwt: 'JWT',
    template_literal: 'input'
  };
  const m = { nan: 'NaN' };
  return r => {
    switch (r.code) {
      case 'invalid_type': {
        const u = m[r.expected] ?? r.expected;
        const v = parsedType(r.input);
        const b = m[v] ?? v;
        return `Invalid input: expected ${u}, received ${b}`;
      }
      case 'invalid_value':
        if (r.values.length === 1)
          return `Invalid input: expected ${stringifyPrimitive(r.values[0])}`;
        return `Invalid option: expected one of ${joinValues(r.values, '|')}`;
      case 'too_big': {
        const u = r.inclusive ? '<=' : '<';
        const m = getSizing(r.origin);
        if (m)
          return `Too big: expected ${r.origin ?? 'value'} to have ${u}${r.maximum.toString()} ${m.unit ?? 'elements'}`;
        return `Too big: expected ${r.origin ?? 'value'} to be ${u}${r.maximum.toString()}`;
      }
      case 'too_small': {
        const u = r.inclusive ? '>=' : '>';
        const m = getSizing(r.origin);
        if (m) {
          return `Too small: expected ${r.origin} to have ${u}${r.minimum.toString()} ${m.unit}`;
        }
        return `Too small: expected ${r.origin} to be ${u}${r.minimum.toString()}`;
      }
      case 'invalid_format': {
        const m = r;
        if (m.format === 'starts_with') {
          return `Invalid string: must start with "${m.prefix}"`;
        }
        if (m.format === 'ends_with') return `Invalid string: must end with "${m.suffix}"`;
        if (m.format === 'includes') return `Invalid string: must include "${m.includes}"`;
        if (m.format === 'regex') return `Invalid string: must match pattern ${m.pattern}`;
        return `Invalid ${u[m.format] ?? r.format}`;
      }
      case 'not_multiple_of':
        return `Invalid number: must be a multiple of ${r.divisor}`;
      case 'unrecognized_keys':
        return `Unrecognized key${r.keys.length > 1 ? 's' : ''}: ${joinValues(r.keys, ', ')}`;
      case 'invalid_key':
        return `Invalid key in ${r.origin}`;
      case 'invalid_union':
        return 'Invalid input';
      case 'invalid_element':
        return `Invalid value in ${r.origin}`;
      default:
        return `Invalid input`;
    }
  };
};
function en() {
  return { localeError: en_error() };
}
const eo_error = () => {
  const r = {
    string: { unit: 'karaktrojn', verb: 'havi' },
    file: { unit: 'bajtojn', verb: 'havi' },
    array: { unit: 'elementojn', verb: 'havi' },
    set: { unit: 'elementojn', verb: 'havi' }
  };
  function getSizing(u) {
    return r[u] ?? null;
  }
  const u = {
    regex: 'enigo',
    email: 'retadreso',
    url: 'URL',
    emoji: 'emoĝio',
    uuid: 'UUID',
    uuidv4: 'UUIDv4',
    uuidv6: 'UUIDv6',
    nanoid: 'nanoid',
    guid: 'GUID',
    cuid: 'cuid',
    cuid2: 'cuid2',
    ulid: 'ULID',
    xid: 'XID',
    ksuid: 'KSUID',
    datetime: 'ISO-datotempo',
    date: 'ISO-dato',
    time: 'ISO-tempo',
    duration: 'ISO-daŭro',
    ipv4: 'IPv4-adreso',
    ipv6: 'IPv6-adreso',
    cidrv4: 'IPv4-rango',
    cidrv6: 'IPv6-rango',
    base64: '64-ume kodita karaktraro',
    base64url: 'URL-64-ume kodita karaktraro',
    json_string: 'JSON-karaktraro',
    e164: 'E.164-nombro',
    jwt: 'JWT',
    template_literal: 'enigo'
  };
  const m = { nan: 'NaN', number: 'nombro', array: 'tabelo', null: 'senvalora' };
  return r => {
    switch (r.code) {
      case 'invalid_type': {
        const u = m[r.expected] ?? r.expected;
        const v = parsedType(r.input);
        const b = m[v] ?? v;
        if (/^[A-Z]/.test(r.expected)) {
          return `Nevalida enigo: atendiĝis instanceof ${r.expected}, riceviĝis ${b}`;
        }
        return `Nevalida enigo: atendiĝis ${u}, riceviĝis ${b}`;
      }
      case 'invalid_value':
        if (r.values.length === 1)
          return `Nevalida enigo: atendiĝis ${stringifyPrimitive(r.values[0])}`;
        return `Nevalida opcio: atendiĝis unu el ${joinValues(r.values, '|')}`;
      case 'too_big': {
        const u = r.inclusive ? '<=' : '<';
        const m = getSizing(r.origin);
        if (m)
          return `Tro granda: atendiĝis ke ${r.origin ?? 'valoro'} havu ${u}${r.maximum.toString()} ${m.unit ?? 'elementojn'}`;
        return `Tro granda: atendiĝis ke ${r.origin ?? 'valoro'} havu ${u}${r.maximum.toString()}`;
      }
      case 'too_small': {
        const u = r.inclusive ? '>=' : '>';
        const m = getSizing(r.origin);
        if (m) {
          return `Tro malgranda: atendiĝis ke ${r.origin} havu ${u}${r.minimum.toString()} ${m.unit}`;
        }
        return `Tro malgranda: atendiĝis ke ${r.origin} estu ${u}${r.minimum.toString()}`;
      }
      case 'invalid_format': {
        const m = r;
        if (m.format === 'starts_with')
          return `Nevalida karaktraro: devas komenciĝi per "${m.prefix}"`;
        if (m.format === 'ends_with')
          return `Nevalida karaktraro: devas finiĝi per "${m.suffix}"`;
        if (m.format === 'includes')
          return `Nevalida karaktraro: devas inkluzivi "${m.includes}"`;
        if (m.format === 'regex')
          return `Nevalida karaktraro: devas kongrui kun la modelo ${m.pattern}`;
        return `Nevalida ${u[m.format] ?? r.format}`;
      }
      case 'not_multiple_of':
        return `Nevalida nombro: devas esti oblo de ${r.divisor}`;
      case 'unrecognized_keys':
        return `Nekonata${r.keys.length > 1 ? 'j' : ''} ŝlosilo${r.keys.length > 1 ? 'j' : ''}: ${joinValues(r.keys, ', ')}`;
      case 'invalid_key':
        return `Nevalida ŝlosilo en ${r.origin}`;
      case 'invalid_union':
        return 'Nevalida enigo';
      case 'invalid_element':
        return `Nevalida valoro en ${r.origin}`;
      default:
        return `Nevalida enigo`;
    }
  };
};
function eo() {
  return { localeError: eo_error() };
}
const es_error = () => {
  const r = {
    string: { unit: 'caracteres', verb: 'tener' },
    file: { unit: 'bytes', verb: 'tener' },
    array: { unit: 'elementos', verb: 'tener' },
    set: { unit: 'elementos', verb: 'tener' }
  };
  function getSizing(u) {
    return r[u] ?? null;
  }
  const u = {
    regex: 'entrada',
    email: 'dirección de correo electrónico',
    url: 'URL',
    emoji: 'emoji',
    uuid: 'UUID',
    uuidv4: 'UUIDv4',
    uuidv6: 'UUIDv6',
    nanoid: 'nanoid',
    guid: 'GUID',
    cuid: 'cuid',
    cuid2: 'cuid2',
    ulid: 'ULID',
    xid: 'XID',
    ksuid: 'KSUID',
    datetime: 'fecha y hora ISO',
    date: 'fecha ISO',
    time: 'hora ISO',
    duration: 'duración ISO',
    ipv4: 'dirección IPv4',
    ipv6: 'dirección IPv6',
    cidrv4: 'rango IPv4',
    cidrv6: 'rango IPv6',
    base64: 'cadena codificada en base64',
    base64url: 'URL codificada en base64',
    json_string: 'cadena JSON',
    e164: 'número E.164',
    jwt: 'JWT',
    template_literal: 'entrada'
  };
  const m = {
    nan: 'NaN',
    string: 'texto',
    number: 'número',
    boolean: 'booleano',
    array: 'arreglo',
    object: 'objeto',
    set: 'conjunto',
    file: 'archivo',
    date: 'fecha',
    bigint: 'número grande',
    symbol: 'símbolo',
    undefined: 'indefinido',
    null: 'nulo',
    function: 'función',
    map: 'mapa',
    record: 'registro',
    tuple: 'tupla',
    enum: 'enumeración',
    union: 'unión',
    literal: 'literal',
    promise: 'promesa',
    void: 'vacío',
    never: 'nunca',
    unknown: 'desconocido',
    any: 'cualquiera'
  };
  return r => {
    switch (r.code) {
      case 'invalid_type': {
        const u = m[r.expected] ?? r.expected;
        const v = parsedType(r.input);
        const b = m[v] ?? v;
        if (/^[A-Z]/.test(r.expected)) {
          return `Entrada inválida: se esperaba instanceof ${r.expected}, recibido ${b}`;
        }
        return `Entrada inválida: se esperaba ${u}, recibido ${b}`;
      }
      case 'invalid_value':
        if (r.values.length === 1)
          return `Entrada inválida: se esperaba ${stringifyPrimitive(r.values[0])}`;
        return `Opción inválida: se esperaba una de ${joinValues(r.values, '|')}`;
      case 'too_big': {
        const u = r.inclusive ? '<=' : '<';
        const v = getSizing(r.origin);
        const b = m[r.origin] ?? r.origin;
        if (v)
          return `Demasiado grande: se esperaba que ${b ?? 'valor'} tuviera ${u}${r.maximum.toString()} ${v.unit ?? 'elementos'}`;
        return `Demasiado grande: se esperaba que ${b ?? 'valor'} fuera ${u}${r.maximum.toString()}`;
      }
      case 'too_small': {
        const u = r.inclusive ? '>=' : '>';
        const v = getSizing(r.origin);
        const b = m[r.origin] ?? r.origin;
        if (v) {
          return `Demasiado pequeño: se esperaba que ${b} tuviera ${u}${r.minimum.toString()} ${v.unit}`;
        }
        return `Demasiado pequeño: se esperaba que ${b} fuera ${u}${r.minimum.toString()}`;
      }
      case 'invalid_format': {
        const m = r;
        if (m.format === 'starts_with')
          return `Cadena inválida: debe comenzar con "${m.prefix}"`;
        if (m.format === 'ends_with') return `Cadena inválida: debe terminar en "${m.suffix}"`;
        if (m.format === 'includes') return `Cadena inválida: debe incluir "${m.includes}"`;
        if (m.format === 'regex')
          return `Cadena inválida: debe coincidir con el patrón ${m.pattern}`;
        return `Inválido ${u[m.format] ?? r.format}`;
      }
      case 'not_multiple_of':
        return `Número inválido: debe ser múltiplo de ${r.divisor}`;
      case 'unrecognized_keys':
        return `Llave${r.keys.length > 1 ? 's' : ''} desconocida${r.keys.length > 1 ? 's' : ''}: ${joinValues(r.keys, ', ')}`;
      case 'invalid_key':
        return `Llave inválida en ${m[r.origin] ?? r.origin}`;
      case 'invalid_union':
        return 'Entrada inválida';
      case 'invalid_element':
        return `Valor inválido en ${m[r.origin] ?? r.origin}`;
      default:
        return `Entrada inválida`;
    }
  };
};
function es() {
  return { localeError: es_error() };
}
const fa_error = () => {
  const r = {
    string: { unit: 'کاراکتر', verb: 'داشته باشد' },
    file: { unit: 'بایت', verb: 'داشته باشد' },
    array: { unit: 'آیتم', verb: 'داشته باشد' },
    set: { unit: 'آیتم', verb: 'داشته باشد' }
  };
  function getSizing(u) {
    return r[u] ?? null;
  }
  const u = {
    regex: 'ورودی',
    email: 'آدرس ایمیل',
    url: 'URL',
    emoji: 'ایموجی',
    uuid: 'UUID',
    uuidv4: 'UUIDv4',
    uuidv6: 'UUIDv6',
    nanoid: 'nanoid',
    guid: 'GUID',
    cuid: 'cuid',
    cuid2: 'cuid2',
    ulid: 'ULID',
    xid: 'XID',
    ksuid: 'KSUID',
    datetime: 'تاریخ و زمان ایزو',
    date: 'تاریخ ایزو',
    time: 'زمان ایزو',
    duration: 'مدت زمان ایزو',
    ipv4: 'IPv4 آدرس',
    ipv6: 'IPv6 آدرس',
    cidrv4: 'IPv4 دامنه',
    cidrv6: 'IPv6 دامنه',
    base64: 'base64-encoded رشته',
    base64url: 'base64url-encoded رشته',
    json_string: 'JSON رشته',
    e164: 'E.164 عدد',
    jwt: 'JWT',
    template_literal: 'ورودی'
  };
  const m = { nan: 'NaN', number: 'عدد', array: 'آرایه' };
  return r => {
    switch (r.code) {
      case 'invalid_type': {
        const u = m[r.expected] ?? r.expected;
        const v = parsedType(r.input);
        const b = m[v] ?? v;
        if (/^[A-Z]/.test(r.expected)) {
          return `ورودی نامعتبر: می‌بایست instanceof ${r.expected} می‌بود، ${b} دریافت شد`;
        }
        return `ورودی نامعتبر: می‌بایست ${u} می‌بود، ${b} دریافت شد`;
      }
      case 'invalid_value':
        if (r.values.length === 1) {
          return `ورودی نامعتبر: می‌بایست ${stringifyPrimitive(r.values[0])} می‌بود`;
        }
        return `گزینه نامعتبر: می‌بایست یکی از ${joinValues(r.values, '|')} می‌بود`;
      case 'too_big': {
        const u = r.inclusive ? '<=' : '<';
        const m = getSizing(r.origin);
        if (m) {
          return `خیلی بزرگ: ${r.origin ?? 'مقدار'} باید ${u}${r.maximum.toString()} ${m.unit ?? 'عنصر'} باشد`;
        }
        return `خیلی بزرگ: ${r.origin ?? 'مقدار'} باید ${u}${r.maximum.toString()} باشد`;
      }
      case 'too_small': {
        const u = r.inclusive ? '>=' : '>';
        const m = getSizing(r.origin);
        if (m) {
          return `خیلی کوچک: ${r.origin} باید ${u}${r.minimum.toString()} ${m.unit} باشد`;
        }
        return `خیلی کوچک: ${r.origin} باید ${u}${r.minimum.toString()} باشد`;
      }
      case 'invalid_format': {
        const m = r;
        if (m.format === 'starts_with') {
          return `رشته نامعتبر: باید با "${m.prefix}" شروع شود`;
        }
        if (m.format === 'ends_with') {
          return `رشته نامعتبر: باید با "${m.suffix}" تمام شود`;
        }
        if (m.format === 'includes') {
          return `رشته نامعتبر: باید شامل "${m.includes}" باشد`;
        }
        if (m.format === 'regex') {
          return `رشته نامعتبر: باید با الگوی ${m.pattern} مطابقت داشته باشد`;
        }
        return `${u[m.format] ?? r.format} نامعتبر`;
      }
      case 'not_multiple_of':
        return `عدد نامعتبر: باید مضرب ${r.divisor} باشد`;
      case 'unrecognized_keys':
        return `کلید${r.keys.length > 1 ? 'های' : ''} ناشناس: ${joinValues(r.keys, ', ')}`;
      case 'invalid_key':
        return `کلید ناشناس در ${r.origin}`;
      case 'invalid_union':
        return `ورودی نامعتبر`;
      case 'invalid_element':
        return `مقدار نامعتبر در ${r.origin}`;
      default:
        return `ورودی نامعتبر`;
    }
  };
};
function fa() {
  return { localeError: fa_error() };
}
const fi_error = () => {
  const r = {
    string: { unit: 'merkkiä', subject: 'merkkijonon' },
    file: { unit: 'tavua', subject: 'tiedoston' },
    array: { unit: 'alkiota', subject: 'listan' },
    set: { unit: 'alkiota', subject: 'joukon' },
    number: { unit: '', subject: 'luvun' },
    bigint: { unit: '', subject: 'suuren kokonaisluvun' },
    int: { unit: '', subject: 'kokonaisluvun' },
    date: { unit: '', subject: 'päivämäärän' }
  };
  function getSizing(u) {
    return r[u] ?? null;
  }
  const u = {
    regex: 'säännöllinen lauseke',
    email: 'sähköpostiosoite',
    url: 'URL-osoite',
    emoji: 'emoji',
    uuid: 'UUID',
    uuidv4: 'UUIDv4',
    uuidv6: 'UUIDv6',
    nanoid: 'nanoid',
    guid: 'GUID',
    cuid: 'cuid',
    cuid2: 'cuid2',
    ulid: 'ULID',
    xid: 'XID',
    ksuid: 'KSUID',
    datetime: 'ISO-aikaleima',
    date: 'ISO-päivämäärä',
    time: 'ISO-aika',
    duration: 'ISO-kesto',
    ipv4: 'IPv4-osoite',
    ipv6: 'IPv6-osoite',
    cidrv4: 'IPv4-alue',
    cidrv6: 'IPv6-alue',
    base64: 'base64-koodattu merkkijono',
    base64url: 'base64url-koodattu merkkijono',
    json_string: 'JSON-merkkijono',
    e164: 'E.164-luku',
    jwt: 'JWT',
    template_literal: 'templaattimerkkijono'
  };
  const m = { nan: 'NaN' };
  return r => {
    switch (r.code) {
      case 'invalid_type': {
        const u = m[r.expected] ?? r.expected;
        const v = parsedType(r.input);
        const b = m[v] ?? v;
        if (/^[A-Z]/.test(r.expected)) {
          return `Virheellinen tyyppi: odotettiin instanceof ${r.expected}, oli ${b}`;
        }
        return `Virheellinen tyyppi: odotettiin ${u}, oli ${b}`;
      }
      case 'invalid_value':
        if (r.values.length === 1)
          return `Virheellinen syöte: täytyy olla ${stringifyPrimitive(r.values[0])}`;
        return `Virheellinen valinta: täytyy olla yksi seuraavista: ${joinValues(r.values, '|')}`;
      case 'too_big': {
        const u = r.inclusive ? '<=' : '<';
        const m = getSizing(r.origin);
        if (m) {
          return `Liian suuri: ${m.subject} täytyy olla ${u}${r.maximum.toString()} ${m.unit}`.trim();
        }
        return `Liian suuri: arvon täytyy olla ${u}${r.maximum.toString()}`;
      }
      case 'too_small': {
        const u = r.inclusive ? '>=' : '>';
        const m = getSizing(r.origin);
        if (m) {
          return `Liian pieni: ${m.subject} täytyy olla ${u}${r.minimum.toString()} ${m.unit}`.trim();
        }
        return `Liian pieni: arvon täytyy olla ${u}${r.minimum.toString()}`;
      }
      case 'invalid_format': {
        const m = r;
        if (m.format === 'starts_with')
          return `Virheellinen syöte: täytyy alkaa "${m.prefix}"`;
        if (m.format === 'ends_with') return `Virheellinen syöte: täytyy loppua "${m.suffix}"`;
        if (m.format === 'includes')
          return `Virheellinen syöte: täytyy sisältää "${m.includes}"`;
        if (m.format === 'regex') {
          return `Virheellinen syöte: täytyy vastata säännöllistä lauseketta ${m.pattern}`;
        }
        return `Virheellinen ${u[m.format] ?? r.format}`;
      }
      case 'not_multiple_of':
        return `Virheellinen luku: täytyy olla luvun ${r.divisor} monikerta`;
      case 'unrecognized_keys':
        return `${r.keys.length > 1 ? 'Tuntemattomat avaimet' : 'Tuntematon avain'}: ${joinValues(r.keys, ', ')}`;
      case 'invalid_key':
        return 'Virheellinen avain tietueessa';
      case 'invalid_union':
        return 'Virheellinen unioni';
      case 'invalid_element':
        return 'Virheellinen arvo joukossa';
      default:
        return `Virheellinen syöte`;
    }
  };
};
function fi() {
  return { localeError: fi_error() };
}
const fr_error = () => {
  const r = {
    string: { unit: 'caractères', verb: 'avoir' },
    file: { unit: 'octets', verb: 'avoir' },
    array: { unit: 'éléments', verb: 'avoir' },
    set: { unit: 'éléments', verb: 'avoir' }
  };
  function getSizing(u) {
    return r[u] ?? null;
  }
  const u = {
    regex: 'entrée',
    email: 'adresse e-mail',
    url: 'URL',
    emoji: 'emoji',
    uuid: 'UUID',
    uuidv4: 'UUIDv4',
    uuidv6: 'UUIDv6',
    nanoid: 'nanoid',
    guid: 'GUID',
    cuid: 'cuid',
    cuid2: 'cuid2',
    ulid: 'ULID',
    xid: 'XID',
    ksuid: 'KSUID',
    datetime: 'date et heure ISO',
    date: 'date ISO',
    time: 'heure ISO',
    duration: 'durée ISO',
    ipv4: 'adresse IPv4',
    ipv6: 'adresse IPv6',
    cidrv4: 'plage IPv4',
    cidrv6: 'plage IPv6',
    base64: 'chaîne encodée en base64',
    base64url: 'chaîne encodée en base64url',
    json_string: 'chaîne JSON',
    e164: 'numéro E.164',
    jwt: 'JWT',
    template_literal: 'entrée'
  };
  const m = { nan: 'NaN', number: 'nombre', array: 'tableau' };
  return r => {
    switch (r.code) {
      case 'invalid_type': {
        const u = m[r.expected] ?? r.expected;
        const v = parsedType(r.input);
        const b = m[v] ?? v;
        if (/^[A-Z]/.test(r.expected)) {
          return `Entrée invalide : instanceof ${r.expected} attendu, ${b} reçu`;
        }
        return `Entrée invalide : ${u} attendu, ${b} reçu`;
      }
      case 'invalid_value':
        if (r.values.length === 1)
          return `Entrée invalide : ${stringifyPrimitive(r.values[0])} attendu`;
        return `Option invalide : une valeur parmi ${joinValues(r.values, '|')} attendue`;
      case 'too_big': {
        const u = r.inclusive ? '<=' : '<';
        const m = getSizing(r.origin);
        if (m)
          return `Trop grand : ${r.origin ?? 'valeur'} doit ${m.verb} ${u}${r.maximum.toString()} ${m.unit ?? 'élément(s)'}`;
        return `Trop grand : ${r.origin ?? 'valeur'} doit être ${u}${r.maximum.toString()}`;
      }
      case 'too_small': {
        const u = r.inclusive ? '>=' : '>';
        const m = getSizing(r.origin);
        if (m) {
          return `Trop petit : ${r.origin} doit ${m.verb} ${u}${r.minimum.toString()} ${m.unit}`;
        }
        return `Trop petit : ${r.origin} doit être ${u}${r.minimum.toString()}`;
      }
      case 'invalid_format': {
        const m = r;
        if (m.format === 'starts_with')
          return `Chaîne invalide : doit commencer par "${m.prefix}"`;
        if (m.format === 'ends_with')
          return `Chaîne invalide : doit se terminer par "${m.suffix}"`;
        if (m.format === 'includes') return `Chaîne invalide : doit inclure "${m.includes}"`;
        if (m.format === 'regex')
          return `Chaîne invalide : doit correspondre au modèle ${m.pattern}`;
        return `${u[m.format] ?? r.format} invalide`;
      }
      case 'not_multiple_of':
        return `Nombre invalide : doit être un multiple de ${r.divisor}`;
      case 'unrecognized_keys':
        return `Clé${r.keys.length > 1 ? 's' : ''} non reconnue${r.keys.length > 1 ? 's' : ''} : ${joinValues(r.keys, ', ')}`;
      case 'invalid_key':
        return `Clé invalide dans ${r.origin}`;
      case 'invalid_union':
        return 'Entrée invalide';
      case 'invalid_element':
        return `Valeur invalide dans ${r.origin}`;
      default:
        return `Entrée invalide`;
    }
  };
};
function fr() {
  return { localeError: fr_error() };
}
const fr_CA_error = () => {
  const r = {
    string: { unit: 'caractères', verb: 'avoir' },
    file: { unit: 'octets', verb: 'avoir' },
    array: { unit: 'éléments', verb: 'avoir' },
    set: { unit: 'éléments', verb: 'avoir' }
  };
  function getSizing(u) {
    return r[u] ?? null;
  }
  const u = {
    regex: 'entrée',
    email: 'adresse courriel',
    url: 'URL',
    emoji: 'emoji',
    uuid: 'UUID',
    uuidv4: 'UUIDv4',
    uuidv6: 'UUIDv6',
    nanoid: 'nanoid',
    guid: 'GUID',
    cuid: 'cuid',
    cuid2: 'cuid2',
    ulid: 'ULID',
    xid: 'XID',
    ksuid: 'KSUID',
    datetime: 'date-heure ISO',
    date: 'date ISO',
    time: 'heure ISO',
    duration: 'durée ISO',
    ipv4: 'adresse IPv4',
    ipv6: 'adresse IPv6',
    cidrv4: 'plage IPv4',
    cidrv6: 'plage IPv6',
    base64: 'chaîne encodée en base64',
    base64url: 'chaîne encodée en base64url',
    json_string: 'chaîne JSON',
    e164: 'numéro E.164',
    jwt: 'JWT',
    template_literal: 'entrée'
  };
  const m = { nan: 'NaN' };
  return r => {
    switch (r.code) {
      case 'invalid_type': {
        const u = m[r.expected] ?? r.expected;
        const v = parsedType(r.input);
        const b = m[v] ?? v;
        if (/^[A-Z]/.test(r.expected)) {
          return `Entrée invalide : attendu instanceof ${r.expected}, reçu ${b}`;
        }
        return `Entrée invalide : attendu ${u}, reçu ${b}`;
      }
      case 'invalid_value':
        if (r.values.length === 1)
          return `Entrée invalide : attendu ${stringifyPrimitive(r.values[0])}`;
        return `Option invalide : attendu l'une des valeurs suivantes ${joinValues(r.values, '|')}`;
      case 'too_big': {
        const u = r.inclusive ? '≤' : '<';
        const m = getSizing(r.origin);
        if (m)
          return `Trop grand : attendu que ${r.origin ?? 'la valeur'} ait ${u}${r.maximum.toString()} ${m.unit}`;
        return `Trop grand : attendu que ${r.origin ?? 'la valeur'} soit ${u}${r.maximum.toString()}`;
      }
      case 'too_small': {
        const u = r.inclusive ? '≥' : '>';
        const m = getSizing(r.origin);
        if (m) {
          return `Trop petit : attendu que ${r.origin} ait ${u}${r.minimum.toString()} ${m.unit}`;
        }
        return `Trop petit : attendu que ${r.origin} soit ${u}${r.minimum.toString()}`;
      }
      case 'invalid_format': {
        const m = r;
        if (m.format === 'starts_with') {
          return `Chaîne invalide : doit commencer par "${m.prefix}"`;
        }
        if (m.format === 'ends_with')
          return `Chaîne invalide : doit se terminer par "${m.suffix}"`;
        if (m.format === 'includes') return `Chaîne invalide : doit inclure "${m.includes}"`;
        if (m.format === 'regex')
          return `Chaîne invalide : doit correspondre au motif ${m.pattern}`;
        return `${u[m.format] ?? r.format} invalide`;
      }
      case 'not_multiple_of':
        return `Nombre invalide : doit être un multiple de ${r.divisor}`;
      case 'unrecognized_keys':
        return `Clé${r.keys.length > 1 ? 's' : ''} non reconnue${r.keys.length > 1 ? 's' : ''} : ${joinValues(r.keys, ', ')}`;
      case 'invalid_key':
        return `Clé invalide dans ${r.origin}`;
      case 'invalid_union':
        return 'Entrée invalide';
      case 'invalid_element':
        return `Valeur invalide dans ${r.origin}`;
      default:
        return `Entrée invalide`;
    }
  };
};
function fr_CA() {
  return { localeError: fr_CA_error() };
}
const he_error = () => {
  const r = {
    string: { label: 'מחרוזת', gender: 'f' },
    number: { label: 'מספר', gender: 'm' },
    boolean: { label: 'ערך בוליאני', gender: 'm' },
    bigint: { label: 'BigInt', gender: 'm' },
    date: { label: 'תאריך', gender: 'm' },
    array: { label: 'מערך', gender: 'm' },
    object: { label: 'אובייקט', gender: 'm' },
    null: { label: 'ערך ריק (null)', gender: 'm' },
    undefined: { label: 'ערך לא מוגדר (undefined)', gender: 'm' },
    symbol: { label: 'סימבול (Symbol)', gender: 'm' },
    function: { label: 'פונקציה', gender: 'f' },
    map: { label: 'מפה (Map)', gender: 'f' },
    set: { label: 'קבוצה (Set)', gender: 'f' },
    file: { label: 'קובץ', gender: 'm' },
    promise: { label: 'Promise', gender: 'm' },
    NaN: { label: 'NaN', gender: 'm' },
    unknown: { label: 'ערך לא ידוע', gender: 'm' },
    value: { label: 'ערך', gender: 'm' }
  };
  const u = {
    string: { unit: 'תווים', shortLabel: 'קצר', longLabel: 'ארוך' },
    file: { unit: 'בייטים', shortLabel: 'קטן', longLabel: 'גדול' },
    array: { unit: 'פריטים', shortLabel: 'קטן', longLabel: 'גדול' },
    set: { unit: 'פריטים', shortLabel: 'קטן', longLabel: 'גדול' },
    number: { unit: '', shortLabel: 'קטן', longLabel: 'גדול' }
  };
  const typeEntry = u => (u ? r[u] : undefined);
  const typeLabel = u => {
    const m = typeEntry(u);
    if (m) return m.label;
    return u ?? r.unknown.label;
  };
  const withDefinite = r => `ה${typeLabel(r)}`;
  const verbFor = r => {
    const u = typeEntry(r);
    const m = u?.gender ?? 'm';
    return m === 'f' ? 'צריכה להיות' : 'צריך להיות';
  };
  const getSizing = r => {
    if (!r) return null;
    return u[r] ?? null;
  };
  const m = {
    regex: { label: 'קלט', gender: 'm' },
    email: { label: 'כתובת אימייל', gender: 'f' },
    url: { label: 'כתובת רשת', gender: 'f' },
    emoji: { label: "אימוג'י", gender: 'm' },
    uuid: { label: 'UUID', gender: 'm' },
    nanoid: { label: 'nanoid', gender: 'm' },
    guid: { label: 'GUID', gender: 'm' },
    cuid: { label: 'cuid', gender: 'm' },
    cuid2: { label: 'cuid2', gender: 'm' },
    ulid: { label: 'ULID', gender: 'm' },
    xid: { label: 'XID', gender: 'm' },
    ksuid: { label: 'KSUID', gender: 'm' },
    datetime: { label: 'תאריך וזמן ISO', gender: 'm' },
    date: { label: 'תאריך ISO', gender: 'm' },
    time: { label: 'זמן ISO', gender: 'm' },
    duration: { label: 'משך זמן ISO', gender: 'm' },
    ipv4: { label: 'כתובת IPv4', gender: 'f' },
    ipv6: { label: 'כתובת IPv6', gender: 'f' },
    cidrv4: { label: 'טווח IPv4', gender: 'm' },
    cidrv6: { label: 'טווח IPv6', gender: 'm' },
    base64: { label: 'מחרוזת בבסיס 64', gender: 'f' },
    base64url: { label: 'מחרוזת בבסיס 64 לכתובות רשת', gender: 'f' },
    json_string: { label: 'מחרוזת JSON', gender: 'f' },
    e164: { label: 'מספר E.164', gender: 'm' },
    jwt: { label: 'JWT', gender: 'm' },
    ends_with: { label: 'קלט', gender: 'm' },
    includes: { label: 'קלט', gender: 'm' },
    lowercase: { label: 'קלט', gender: 'm' },
    starts_with: { label: 'קלט', gender: 'm' },
    uppercase: { label: 'קלט', gender: 'm' }
  };
  const v = { nan: 'NaN' };
  return u => {
    switch (u.code) {
      case 'invalid_type': {
        const m = u.expected;
        const b = v[m ?? ''] ?? typeLabel(m);
        const x = parsedType(u.input);
        const w = v[x] ?? r[x]?.label ?? x;
        if (/^[A-Z]/.test(u.expected)) {
          return `קלט לא תקין: צריך להיות instanceof ${u.expected}, התקבל ${w}`;
        }
        return `קלט לא תקין: צריך להיות ${b}, התקבל ${w}`;
      }
      case 'invalid_value': {
        if (u.values.length === 1) {
          return `ערך לא תקין: הערך חייב להיות ${stringifyPrimitive(u.values[0])}`;
        }
        const r = u.values.map(r => stringifyPrimitive(r));
        if (u.values.length === 2) {
          return `ערך לא תקין: האפשרויות המתאימות הן ${r[0]} או ${r[1]}`;
        }
        const m = r[r.length - 1];
        const v = r.slice(0, -1).join(', ');
        return `ערך לא תקין: האפשרויות המתאימות הן ${v} או ${m}`;
      }
      case 'too_big': {
        const r = getSizing(u.origin);
        const m = withDefinite(u.origin ?? 'value');
        if (u.origin === 'string') {
          return `${r?.longLabel ?? 'ארוך'} מדי: ${m} צריכה להכיל ${u.maximum.toString()} ${r?.unit ?? ''} ${u.inclusive ? 'או פחות' : 'לכל היותר'}`.trim();
        }
        if (u.origin === 'number') {
          const r = u.inclusive ? `קטן או שווה ל-${u.maximum}` : `קטן מ-${u.maximum}`;
          return `גדול מדי: ${m} צריך להיות ${r}`;
        }
        if (u.origin === 'array' || u.origin === 'set') {
          const v = u.origin === 'set' ? 'צריכה' : 'צריך';
          const b = u.inclusive
            ? `${u.maximum} ${r?.unit ?? ''} או פחות`
            : `פחות מ-${u.maximum} ${r?.unit ?? ''}`;
          return `גדול מדי: ${m} ${v} להכיל ${b}`.trim();
        }
        const v = u.inclusive ? '<=' : '<';
        const b = verbFor(u.origin ?? 'value');
        if (r?.unit) {
          return `${r.longLabel} מדי: ${m} ${b} ${v}${u.maximum.toString()} ${r.unit}`;
        }
        return `${r?.longLabel ?? 'גדול'} מדי: ${m} ${b} ${v}${u.maximum.toString()}`;
      }
      case 'too_small': {
        const r = getSizing(u.origin);
        const m = withDefinite(u.origin ?? 'value');
        if (u.origin === 'string') {
          return `${r?.shortLabel ?? 'קצר'} מדי: ${m} צריכה להכיל ${u.minimum.toString()} ${r?.unit ?? ''} ${u.inclusive ? 'או יותר' : 'לפחות'}`.trim();
        }
        if (u.origin === 'number') {
          const r = u.inclusive ? `גדול או שווה ל-${u.minimum}` : `גדול מ-${u.minimum}`;
          return `קטן מדי: ${m} צריך להיות ${r}`;
        }
        if (u.origin === 'array' || u.origin === 'set') {
          const v = u.origin === 'set' ? 'צריכה' : 'צריך';
          if (u.minimum === 1 && u.inclusive) {
            const r = u.origin === 'set' ? 'לפחות פריט אחד' : 'לפחות פריט אחד';
            return `קטן מדי: ${m} ${v} להכיל ${r}`;
          }
          const b = u.inclusive
            ? `${u.minimum} ${r?.unit ?? ''} או יותר`
            : `יותר מ-${u.minimum} ${r?.unit ?? ''}`;
          return `קטן מדי: ${m} ${v} להכיל ${b}`.trim();
        }
        const v = u.inclusive ? '>=' : '>';
        const b = verbFor(u.origin ?? 'value');
        if (r?.unit) {
          return `${r.shortLabel} מדי: ${m} ${b} ${v}${u.minimum.toString()} ${r.unit}`;
        }
        return `${r?.shortLabel ?? 'קטן'} מדי: ${m} ${b} ${v}${u.minimum.toString()}`;
      }
      case 'invalid_format': {
        const r = u;
        if (r.format === 'starts_with') return `המחרוזת חייבת להתחיל ב "${r.prefix}"`;
        if (r.format === 'ends_with') return `המחרוזת חייבת להסתיים ב "${r.suffix}"`;
        if (r.format === 'includes') return `המחרוזת חייבת לכלול "${r.includes}"`;
        if (r.format === 'regex') return `המחרוזת חייבת להתאים לתבנית ${r.pattern}`;
        const v = m[r.format];
        const b = v?.label ?? r.format;
        const x = v?.gender ?? 'm';
        const w = x === 'f' ? 'תקינה' : 'תקין';
        return `${b} לא ${w}`;
      }
      case 'not_multiple_of':
        return `מספר לא תקין: חייב להיות מכפלה של ${u.divisor}`;
      case 'unrecognized_keys':
        return `מפתח${u.keys.length > 1 ? 'ות' : ''} לא מזוה${u.keys.length > 1 ? 'ים' : 'ה'}: ${joinValues(u.keys, ', ')}`;
      case 'invalid_key': {
        return `שדה לא תקין באובייקט`;
      }
      case 'invalid_union':
        return 'קלט לא תקין';
      case 'invalid_element': {
        const r = withDefinite(u.origin ?? 'array');
        return `ערך לא תקין ב${r}`;
      }
      default:
        return `קלט לא תקין`;
    }
  };
};
function he() {
  return { localeError: he_error() };
}
const hu_error = () => {
  const r = {
    string: { unit: 'karakter', verb: 'legyen' },
    file: { unit: 'byte', verb: 'legyen' },
    array: { unit: 'elem', verb: 'legyen' },
    set: { unit: 'elem', verb: 'legyen' }
  };
  function getSizing(u) {
    return r[u] ?? null;
  }
  const u = {
    regex: 'bemenet',
    email: 'email cím',
    url: 'URL',
    emoji: 'emoji',
    uuid: 'UUID',
    uuidv4: 'UUIDv4',
    uuidv6: 'UUIDv6',
    nanoid: 'nanoid',
    guid: 'GUID',
    cuid: 'cuid',
    cuid2: 'cuid2',
    ulid: 'ULID',
    xid: 'XID',
    ksuid: 'KSUID',
    datetime: 'ISO időbélyeg',
    date: 'ISO dátum',
    time: 'ISO idő',
    duration: 'ISO időintervallum',
    ipv4: 'IPv4 cím',
    ipv6: 'IPv6 cím',
    cidrv4: 'IPv4 tartomány',
    cidrv6: 'IPv6 tartomány',
    base64: 'base64-kódolt string',
    base64url: 'base64url-kódolt string',
    json_string: 'JSON string',
    e164: 'E.164 szám',
    jwt: 'JWT',
    template_literal: 'bemenet'
  };
  const m = { nan: 'NaN', number: 'szám', array: 'tömb' };
  return r => {
    switch (r.code) {
      case 'invalid_type': {
        const u = m[r.expected] ?? r.expected;
        const v = parsedType(r.input);
        const b = m[v] ?? v;
        if (/^[A-Z]/.test(r.expected)) {
          return `Érvénytelen bemenet: a várt érték instanceof ${r.expected}, a kapott érték ${b}`;
        }
        return `Érvénytelen bemenet: a várt érték ${u}, a kapott érték ${b}`;
      }
      case 'invalid_value':
        if (r.values.length === 1)
          return `Érvénytelen bemenet: a várt érték ${stringifyPrimitive(r.values[0])}`;
        return `Érvénytelen opció: valamelyik érték várt ${joinValues(r.values, '|')}`;
      case 'too_big': {
        const u = r.inclusive ? '<=' : '<';
        const m = getSizing(r.origin);
        if (m)
          return `Túl nagy: ${r.origin ?? 'érték'} mérete túl nagy ${u}${r.maximum.toString()} ${m.unit ?? 'elem'}`;
        return `Túl nagy: a bemeneti érték ${r.origin ?? 'érték'} túl nagy: ${u}${r.maximum.toString()}`;
      }
      case 'too_small': {
        const u = r.inclusive ? '>=' : '>';
        const m = getSizing(r.origin);
        if (m) {
          return `Túl kicsi: a bemeneti érték ${r.origin} mérete túl kicsi ${u}${r.minimum.toString()} ${m.unit}`;
        }
        return `Túl kicsi: a bemeneti érték ${r.origin} túl kicsi ${u}${r.minimum.toString()}`;
      }
      case 'invalid_format': {
        const m = r;
        if (m.format === 'starts_with')
          return `Érvénytelen string: "${m.prefix}" értékkel kell kezdődnie`;
        if (m.format === 'ends_with')
          return `Érvénytelen string: "${m.suffix}" értékkel kell végződnie`;
        if (m.format === 'includes')
          return `Érvénytelen string: "${m.includes}" értéket kell tartalmaznia`;
        if (m.format === 'regex')
          return `Érvénytelen string: ${m.pattern} mintának kell megfelelnie`;
        return `Érvénytelen ${u[m.format] ?? r.format}`;
      }
      case 'not_multiple_of':
        return `Érvénytelen szám: ${r.divisor} többszörösének kell lennie`;
      case 'unrecognized_keys':
        return `Ismeretlen kulcs${r.keys.length > 1 ? 's' : ''}: ${joinValues(r.keys, ', ')}`;
      case 'invalid_key':
        return `Érvénytelen kulcs ${r.origin}`;
      case 'invalid_union':
        return 'Érvénytelen bemenet';
      case 'invalid_element':
        return `Érvénytelen érték: ${r.origin}`;
      default:
        return `Érvénytelen bemenet`;
    }
  };
};
function hu() {
  return { localeError: hu_error() };
}
function getArmenianPlural(r, u, m) {
  return Math.abs(r) === 1 ? u : m;
}
function withDefiniteArticle(r) {
  if (!r) return '';
  const u = ['ա', 'ե', 'ը', 'ի', 'ո', 'ու', 'օ'];
  const m = r[r.length - 1];
  return r + (u.includes(m) ? 'ն' : 'ը');
}
const hy_error = () => {
  const r = {
    string: { unit: { one: 'նշան', many: 'նշաններ' }, verb: 'ունենալ' },
    file: { unit: { one: 'բայթ', many: 'բայթեր' }, verb: 'ունենալ' },
    array: { unit: { one: 'տարր', many: 'տարրեր' }, verb: 'ունենալ' },
    set: { unit: { one: 'տարր', many: 'տարրեր' }, verb: 'ունենալ' }
  };
  function getSizing(u) {
    return r[u] ?? null;
  }
  const u = {
    regex: 'մուտք',
    email: 'էլ. հասցե',
    url: 'URL',
    emoji: 'էմոջի',
    uuid: 'UUID',
    uuidv4: 'UUIDv4',
    uuidv6: 'UUIDv6',
    nanoid: 'nanoid',
    guid: 'GUID',
    cuid: 'cuid',
    cuid2: 'cuid2',
    ulid: 'ULID',
    xid: 'XID',
    ksuid: 'KSUID',
    datetime: 'ISO ամսաթիվ և ժամ',
    date: 'ISO ամսաթիվ',
    time: 'ISO ժամ',
    duration: 'ISO տևողություն',
    ipv4: 'IPv4 հասցե',
    ipv6: 'IPv6 հասցե',
    cidrv4: 'IPv4 միջակայք',
    cidrv6: 'IPv6 միջակայք',
    base64: 'base64 ձևաչափով տող',
    base64url: 'base64url ձևաչափով տող',
    json_string: 'JSON տող',
    e164: 'E.164 համար',
    jwt: 'JWT',
    template_literal: 'մուտք'
  };
  const m = { nan: 'NaN', number: 'թիվ', array: 'զանգված' };
  return r => {
    switch (r.code) {
      case 'invalid_type': {
        const u = m[r.expected] ?? r.expected;
        const v = parsedType(r.input);
        const b = m[v] ?? v;
        if (/^[A-Z]/.test(r.expected)) {
          return `Սխալ մուտքագրում․ սպասվում էր instanceof ${r.expected}, ստացվել է ${b}`;
        }
        return `Սխալ մուտքագրում․ սպասվում էր ${u}, ստացվել է ${b}`;
      }
      case 'invalid_value':
        if (r.values.length === 1)
          return `Սխալ մուտքագրում․ սպասվում էր ${stringifyPrimitive(r.values[1])}`;
        return `Սխալ տարբերակ․ սպասվում էր հետևյալներից մեկը՝ ${joinValues(r.values, '|')}`;
      case 'too_big': {
        const u = r.inclusive ? '<=' : '<';
        const m = getSizing(r.origin);
        if (m) {
          const v = Number(r.maximum);
          const b = getArmenianPlural(v, m.unit.one, m.unit.many);
          return `Չափազանց մեծ արժեք․ սպասվում է, որ ${withDefiniteArticle(r.origin ?? 'արժեք')} կունենա ${u}${r.maximum.toString()} ${b}`;
        }
        return `Չափազանց մեծ արժեք․ սպասվում է, որ ${withDefiniteArticle(r.origin ?? 'արժեք')} լինի ${u}${r.maximum.toString()}`;
      }
      case 'too_small': {
        const u = r.inclusive ? '>=' : '>';
        const m = getSizing(r.origin);
        if (m) {
          const v = Number(r.minimum);
          const b = getArmenianPlural(v, m.unit.one, m.unit.many);
          return `Չափազանց փոքր արժեք․ սպասվում է, որ ${withDefiniteArticle(r.origin)} կունենա ${u}${r.minimum.toString()} ${b}`;
        }
        return `Չափազանց փոքր արժեք․ սպասվում է, որ ${withDefiniteArticle(r.origin)} լինի ${u}${r.minimum.toString()}`;
      }
      case 'invalid_format': {
        const m = r;
        if (m.format === 'starts_with') return `Սխալ տող․ պետք է սկսվի "${m.prefix}"-ով`;
        if (m.format === 'ends_with') return `Սխալ տող․ պետք է ավարտվի "${m.suffix}"-ով`;
        if (m.format === 'includes') return `Սխալ տող․ պետք է պարունակի "${m.includes}"`;
        if (m.format === 'regex')
          return `Սխալ տող․ պետք է համապատասխանի ${m.pattern} ձևաչափին`;
        return `Սխալ ${u[m.format] ?? r.format}`;
      }
      case 'not_multiple_of':
        return `Սխալ թիվ․ պետք է բազմապատիկ լինի ${r.divisor}-ի`;
      case 'unrecognized_keys':
        return `Չճանաչված բանալի${r.keys.length > 1 ? 'ներ' : ''}. ${joinValues(r.keys, ', ')}`;
      case 'invalid_key':
        return `Սխալ բանալի ${withDefiniteArticle(r.origin)}-ում`;
      case 'invalid_union':
        return 'Սխալ մուտքագրում';
      case 'invalid_element':
        return `Սխալ արժեք ${withDefiniteArticle(r.origin)}-ում`;
      default:
        return `Սխալ մուտքագրում`;
    }
  };
};
function hy() {
  return { localeError: hy_error() };
}
const id_error = () => {
  const r = {
    string: { unit: 'karakter', verb: 'memiliki' },
    file: { unit: 'byte', verb: 'memiliki' },
    array: { unit: 'item', verb: 'memiliki' },
    set: { unit: 'item', verb: 'memiliki' }
  };
  function getSizing(u) {
    return r[u] ?? null;
  }
  const u = {
    regex: 'input',
    email: 'alamat email',
    url: 'URL',
    emoji: 'emoji',
    uuid: 'UUID',
    uuidv4: 'UUIDv4',
    uuidv6: 'UUIDv6',
    nanoid: 'nanoid',
    guid: 'GUID',
    cuid: 'cuid',
    cuid2: 'cuid2',
    ulid: 'ULID',
    xid: 'XID',
    ksuid: 'KSUID',
    datetime: 'tanggal dan waktu format ISO',
    date: 'tanggal format ISO',
    time: 'jam format ISO',
    duration: 'durasi format ISO',
    ipv4: 'alamat IPv4',
    ipv6: 'alamat IPv6',
    cidrv4: 'rentang alamat IPv4',
    cidrv6: 'rentang alamat IPv6',
    base64: 'string dengan enkode base64',
    base64url: 'string dengan enkode base64url',
    json_string: 'string JSON',
    e164: 'angka E.164',
    jwt: 'JWT',
    template_literal: 'input'
  };
  const m = { nan: 'NaN' };
  return r => {
    switch (r.code) {
      case 'invalid_type': {
        const u = m[r.expected] ?? r.expected;
        const v = parsedType(r.input);
        const b = m[v] ?? v;
        if (/^[A-Z]/.test(r.expected)) {
          return `Input tidak valid: diharapkan instanceof ${r.expected}, diterima ${b}`;
        }
        return `Input tidak valid: diharapkan ${u}, diterima ${b}`;
      }
      case 'invalid_value':
        if (r.values.length === 1)
          return `Input tidak valid: diharapkan ${stringifyPrimitive(r.values[0])}`;
        return `Pilihan tidak valid: diharapkan salah satu dari ${joinValues(r.values, '|')}`;
      case 'too_big': {
        const u = r.inclusive ? '<=' : '<';
        const m = getSizing(r.origin);
        if (m)
          return `Terlalu besar: diharapkan ${r.origin ?? 'value'} memiliki ${u}${r.maximum.toString()} ${m.unit ?? 'elemen'}`;
        return `Terlalu besar: diharapkan ${r.origin ?? 'value'} menjadi ${u}${r.maximum.toString()}`;
      }
      case 'too_small': {
        const u = r.inclusive ? '>=' : '>';
        const m = getSizing(r.origin);
        if (m) {
          return `Terlalu kecil: diharapkan ${r.origin} memiliki ${u}${r.minimum.toString()} ${m.unit}`;
        }
        return `Terlalu kecil: diharapkan ${r.origin} menjadi ${u}${r.minimum.toString()}`;
      }
      case 'invalid_format': {
        const m = r;
        if (m.format === 'starts_with')
          return `String tidak valid: harus dimulai dengan "${m.prefix}"`;
        if (m.format === 'ends_with')
          return `String tidak valid: harus berakhir dengan "${m.suffix}"`;
        if (m.format === 'includes')
          return `String tidak valid: harus menyertakan "${m.includes}"`;
        if (m.format === 'regex') return `String tidak valid: harus sesuai pola ${m.pattern}`;
        return `${u[m.format] ?? r.format} tidak valid`;
      }
      case 'not_multiple_of':
        return `Angka tidak valid: harus kelipatan dari ${r.divisor}`;
      case 'unrecognized_keys':
        return `Kunci tidak dikenali ${r.keys.length > 1 ? 's' : ''}: ${joinValues(r.keys, ', ')}`;
      case 'invalid_key':
        return `Kunci tidak valid di ${r.origin}`;
      case 'invalid_union':
        return 'Input tidak valid';
      case 'invalid_element':
        return `Nilai tidak valid di ${r.origin}`;
      default:
        return `Input tidak valid`;
    }
  };
};
function id() {
  return { localeError: id_error() };
}
const is_error = () => {
  const r = {
    string: { unit: 'stafi', verb: 'að hafa' },
    file: { unit: 'bæti', verb: 'að hafa' },
    array: { unit: 'hluti', verb: 'að hafa' },
    set: { unit: 'hluti', verb: 'að hafa' }
  };
  function getSizing(u) {
    return r[u] ?? null;
  }
  const u = {
    regex: 'gildi',
    email: 'netfang',
    url: 'vefslóð',
    emoji: 'emoji',
    uuid: 'UUID',
    uuidv4: 'UUIDv4',
    uuidv6: 'UUIDv6',
    nanoid: 'nanoid',
    guid: 'GUID',
    cuid: 'cuid',
    cuid2: 'cuid2',
    ulid: 'ULID',
    xid: 'XID',
    ksuid: 'KSUID',
    datetime: 'ISO dagsetning og tími',
    date: 'ISO dagsetning',
    time: 'ISO tími',
    duration: 'ISO tímalengd',
    ipv4: 'IPv4 address',
    ipv6: 'IPv6 address',
    cidrv4: 'IPv4 range',
    cidrv6: 'IPv6 range',
    base64: 'base64-encoded strengur',
    base64url: 'base64url-encoded strengur',
    json_string: 'JSON strengur',
    e164: 'E.164 tölugildi',
    jwt: 'JWT',
    template_literal: 'gildi'
  };
  const m = { nan: 'NaN', number: 'númer', array: 'fylki' };
  return r => {
    switch (r.code) {
      case 'invalid_type': {
        const u = m[r.expected] ?? r.expected;
        const v = parsedType(r.input);
        const b = m[v] ?? v;
        if (/^[A-Z]/.test(r.expected)) {
          return `Rangt gildi: Þú slóst inn ${b} þar sem á að vera instanceof ${r.expected}`;
        }
        return `Rangt gildi: Þú slóst inn ${b} þar sem á að vera ${u}`;
      }
      case 'invalid_value':
        if (r.values.length === 1)
          return `Rangt gildi: gert ráð fyrir ${stringifyPrimitive(r.values[0])}`;
        return `Ógilt val: má vera eitt af eftirfarandi ${joinValues(r.values, '|')}`;
      case 'too_big': {
        const u = r.inclusive ? '<=' : '<';
        const m = getSizing(r.origin);
        if (m)
          return `Of stórt: gert er ráð fyrir að ${r.origin ?? 'gildi'} hafi ${u}${r.maximum.toString()} ${m.unit ?? 'hluti'}`;
        return `Of stórt: gert er ráð fyrir að ${r.origin ?? 'gildi'} sé ${u}${r.maximum.toString()}`;
      }
      case 'too_small': {
        const u = r.inclusive ? '>=' : '>';
        const m = getSizing(r.origin);
        if (m) {
          return `Of lítið: gert er ráð fyrir að ${r.origin} hafi ${u}${r.minimum.toString()} ${m.unit}`;
        }
        return `Of lítið: gert er ráð fyrir að ${r.origin} sé ${u}${r.minimum.toString()}`;
      }
      case 'invalid_format': {
        const m = r;
        if (m.format === 'starts_with') {
          return `Ógildur strengur: verður að byrja á "${m.prefix}"`;
        }
        if (m.format === 'ends_with')
          return `Ógildur strengur: verður að enda á "${m.suffix}"`;
        if (m.format === 'includes')
          return `Ógildur strengur: verður að innihalda "${m.includes}"`;
        if (m.format === 'regex')
          return `Ógildur strengur: verður að fylgja mynstri ${m.pattern}`;
        return `Rangt ${u[m.format] ?? r.format}`;
      }
      case 'not_multiple_of':
        return `Röng tala: verður að vera margfeldi af ${r.divisor}`;
      case 'unrecognized_keys':
        return `Óþekkt ${r.keys.length > 1 ? 'ir lyklar' : 'ur lykill'}: ${joinValues(r.keys, ', ')}`;
      case 'invalid_key':
        return `Rangur lykill í ${r.origin}`;
      case 'invalid_union':
        return 'Rangt gildi';
      case 'invalid_element':
        return `Rangt gildi í ${r.origin}`;
      default:
        return `Rangt gildi`;
    }
  };
};
function is() {
  return { localeError: is_error() };
}
const it_error = () => {
  const r = {
    string: { unit: 'caratteri', verb: 'avere' },
    file: { unit: 'byte', verb: 'avere' },
    array: { unit: 'elementi', verb: 'avere' },
    set: { unit: 'elementi', verb: 'avere' }
  };
  function getSizing(u) {
    return r[u] ?? null;
  }
  const u = {
    regex: 'input',
    email: 'indirizzo email',
    url: 'URL',
    emoji: 'emoji',
    uuid: 'UUID',
    uuidv4: 'UUIDv4',
    uuidv6: 'UUIDv6',
    nanoid: 'nanoid',
    guid: 'GUID',
    cuid: 'cuid',
    cuid2: 'cuid2',
    ulid: 'ULID',
    xid: 'XID',
    ksuid: 'KSUID',
    datetime: 'data e ora ISO',
    date: 'data ISO',
    time: 'ora ISO',
    duration: 'durata ISO',
    ipv4: 'indirizzo IPv4',
    ipv6: 'indirizzo IPv6',
    cidrv4: 'intervallo IPv4',
    cidrv6: 'intervallo IPv6',
    base64: 'stringa codificata in base64',
    base64url: 'URL codificata in base64',
    json_string: 'stringa JSON',
    e164: 'numero E.164',
    jwt: 'JWT',
    template_literal: 'input'
  };
  const m = { nan: 'NaN', number: 'numero', array: 'vettore' };
  return r => {
    switch (r.code) {
      case 'invalid_type': {
        const u = m[r.expected] ?? r.expected;
        const v = parsedType(r.input);
        const b = m[v] ?? v;
        if (/^[A-Z]/.test(r.expected)) {
          return `Input non valido: atteso instanceof ${r.expected}, ricevuto ${b}`;
        }
        return `Input non valido: atteso ${u}, ricevuto ${b}`;
      }
      case 'invalid_value':
        if (r.values.length === 1)
          return `Input non valido: atteso ${stringifyPrimitive(r.values[0])}`;
        return `Opzione non valida: atteso uno tra ${joinValues(r.values, '|')}`;
      case 'too_big': {
        const u = r.inclusive ? '<=' : '<';
        const m = getSizing(r.origin);
        if (m)
          return `Troppo grande: ${r.origin ?? 'valore'} deve avere ${u}${r.maximum.toString()} ${m.unit ?? 'elementi'}`;
        return `Troppo grande: ${r.origin ?? 'valore'} deve essere ${u}${r.maximum.toString()}`;
      }
      case 'too_small': {
        const u = r.inclusive ? '>=' : '>';
        const m = getSizing(r.origin);
        if (m) {
          return `Troppo piccolo: ${r.origin} deve avere ${u}${r.minimum.toString()} ${m.unit}`;
        }
        return `Troppo piccolo: ${r.origin} deve essere ${u}${r.minimum.toString()}`;
      }
      case 'invalid_format': {
        const m = r;
        if (m.format === 'starts_with')
          return `Stringa non valida: deve iniziare con "${m.prefix}"`;
        if (m.format === 'ends_with')
          return `Stringa non valida: deve terminare con "${m.suffix}"`;
        if (m.format === 'includes')
          return `Stringa non valida: deve includere "${m.includes}"`;
        if (m.format === 'regex')
          return `Stringa non valida: deve corrispondere al pattern ${m.pattern}`;
        return `Invalid ${u[m.format] ?? r.format}`;
      }
      case 'not_multiple_of':
        return `Numero non valido: deve essere un multiplo di ${r.divisor}`;
      case 'unrecognized_keys':
        return `Chiav${r.keys.length > 1 ? 'i' : 'e'} non riconosciut${r.keys.length > 1 ? 'e' : 'a'}: ${joinValues(r.keys, ', ')}`;
      case 'invalid_key':
        return `Chiave non valida in ${r.origin}`;
      case 'invalid_union':
        return 'Input non valido';
      case 'invalid_element':
        return `Valore non valido in ${r.origin}`;
      default:
        return `Input non valido`;
    }
  };
};
function it() {
  return { localeError: it_error() };
}
const ja_error = () => {
  const r = {
    string: { unit: '文字', verb: 'である' },
    file: { unit: 'バイト', verb: 'である' },
    array: { unit: '要素', verb: 'である' },
    set: { unit: '要素', verb: 'である' }
  };
  function getSizing(u) {
    return r[u] ?? null;
  }
  const u = {
    regex: '入力値',
    email: 'メールアドレス',
    url: 'URL',
    emoji: '絵文字',
    uuid: 'UUID',
    uuidv4: 'UUIDv4',
    uuidv6: 'UUIDv6',
    nanoid: 'nanoid',
    guid: 'GUID',
    cuid: 'cuid',
    cuid2: 'cuid2',
    ulid: 'ULID',
    xid: 'XID',
    ksuid: 'KSUID',
    datetime: 'ISO日時',
    date: 'ISO日付',
    time: 'ISO時刻',
    duration: 'ISO期間',
    ipv4: 'IPv4アドレス',
    ipv6: 'IPv6アドレス',
    cidrv4: 'IPv4範囲',
    cidrv6: 'IPv6範囲',
    base64: 'base64エンコード文字列',
    base64url: 'base64urlエンコード文字列',
    json_string: 'JSON文字列',
    e164: 'E.164番号',
    jwt: 'JWT',
    template_literal: '入力値'
  };
  const m = { nan: 'NaN', number: '数値', array: '配列' };
  return r => {
    switch (r.code) {
      case 'invalid_type': {
        const u = m[r.expected] ?? r.expected;
        const v = parsedType(r.input);
        const b = m[v] ?? v;
        if (/^[A-Z]/.test(r.expected)) {
          return `無効な入力: instanceof ${r.expected}が期待されましたが、${b}が入力されました`;
        }
        return `無効な入力: ${u}が期待されましたが、${b}が入力されました`;
      }
      case 'invalid_value':
        if (r.values.length === 1)
          return `無効な入力: ${stringifyPrimitive(r.values[0])}が期待されました`;
        return `無効な選択: ${joinValues(r.values, '、')}のいずれかである必要があります`;
      case 'too_big': {
        const u = r.inclusive ? '以下である' : 'より小さい';
        const m = getSizing(r.origin);
        if (m)
          return `大きすぎる値: ${r.origin ?? '値'}は${r.maximum.toString()}${m.unit ?? '要素'}${u}必要があります`;
        return `大きすぎる値: ${r.origin ?? '値'}は${r.maximum.toString()}${u}必要があります`;
      }
      case 'too_small': {
        const u = r.inclusive ? '以上である' : 'より大きい';
        const m = getSizing(r.origin);
        if (m)
          return `小さすぎる値: ${r.origin}は${r.minimum.toString()}${m.unit}${u}必要があります`;
        return `小さすぎる値: ${r.origin}は${r.minimum.toString()}${u}必要があります`;
      }
      case 'invalid_format': {
        const m = r;
        if (m.format === 'starts_with')
          return `無効な文字列: "${m.prefix}"で始まる必要があります`;
        if (m.format === 'ends_with')
          return `無効な文字列: "${m.suffix}"で終わる必要があります`;
        if (m.format === 'includes')
          return `無効な文字列: "${m.includes}"を含む必要があります`;
        if (m.format === 'regex')
          return `無効な文字列: パターン${m.pattern}に一致する必要があります`;
        return `無効な${u[m.format] ?? r.format}`;
      }
      case 'not_multiple_of':
        return `無効な数値: ${r.divisor}の倍数である必要があります`;
      case 'unrecognized_keys':
        return `認識されていないキー${r.keys.length > 1 ? '群' : ''}: ${joinValues(r.keys, '、')}`;
      case 'invalid_key':
        return `${r.origin}内の無効なキー`;
      case 'invalid_union':
        return '無効な入力';
      case 'invalid_element':
        return `${r.origin}内の無効な値`;
      default:
        return `無効な入力`;
    }
  };
};
function ja() {
  return { localeError: ja_error() };
}
const ka_error = () => {
  const r = {
    string: { unit: 'სიმბოლო', verb: 'უნდა შეიცავდეს' },
    file: { unit: 'ბაიტი', verb: 'უნდა შეიცავდეს' },
    array: { unit: 'ელემენტი', verb: 'უნდა შეიცავდეს' },
    set: { unit: 'ელემენტი', verb: 'უნდა შეიცავდეს' }
  };
  function getSizing(u) {
    return r[u] ?? null;
  }
  const u = {
    regex: 'შეყვანა',
    email: 'ელ-ფოსტის მისამართი',
    url: 'URL',
    emoji: 'ემოჯი',
    uuid: 'UUID',
    uuidv4: 'UUIDv4',
    uuidv6: 'UUIDv6',
    nanoid: 'nanoid',
    guid: 'GUID',
    cuid: 'cuid',
    cuid2: 'cuid2',
    ulid: 'ULID',
    xid: 'XID',
    ksuid: 'KSUID',
    datetime: 'თარიღი-დრო',
    date: 'თარიღი',
    time: 'დრო',
    duration: 'ხანგრძლივობა',
    ipv4: 'IPv4 მისამართი',
    ipv6: 'IPv6 მისამართი',
    cidrv4: 'IPv4 დიაპაზონი',
    cidrv6: 'IPv6 დიაპაზონი',
    base64: 'base64-კოდირებული სტრინგი',
    base64url: 'base64url-კოდირებული სტრინგი',
    json_string: 'JSON სტრინგი',
    e164: 'E.164 ნომერი',
    jwt: 'JWT',
    template_literal: 'შეყვანა'
  };
  const m = {
    nan: 'NaN',
    number: 'რიცხვი',
    string: 'სტრინგი',
    boolean: 'ბულეანი',
    function: 'ფუნქცია',
    array: 'მასივი'
  };
  return r => {
    switch (r.code) {
      case 'invalid_type': {
        const u = m[r.expected] ?? r.expected;
        const v = parsedType(r.input);
        const b = m[v] ?? v;
        if (/^[A-Z]/.test(r.expected)) {
          return `არასწორი შეყვანა: მოსალოდნელი instanceof ${r.expected}, მიღებული ${b}`;
        }
        return `არასწორი შეყვანა: მოსალოდნელი ${u}, მიღებული ${b}`;
      }
      case 'invalid_value':
        if (r.values.length === 1)
          return `არასწორი შეყვანა: მოსალოდნელი ${stringifyPrimitive(r.values[0])}`;
        return `არასწორი ვარიანტი: მოსალოდნელია ერთ-ერთი ${joinValues(r.values, '|')}-დან`;
      case 'too_big': {
        const u = r.inclusive ? '<=' : '<';
        const m = getSizing(r.origin);
        if (m)
          return `ზედმეტად დიდი: მოსალოდნელი ${r.origin ?? 'მნიშვნელობა'} ${m.verb} ${u}${r.maximum.toString()} ${m.unit}`;
        return `ზედმეტად დიდი: მოსალოდნელი ${r.origin ?? 'მნიშვნელობა'} იყოს ${u}${r.maximum.toString()}`;
      }
      case 'too_small': {
        const u = r.inclusive ? '>=' : '>';
        const m = getSizing(r.origin);
        if (m) {
          return `ზედმეტად პატარა: მოსალოდნელი ${r.origin} ${m.verb} ${u}${r.minimum.toString()} ${m.unit}`;
        }
        return `ზედმეტად პატარა: მოსალოდნელი ${r.origin} იყოს ${u}${r.minimum.toString()}`;
      }
      case 'invalid_format': {
        const m = r;
        if (m.format === 'starts_with') {
          return `არასწორი სტრინგი: უნდა იწყებოდეს "${m.prefix}"-ით`;
        }
        if (m.format === 'ends_with')
          return `არასწორი სტრინგი: უნდა მთავრდებოდეს "${m.suffix}"-ით`;
        if (m.format === 'includes')
          return `არასწორი სტრინგი: უნდა შეიცავდეს "${m.includes}"-ს`;
        if (m.format === 'regex')
          return `არასწორი სტრინგი: უნდა შეესაბამებოდეს შაბლონს ${m.pattern}`;
        return `არასწორი ${u[m.format] ?? r.format}`;
      }
      case 'not_multiple_of':
        return `არასწორი რიცხვი: უნდა იყოს ${r.divisor}-ის ჯერადი`;
      case 'unrecognized_keys':
        return `უცნობი გასაღებ${r.keys.length > 1 ? 'ები' : 'ი'}: ${joinValues(r.keys, ', ')}`;
      case 'invalid_key':
        return `არასწორი გასაღები ${r.origin}-ში`;
      case 'invalid_union':
        return 'არასწორი შეყვანა';
      case 'invalid_element':
        return `არასწორი მნიშვნელობა ${r.origin}-ში`;
      default:
        return `არასწორი შეყვანა`;
    }
  };
};
function ka() {
  return { localeError: ka_error() };
}
const km_error = () => {
  const r = {
    string: { unit: 'តួអក្សរ', verb: 'គួរមាន' },
    file: { unit: 'បៃ', verb: 'គួរមាន' },
    array: { unit: 'ធាតុ', verb: 'គួរមាន' },
    set: { unit: 'ធាតុ', verb: 'គួរមាន' }
  };
  function getSizing(u) {
    return r[u] ?? null;
  }
  const u = {
    regex: 'ទិន្នន័យបញ្ចូល',
    email: 'អាសយដ្ឋានអ៊ីមែល',
    url: 'URL',
    emoji: 'សញ្ញាអារម្មណ៍',
    uuid: 'UUID',
    uuidv4: 'UUIDv4',
    uuidv6: 'UUIDv6',
    nanoid: 'nanoid',
    guid: 'GUID',
    cuid: 'cuid',
    cuid2: 'cuid2',
    ulid: 'ULID',
    xid: 'XID',
    ksuid: 'KSUID',
    datetime: 'កាលបរិច្ឆេទ និងម៉ោង ISO',
    date: 'កាលបរិច្ឆេទ ISO',
    time: 'ម៉ោង ISO',
    duration: 'រយៈពេល ISO',
    ipv4: 'អាសយដ្ឋាន IPv4',
    ipv6: 'អាសយដ្ឋាន IPv6',
    cidrv4: 'ដែនអាសយដ្ឋាន IPv4',
    cidrv6: 'ដែនអាសយដ្ឋាន IPv6',
    base64: 'ខ្សែអក្សរអ៊ិកូដ base64',
    base64url: 'ខ្សែអក្សរអ៊ិកូដ base64url',
    json_string: 'ខ្សែអក្សរ JSON',
    e164: 'លេខ E.164',
    jwt: 'JWT',
    template_literal: 'ទិន្នន័យបញ្ចូល'
  };
  const m = { nan: 'NaN', number: 'លេខ', array: 'អារេ (Array)', null: 'គ្មានតម្លៃ (null)' };
  return r => {
    switch (r.code) {
      case 'invalid_type': {
        const u = m[r.expected] ?? r.expected;
        const v = parsedType(r.input);
        const b = m[v] ?? v;
        if (/^[A-Z]/.test(r.expected)) {
          return `ទិន្នន័យបញ្ចូលមិនត្រឹមត្រូវ៖ ត្រូវការ instanceof ${r.expected} ប៉ុន្តែទទួលបាន ${b}`;
        }
        return `ទិន្នន័យបញ្ចូលមិនត្រឹមត្រូវ៖ ត្រូវការ ${u} ប៉ុន្តែទទួលបាន ${b}`;
      }
      case 'invalid_value':
        if (r.values.length === 1)
          return `ទិន្នន័យបញ្ចូលមិនត្រឹមត្រូវ៖ ត្រូវការ ${stringifyPrimitive(r.values[0])}`;
        return `ជម្រើសមិនត្រឹមត្រូវ៖ ត្រូវជាមួយក្នុងចំណោម ${joinValues(r.values, '|')}`;
      case 'too_big': {
        const u = r.inclusive ? '<=' : '<';
        const m = getSizing(r.origin);
        if (m)
          return `ធំពេក៖ ត្រូវការ ${r.origin ?? 'តម្លៃ'} ${u} ${r.maximum.toString()} ${m.unit ?? 'ធាតុ'}`;
        return `ធំពេក៖ ត្រូវការ ${r.origin ?? 'តម្លៃ'} ${u} ${r.maximum.toString()}`;
      }
      case 'too_small': {
        const u = r.inclusive ? '>=' : '>';
        const m = getSizing(r.origin);
        if (m) {
          return `តូចពេក៖ ត្រូវការ ${r.origin} ${u} ${r.minimum.toString()} ${m.unit}`;
        }
        return `តូចពេក៖ ត្រូវការ ${r.origin} ${u} ${r.minimum.toString()}`;
      }
      case 'invalid_format': {
        const m = r;
        if (m.format === 'starts_with') {
          return `ខ្សែអក្សរមិនត្រឹមត្រូវ៖ ត្រូវចាប់ផ្តើមដោយ "${m.prefix}"`;
        }
        if (m.format === 'ends_with')
          return `ខ្សែអក្សរមិនត្រឹមត្រូវ៖ ត្រូវបញ្ចប់ដោយ "${m.suffix}"`;
        if (m.format === 'includes') return `ខ្សែអក្សរមិនត្រឹមត្រូវ៖ ត្រូវមាន "${m.includes}"`;
        if (m.format === 'regex')
          return `ខ្សែអក្សរមិនត្រឹមត្រូវ៖ ត្រូវតែផ្គូផ្គងនឹងទម្រង់ដែលបានកំណត់ ${m.pattern}`;
        return `មិនត្រឹមត្រូវ៖ ${u[m.format] ?? r.format}`;
      }
      case 'not_multiple_of':
        return `លេខមិនត្រឹមត្រូវ៖ ត្រូវតែជាពហុគុណនៃ ${r.divisor}`;
      case 'unrecognized_keys':
        return `រកឃើញសោមិនស្គាល់៖ ${joinValues(r.keys, ', ')}`;
      case 'invalid_key':
        return `សោមិនត្រឹមត្រូវនៅក្នុង ${r.origin}`;
      case 'invalid_union':
        return `ទិន្នន័យមិនត្រឹមត្រូវ`;
      case 'invalid_element':
        return `ទិន្នន័យមិនត្រឹមត្រូវនៅក្នុង ${r.origin}`;
      default:
        return `ទិន្នន័យមិនត្រឹមត្រូវ`;
    }
  };
};
function km() {
  return { localeError: km_error() };
}
function kh() {
  return km();
}
const ko_error = () => {
  const r = {
    string: { unit: '문자', verb: 'to have' },
    file: { unit: '바이트', verb: 'to have' },
    array: { unit: '개', verb: 'to have' },
    set: { unit: '개', verb: 'to have' }
  };
  function getSizing(u) {
    return r[u] ?? null;
  }
  const u = {
    regex: '입력',
    email: '이메일 주소',
    url: 'URL',
    emoji: '이모지',
    uuid: 'UUID',
    uuidv4: 'UUIDv4',
    uuidv6: 'UUIDv6',
    nanoid: 'nanoid',
    guid: 'GUID',
    cuid: 'cuid',
    cuid2: 'cuid2',
    ulid: 'ULID',
    xid: 'XID',
    ksuid: 'KSUID',
    datetime: 'ISO 날짜시간',
    date: 'ISO 날짜',
    time: 'ISO 시간',
    duration: 'ISO 기간',
    ipv4: 'IPv4 주소',
    ipv6: 'IPv6 주소',
    cidrv4: 'IPv4 범위',
    cidrv6: 'IPv6 범위',
    base64: 'base64 인코딩 문자열',
    base64url: 'base64url 인코딩 문자열',
    json_string: 'JSON 문자열',
    e164: 'E.164 번호',
    jwt: 'JWT',
    template_literal: '입력'
  };
  const m = { nan: 'NaN' };
  return r => {
    switch (r.code) {
      case 'invalid_type': {
        const u = m[r.expected] ?? r.expected;
        const v = parsedType(r.input);
        const b = m[v] ?? v;
        if (/^[A-Z]/.test(r.expected)) {
          return `잘못된 입력: 예상 타입은 instanceof ${r.expected}, 받은 타입은 ${b}입니다`;
        }
        return `잘못된 입력: 예상 타입은 ${u}, 받은 타입은 ${b}입니다`;
      }
      case 'invalid_value':
        if (r.values.length === 1)
          return `잘못된 입력: 값은 ${stringifyPrimitive(r.values[0])} 이어야 합니다`;
        return `잘못된 옵션: ${joinValues(r.values, '또는 ')} 중 하나여야 합니다`;
      case 'too_big': {
        const u = r.inclusive ? '이하' : '미만';
        const m = u === '미만' ? '이어야 합니다' : '여야 합니다';
        const v = getSizing(r.origin);
        const b = v?.unit ?? '요소';
        if (v)
          return `${r.origin ?? '값'}이 너무 큽니다: ${r.maximum.toString()}${b} ${u}${m}`;
        return `${r.origin ?? '값'}이 너무 큽니다: ${r.maximum.toString()} ${u}${m}`;
      }
      case 'too_small': {
        const u = r.inclusive ? '이상' : '초과';
        const m = u === '이상' ? '이어야 합니다' : '여야 합니다';
        const v = getSizing(r.origin);
        const b = v?.unit ?? '요소';
        if (v) {
          return `${r.origin ?? '값'}이 너무 작습니다: ${r.minimum.toString()}${b} ${u}${m}`;
        }
        return `${r.origin ?? '값'}이 너무 작습니다: ${r.minimum.toString()} ${u}${m}`;
      }
      case 'invalid_format': {
        const m = r;
        if (m.format === 'starts_with') {
          return `잘못된 문자열: "${m.prefix}"(으)로 시작해야 합니다`;
        }
        if (m.format === 'ends_with')
          return `잘못된 문자열: "${m.suffix}"(으)로 끝나야 합니다`;
        if (m.format === 'includes')
          return `잘못된 문자열: "${m.includes}"을(를) 포함해야 합니다`;
        if (m.format === 'regex')
          return `잘못된 문자열: 정규식 ${m.pattern} 패턴과 일치해야 합니다`;
        return `잘못된 ${u[m.format] ?? r.format}`;
      }
      case 'not_multiple_of':
        return `잘못된 숫자: ${r.divisor}의 배수여야 합니다`;
      case 'unrecognized_keys':
        return `인식할 수 없는 키: ${joinValues(r.keys, ', ')}`;
      case 'invalid_key':
        return `잘못된 키: ${r.origin}`;
      case 'invalid_union':
        return `잘못된 입력`;
      case 'invalid_element':
        return `잘못된 값: ${r.origin}`;
      default:
        return `잘못된 입력`;
    }
  };
};
function ko() {
  return { localeError: ko_error() };
}
const capitalizeFirstCharacter = r => r.charAt(0).toUpperCase() + r.slice(1);
function getUnitTypeFromNumber(r) {
  const u = Math.abs(r);
  const m = u % 10;
  const v = u % 100;
  if ((v >= 11 && v <= 19) || m === 0) return 'many';
  if (m === 1) return 'one';
  return 'few';
}
const lt_error = () => {
  const r = {
    string: {
      unit: { one: 'simbolis', few: 'simboliai', many: 'simbolių' },
      verb: {
        smaller: {
          inclusive: 'turi būti ne ilgesnė kaip',
          notInclusive: 'turi būti trumpesnė kaip'
        },
        bigger: {
          inclusive: 'turi būti ne trumpesnė kaip',
          notInclusive: 'turi būti ilgesnė kaip'
        }
      }
    },
    file: {
      unit: { one: 'baitas', few: 'baitai', many: 'baitų' },
      verb: {
        smaller: {
          inclusive: 'turi būti ne didesnis kaip',
          notInclusive: 'turi būti mažesnis kaip'
        },
        bigger: {
          inclusive: 'turi būti ne mažesnis kaip',
          notInclusive: 'turi būti didesnis kaip'
        }
      }
    },
    array: {
      unit: { one: 'elementą', few: 'elementus', many: 'elementų' },
      verb: {
        smaller: {
          inclusive: 'turi turėti ne daugiau kaip',
          notInclusive: 'turi turėti mažiau kaip'
        },
        bigger: {
          inclusive: 'turi turėti ne mažiau kaip',
          notInclusive: 'turi turėti daugiau kaip'
        }
      }
    },
    set: {
      unit: { one: 'elementą', few: 'elementus', many: 'elementų' },
      verb: {
        smaller: {
          inclusive: 'turi turėti ne daugiau kaip',
          notInclusive: 'turi turėti mažiau kaip'
        },
        bigger: {
          inclusive: 'turi turėti ne mažiau kaip',
          notInclusive: 'turi turėti daugiau kaip'
        }
      }
    }
  };
  function getSizing(u, m, v, b) {
    const x = r[u] ?? null;
    if (x === null) return x;
    return { unit: x.unit[m], verb: x.verb[b][v ? 'inclusive' : 'notInclusive'] };
  }
  const u = {
    regex: 'įvestis',
    email: 'el. pašto adresas',
    url: 'URL',
    emoji: 'jaustukas',
    uuid: 'UUID',
    uuidv4: 'UUIDv4',
    uuidv6: 'UUIDv6',
    nanoid: 'nanoid',
    guid: 'GUID',
    cuid: 'cuid',
    cuid2: 'cuid2',
    ulid: 'ULID',
    xid: 'XID',
    ksuid: 'KSUID',
    datetime: 'ISO data ir laikas',
    date: 'ISO data',
    time: 'ISO laikas',
    duration: 'ISO trukmė',
    ipv4: 'IPv4 adresas',
    ipv6: 'IPv6 adresas',
    cidrv4: 'IPv4 tinklo prefiksas (CIDR)',
    cidrv6: 'IPv6 tinklo prefiksas (CIDR)',
    base64: 'base64 užkoduota eilutė',
    base64url: 'base64url užkoduota eilutė',
    json_string: 'JSON eilutė',
    e164: 'E.164 numeris',
    jwt: 'JWT',
    template_literal: 'įvestis'
  };
  const m = {
    nan: 'NaN',
    number: 'skaičius',
    bigint: 'sveikasis skaičius',
    string: 'eilutė',
    boolean: 'loginė reikšmė',
    undefined: 'neapibrėžta reikšmė',
    function: 'funkcija',
    symbol: 'simbolis',
    array: 'masyvas',
    object: 'objektas',
    null: 'nulinė reikšmė'
  };
  return r => {
    switch (r.code) {
      case 'invalid_type': {
        const u = m[r.expected] ?? r.expected;
        const v = parsedType(r.input);
        const b = m[v] ?? v;
        if (/^[A-Z]/.test(r.expected)) {
          return `Gautas tipas ${b}, o tikėtasi - instanceof ${r.expected}`;
        }
        return `Gautas tipas ${b}, o tikėtasi - ${u}`;
      }
      case 'invalid_value':
        if (r.values.length === 1) return `Privalo būti ${stringifyPrimitive(r.values[0])}`;
        return `Privalo būti vienas iš ${joinValues(r.values, '|')} pasirinkimų`;
      case 'too_big': {
        const u = m[r.origin] ?? r.origin;
        const v = getSizing(
          r.origin,
          getUnitTypeFromNumber(Number(r.maximum)),
          r.inclusive ?? false,
          'smaller'
        );
        if (v?.verb)
          return `${capitalizeFirstCharacter(u ?? r.origin ?? 'reikšmė')} ${v.verb} ${r.maximum.toString()} ${v.unit ?? 'elementų'}`;
        const b = r.inclusive ? 'ne didesnis kaip' : 'mažesnis kaip';
        return `${capitalizeFirstCharacter(u ?? r.origin ?? 'reikšmė')} turi būti ${b} ${r.maximum.toString()} ${v?.unit}`;
      }
      case 'too_small': {
        const u = m[r.origin] ?? r.origin;
        const v = getSizing(
          r.origin,
          getUnitTypeFromNumber(Number(r.minimum)),
          r.inclusive ?? false,
          'bigger'
        );
        if (v?.verb)
          return `${capitalizeFirstCharacter(u ?? r.origin ?? 'reikšmė')} ${v.verb} ${r.minimum.toString()} ${v.unit ?? 'elementų'}`;
        const b = r.inclusive ? 'ne mažesnis kaip' : 'didesnis kaip';
        return `${capitalizeFirstCharacter(u ?? r.origin ?? 'reikšmė')} turi būti ${b} ${r.minimum.toString()} ${v?.unit}`;
      }
      case 'invalid_format': {
        const m = r;
        if (m.format === 'starts_with') {
          return `Eilutė privalo prasidėti "${m.prefix}"`;
        }
        if (m.format === 'ends_with') return `Eilutė privalo pasibaigti "${m.suffix}"`;
        if (m.format === 'includes') return `Eilutė privalo įtraukti "${m.includes}"`;
        if (m.format === 'regex') return `Eilutė privalo atitikti ${m.pattern}`;
        return `Neteisingas ${u[m.format] ?? r.format}`;
      }
      case 'not_multiple_of':
        return `Skaičius privalo būti ${r.divisor} kartotinis.`;
      case 'unrecognized_keys':
        return `Neatpažint${r.keys.length > 1 ? 'i' : 'as'} rakt${r.keys.length > 1 ? 'ai' : 'as'}: ${joinValues(r.keys, ', ')}`;
      case 'invalid_key':
        return 'Rastas klaidingas raktas';
      case 'invalid_union':
        return 'Klaidinga įvestis';
      case 'invalid_element': {
        const u = m[r.origin] ?? r.origin;
        return `${capitalizeFirstCharacter(u ?? r.origin ?? 'reikšmė')} turi klaidingą įvestį`;
      }
      default:
        return 'Klaidinga įvestis';
    }
  };
};
function lt() {
  return { localeError: lt_error() };
}
const mk_error = () => {
  const r = {
    string: { unit: 'знаци', verb: 'да имаат' },
    file: { unit: 'бајти', verb: 'да имаат' },
    array: { unit: 'ставки', verb: 'да имаат' },
    set: { unit: 'ставки', verb: 'да имаат' }
  };
  function getSizing(u) {
    return r[u] ?? null;
  }
  const u = {
    regex: 'внес',
    email: 'адреса на е-пошта',
    url: 'URL',
    emoji: 'емоџи',
    uuid: 'UUID',
    uuidv4: 'UUIDv4',
    uuidv6: 'UUIDv6',
    nanoid: 'nanoid',
    guid: 'GUID',
    cuid: 'cuid',
    cuid2: 'cuid2',
    ulid: 'ULID',
    xid: 'XID',
    ksuid: 'KSUID',
    datetime: 'ISO датум и време',
    date: 'ISO датум',
    time: 'ISO време',
    duration: 'ISO времетраење',
    ipv4: 'IPv4 адреса',
    ipv6: 'IPv6 адреса',
    cidrv4: 'IPv4 опсег',
    cidrv6: 'IPv6 опсег',
    base64: 'base64-енкодирана низа',
    base64url: 'base64url-енкодирана низа',
    json_string: 'JSON низа',
    e164: 'E.164 број',
    jwt: 'JWT',
    template_literal: 'внес'
  };
  const m = { nan: 'NaN', number: 'број', array: 'низа' };
  return r => {
    switch (r.code) {
      case 'invalid_type': {
        const u = m[r.expected] ?? r.expected;
        const v = parsedType(r.input);
        const b = m[v] ?? v;
        if (/^[A-Z]/.test(r.expected)) {
          return `Грешен внес: се очекува instanceof ${r.expected}, примено ${b}`;
        }
        return `Грешен внес: се очекува ${u}, примено ${b}`;
      }
      case 'invalid_value':
        if (r.values.length === 1)
          return `Invalid input: expected ${stringifyPrimitive(r.values[0])}`;
        return `Грешана опција: се очекува една ${joinValues(r.values, '|')}`;
      case 'too_big': {
        const u = r.inclusive ? '<=' : '<';
        const m = getSizing(r.origin);
        if (m)
          return `Премногу голем: се очекува ${r.origin ?? 'вредноста'} да има ${u}${r.maximum.toString()} ${m.unit ?? 'елементи'}`;
        return `Премногу голем: се очекува ${r.origin ?? 'вредноста'} да биде ${u}${r.maximum.toString()}`;
      }
      case 'too_small': {
        const u = r.inclusive ? '>=' : '>';
        const m = getSizing(r.origin);
        if (m) {
          return `Премногу мал: се очекува ${r.origin} да има ${u}${r.minimum.toString()} ${m.unit}`;
        }
        return `Премногу мал: се очекува ${r.origin} да биде ${u}${r.minimum.toString()}`;
      }
      case 'invalid_format': {
        const m = r;
        if (m.format === 'starts_with') {
          return `Неважечка низа: мора да започнува со "${m.prefix}"`;
        }
        if (m.format === 'ends_with')
          return `Неважечка низа: мора да завршува со "${m.suffix}"`;
        if (m.format === 'includes') return `Неважечка низа: мора да вклучува "${m.includes}"`;
        if (m.format === 'regex')
          return `Неважечка низа: мора да одгоара на патернот ${m.pattern}`;
        return `Invalid ${u[m.format] ?? r.format}`;
      }
      case 'not_multiple_of':
        return `Грешен број: мора да биде делив со ${r.divisor}`;
      case 'unrecognized_keys':
        return `${r.keys.length > 1 ? 'Непрепознаени клучеви' : 'Непрепознаен клуч'}: ${joinValues(r.keys, ', ')}`;
      case 'invalid_key':
        return `Грешен клуч во ${r.origin}`;
      case 'invalid_union':
        return 'Грешен внес';
      case 'invalid_element':
        return `Грешна вредност во ${r.origin}`;
      default:
        return `Грешен внес`;
    }
  };
};
function mk() {
  return { localeError: mk_error() };
}
const ms_error = () => {
  const r = {
    string: { unit: 'aksara', verb: 'mempunyai' },
    file: { unit: 'bait', verb: 'mempunyai' },
    array: { unit: 'elemen', verb: 'mempunyai' },
    set: { unit: 'elemen', verb: 'mempunyai' }
  };
  function getSizing(u) {
    return r[u] ?? null;
  }
  const u = {
    regex: 'input',
    email: 'alamat e-mel',
    url: 'URL',
    emoji: 'emoji',
    uuid: 'UUID',
    uuidv4: 'UUIDv4',
    uuidv6: 'UUIDv6',
    nanoid: 'nanoid',
    guid: 'GUID',
    cuid: 'cuid',
    cuid2: 'cuid2',
    ulid: 'ULID',
    xid: 'XID',
    ksuid: 'KSUID',
    datetime: 'tarikh masa ISO',
    date: 'tarikh ISO',
    time: 'masa ISO',
    duration: 'tempoh ISO',
    ipv4: 'alamat IPv4',
    ipv6: 'alamat IPv6',
    cidrv4: 'julat IPv4',
    cidrv6: 'julat IPv6',
    base64: 'string dikodkan base64',
    base64url: 'string dikodkan base64url',
    json_string: 'string JSON',
    e164: 'nombor E.164',
    jwt: 'JWT',
    template_literal: 'input'
  };
  const m = { nan: 'NaN', number: 'nombor' };
  return r => {
    switch (r.code) {
      case 'invalid_type': {
        const u = m[r.expected] ?? r.expected;
        const v = parsedType(r.input);
        const b = m[v] ?? v;
        if (/^[A-Z]/.test(r.expected)) {
          return `Input tidak sah: dijangka instanceof ${r.expected}, diterima ${b}`;
        }
        return `Input tidak sah: dijangka ${u}, diterima ${b}`;
      }
      case 'invalid_value':
        if (r.values.length === 1)
          return `Input tidak sah: dijangka ${stringifyPrimitive(r.values[0])}`;
        return `Pilihan tidak sah: dijangka salah satu daripada ${joinValues(r.values, '|')}`;
      case 'too_big': {
        const u = r.inclusive ? '<=' : '<';
        const m = getSizing(r.origin);
        if (m)
          return `Terlalu besar: dijangka ${r.origin ?? 'nilai'} ${m.verb} ${u}${r.maximum.toString()} ${m.unit ?? 'elemen'}`;
        return `Terlalu besar: dijangka ${r.origin ?? 'nilai'} adalah ${u}${r.maximum.toString()}`;
      }
      case 'too_small': {
        const u = r.inclusive ? '>=' : '>';
        const m = getSizing(r.origin);
        if (m) {
          return `Terlalu kecil: dijangka ${r.origin} ${m.verb} ${u}${r.minimum.toString()} ${m.unit}`;
        }
        return `Terlalu kecil: dijangka ${r.origin} adalah ${u}${r.minimum.toString()}`;
      }
      case 'invalid_format': {
        const m = r;
        if (m.format === 'starts_with')
          return `String tidak sah: mesti bermula dengan "${m.prefix}"`;
        if (m.format === 'ends_with')
          return `String tidak sah: mesti berakhir dengan "${m.suffix}"`;
        if (m.format === 'includes')
          return `String tidak sah: mesti mengandungi "${m.includes}"`;
        if (m.format === 'regex')
          return `String tidak sah: mesti sepadan dengan corak ${m.pattern}`;
        return `${u[m.format] ?? r.format} tidak sah`;
      }
      case 'not_multiple_of':
        return `Nombor tidak sah: perlu gandaan ${r.divisor}`;
      case 'unrecognized_keys':
        return `Kunci tidak dikenali: ${joinValues(r.keys, ', ')}`;
      case 'invalid_key':
        return `Kunci tidak sah dalam ${r.origin}`;
      case 'invalid_union':
        return 'Input tidak sah';
      case 'invalid_element':
        return `Nilai tidak sah dalam ${r.origin}`;
      default:
        return `Input tidak sah`;
    }
  };
};
function ms() {
  return { localeError: ms_error() };
}
const nl_error = () => {
  const r = {
    string: { unit: 'tekens', verb: 'heeft' },
    file: { unit: 'bytes', verb: 'heeft' },
    array: { unit: 'elementen', verb: 'heeft' },
    set: { unit: 'elementen', verb: 'heeft' }
  };
  function getSizing(u) {
    return r[u] ?? null;
  }
  const u = {
    regex: 'invoer',
    email: 'emailadres',
    url: 'URL',
    emoji: 'emoji',
    uuid: 'UUID',
    uuidv4: 'UUIDv4',
    uuidv6: 'UUIDv6',
    nanoid: 'nanoid',
    guid: 'GUID',
    cuid: 'cuid',
    cuid2: 'cuid2',
    ulid: 'ULID',
    xid: 'XID',
    ksuid: 'KSUID',
    datetime: 'ISO datum en tijd',
    date: 'ISO datum',
    time: 'ISO tijd',
    duration: 'ISO duur',
    ipv4: 'IPv4-adres',
    ipv6: 'IPv6-adres',
    cidrv4: 'IPv4-bereik',
    cidrv6: 'IPv6-bereik',
    base64: 'base64-gecodeerde tekst',
    base64url: 'base64 URL-gecodeerde tekst',
    json_string: 'JSON string',
    e164: 'E.164-nummer',
    jwt: 'JWT',
    template_literal: 'invoer'
  };
  const m = { nan: 'NaN', number: 'getal' };
  return r => {
    switch (r.code) {
      case 'invalid_type': {
        const u = m[r.expected] ?? r.expected;
        const v = parsedType(r.input);
        const b = m[v] ?? v;
        if (/^[A-Z]/.test(r.expected)) {
          return `Ongeldige invoer: verwacht instanceof ${r.expected}, ontving ${b}`;
        }
        return `Ongeldige invoer: verwacht ${u}, ontving ${b}`;
      }
      case 'invalid_value':
        if (r.values.length === 1)
          return `Ongeldige invoer: verwacht ${stringifyPrimitive(r.values[0])}`;
        return `Ongeldige optie: verwacht één van ${joinValues(r.values, '|')}`;
      case 'too_big': {
        const u = r.inclusive ? '<=' : '<';
        const m = getSizing(r.origin);
        const v = r.origin === 'date' ? 'laat' : r.origin === 'string' ? 'lang' : 'groot';
        if (m)
          return `Te ${v}: verwacht dat ${r.origin ?? 'waarde'} ${u}${r.maximum.toString()} ${m.unit ?? 'elementen'} ${m.verb}`;
        return `Te ${v}: verwacht dat ${r.origin ?? 'waarde'} ${u}${r.maximum.toString()} is`;
      }
      case 'too_small': {
        const u = r.inclusive ? '>=' : '>';
        const m = getSizing(r.origin);
        const v = r.origin === 'date' ? 'vroeg' : r.origin === 'string' ? 'kort' : 'klein';
        if (m) {
          return `Te ${v}: verwacht dat ${r.origin} ${u}${r.minimum.toString()} ${m.unit} ${m.verb}`;
        }
        return `Te ${v}: verwacht dat ${r.origin} ${u}${r.minimum.toString()} is`;
      }
      case 'invalid_format': {
        const m = r;
        if (m.format === 'starts_with') {
          return `Ongeldige tekst: moet met "${m.prefix}" beginnen`;
        }
        if (m.format === 'ends_with') return `Ongeldige tekst: moet op "${m.suffix}" eindigen`;
        if (m.format === 'includes') return `Ongeldige tekst: moet "${m.includes}" bevatten`;
        if (m.format === 'regex')
          return `Ongeldige tekst: moet overeenkomen met patroon ${m.pattern}`;
        return `Ongeldig: ${u[m.format] ?? r.format}`;
      }
      case 'not_multiple_of':
        return `Ongeldig getal: moet een veelvoud van ${r.divisor} zijn`;
      case 'unrecognized_keys':
        return `Onbekende key${r.keys.length > 1 ? 's' : ''}: ${joinValues(r.keys, ', ')}`;
      case 'invalid_key':
        return `Ongeldige key in ${r.origin}`;
      case 'invalid_union':
        return 'Ongeldige invoer';
      case 'invalid_element':
        return `Ongeldige waarde in ${r.origin}`;
      default:
        return `Ongeldige invoer`;
    }
  };
};
function nl() {
  return { localeError: nl_error() };
}
const no_error = () => {
  const r = {
    string: { unit: 'tegn', verb: 'å ha' },
    file: { unit: 'bytes', verb: 'å ha' },
    array: { unit: 'elementer', verb: 'å inneholde' },
    set: { unit: 'elementer', verb: 'å inneholde' }
  };
  function getSizing(u) {
    return r[u] ?? null;
  }
  const u = {
    regex: 'input',
    email: 'e-postadresse',
    url: 'URL',
    emoji: 'emoji',
    uuid: 'UUID',
    uuidv4: 'UUIDv4',
    uuidv6: 'UUIDv6',
    nanoid: 'nanoid',
    guid: 'GUID',
    cuid: 'cuid',
    cuid2: 'cuid2',
    ulid: 'ULID',
    xid: 'XID',
    ksuid: 'KSUID',
    datetime: 'ISO dato- og klokkeslett',
    date: 'ISO-dato',
    time: 'ISO-klokkeslett',
    duration: 'ISO-varighet',
    ipv4: 'IPv4-område',
    ipv6: 'IPv6-område',
    cidrv4: 'IPv4-spekter',
    cidrv6: 'IPv6-spekter',
    base64: 'base64-enkodet streng',
    base64url: 'base64url-enkodet streng',
    json_string: 'JSON-streng',
    e164: 'E.164-nummer',
    jwt: 'JWT',
    template_literal: 'input'
  };
  const m = { nan: 'NaN', number: 'tall', array: 'liste' };
  return r => {
    switch (r.code) {
      case 'invalid_type': {
        const u = m[r.expected] ?? r.expected;
        const v = parsedType(r.input);
        const b = m[v] ?? v;
        if (/^[A-Z]/.test(r.expected)) {
          return `Ugyldig input: forventet instanceof ${r.expected}, fikk ${b}`;
        }
        return `Ugyldig input: forventet ${u}, fikk ${b}`;
      }
      case 'invalid_value':
        if (r.values.length === 1)
          return `Ugyldig verdi: forventet ${stringifyPrimitive(r.values[0])}`;
        return `Ugyldig valg: forventet en av ${joinValues(r.values, '|')}`;
      case 'too_big': {
        const u = r.inclusive ? '<=' : '<';
        const m = getSizing(r.origin);
        if (m)
          return `For stor(t): forventet ${r.origin ?? 'value'} til å ha ${u}${r.maximum.toString()} ${m.unit ?? 'elementer'}`;
        return `For stor(t): forventet ${r.origin ?? 'value'} til å ha ${u}${r.maximum.toString()}`;
      }
      case 'too_small': {
        const u = r.inclusive ? '>=' : '>';
        const m = getSizing(r.origin);
        if (m) {
          return `For lite(n): forventet ${r.origin} til å ha ${u}${r.minimum.toString()} ${m.unit}`;
        }
        return `For lite(n): forventet ${r.origin} til å ha ${u}${r.minimum.toString()}`;
      }
      case 'invalid_format': {
        const m = r;
        if (m.format === 'starts_with') return `Ugyldig streng: må starte med "${m.prefix}"`;
        if (m.format === 'ends_with') return `Ugyldig streng: må ende med "${m.suffix}"`;
        if (m.format === 'includes') return `Ugyldig streng: må inneholde "${m.includes}"`;
        if (m.format === 'regex') return `Ugyldig streng: må matche mønsteret ${m.pattern}`;
        return `Ugyldig ${u[m.format] ?? r.format}`;
      }
      case 'not_multiple_of':
        return `Ugyldig tall: må være et multiplum av ${r.divisor}`;
      case 'unrecognized_keys':
        return `${r.keys.length > 1 ? 'Ukjente nøkler' : 'Ukjent nøkkel'}: ${joinValues(r.keys, ', ')}`;
      case 'invalid_key':
        return `Ugyldig nøkkel i ${r.origin}`;
      case 'invalid_union':
        return 'Ugyldig input';
      case 'invalid_element':
        return `Ugyldig verdi i ${r.origin}`;
      default:
        return `Ugyldig input`;
    }
  };
};
function no() {
  return { localeError: no_error() };
}
const ota_error = () => {
  const r = {
    string: { unit: 'harf', verb: 'olmalıdır' },
    file: { unit: 'bayt', verb: 'olmalıdır' },
    array: { unit: 'unsur', verb: 'olmalıdır' },
    set: { unit: 'unsur', verb: 'olmalıdır' }
  };
  function getSizing(u) {
    return r[u] ?? null;
  }
  const u = {
    regex: 'giren',
    email: 'epostagâh',
    url: 'URL',
    emoji: 'emoji',
    uuid: 'UUID',
    uuidv4: 'UUIDv4',
    uuidv6: 'UUIDv6',
    nanoid: 'nanoid',
    guid: 'GUID',
    cuid: 'cuid',
    cuid2: 'cuid2',
    ulid: 'ULID',
    xid: 'XID',
    ksuid: 'KSUID',
    datetime: 'ISO hengâmı',
    date: 'ISO tarihi',
    time: 'ISO zamanı',
    duration: 'ISO müddeti',
    ipv4: 'IPv4 nişânı',
    ipv6: 'IPv6 nişânı',
    cidrv4: 'IPv4 menzili',
    cidrv6: 'IPv6 menzili',
    base64: 'base64-şifreli metin',
    base64url: 'base64url-şifreli metin',
    json_string: 'JSON metin',
    e164: 'E.164 sayısı',
    jwt: 'JWT',
    template_literal: 'giren'
  };
  const m = { nan: 'NaN', number: 'numara', array: 'saf', null: 'gayb' };
  return r => {
    switch (r.code) {
      case 'invalid_type': {
        const u = m[r.expected] ?? r.expected;
        const v = parsedType(r.input);
        const b = m[v] ?? v;
        if (/^[A-Z]/.test(r.expected)) {
          return `Fâsit giren: umulan instanceof ${r.expected}, alınan ${b}`;
        }
        return `Fâsit giren: umulan ${u}, alınan ${b}`;
      }
      case 'invalid_value':
        if (r.values.length === 1)
          return `Fâsit giren: umulan ${stringifyPrimitive(r.values[0])}`;
        return `Fâsit tercih: mûteberler ${joinValues(r.values, '|')}`;
      case 'too_big': {
        const u = r.inclusive ? '<=' : '<';
        const m = getSizing(r.origin);
        if (m)
          return `Fazla büyük: ${r.origin ?? 'value'}, ${u}${r.maximum.toString()} ${m.unit ?? 'elements'} sahip olmalıydı.`;
        return `Fazla büyük: ${r.origin ?? 'value'}, ${u}${r.maximum.toString()} olmalıydı.`;
      }
      case 'too_small': {
        const u = r.inclusive ? '>=' : '>';
        const m = getSizing(r.origin);
        if (m) {
          return `Fazla küçük: ${r.origin}, ${u}${r.minimum.toString()} ${m.unit} sahip olmalıydı.`;
        }
        return `Fazla küçük: ${r.origin}, ${u}${r.minimum.toString()} olmalıydı.`;
      }
      case 'invalid_format': {
        const m = r;
        if (m.format === 'starts_with') return `Fâsit metin: "${m.prefix}" ile başlamalı.`;
        if (m.format === 'ends_with') return `Fâsit metin: "${m.suffix}" ile bitmeli.`;
        if (m.format === 'includes') return `Fâsit metin: "${m.includes}" ihtivâ etmeli.`;
        if (m.format === 'regex') return `Fâsit metin: ${m.pattern} nakşına uymalı.`;
        return `Fâsit ${u[m.format] ?? r.format}`;
      }
      case 'not_multiple_of':
        return `Fâsit sayı: ${r.divisor} katı olmalıydı.`;
      case 'unrecognized_keys':
        return `Tanınmayan anahtar ${r.keys.length > 1 ? 's' : ''}: ${joinValues(r.keys, ', ')}`;
      case 'invalid_key':
        return `${r.origin} için tanınmayan anahtar var.`;
      case 'invalid_union':
        return 'Giren tanınamadı.';
      case 'invalid_element':
        return `${r.origin} için tanınmayan kıymet var.`;
      default:
        return `Kıymet tanınamadı.`;
    }
  };
};
function ota() {
  return { localeError: ota_error() };
}
const ps_error = () => {
  const r = {
    string: { unit: 'توکي', verb: 'ولري' },
    file: { unit: 'بایټس', verb: 'ولري' },
    array: { unit: 'توکي', verb: 'ولري' },
    set: { unit: 'توکي', verb: 'ولري' }
  };
  function getSizing(u) {
    return r[u] ?? null;
  }
  const u = {
    regex: 'ورودي',
    email: 'بریښنالیک',
    url: 'یو آر ال',
    emoji: 'ایموجي',
    uuid: 'UUID',
    uuidv4: 'UUIDv4',
    uuidv6: 'UUIDv6',
    nanoid: 'nanoid',
    guid: 'GUID',
    cuid: 'cuid',
    cuid2: 'cuid2',
    ulid: 'ULID',
    xid: 'XID',
    ksuid: 'KSUID',
    datetime: 'نیټه او وخت',
    date: 'نېټه',
    time: 'وخت',
    duration: 'موده',
    ipv4: 'د IPv4 پته',
    ipv6: 'د IPv6 پته',
    cidrv4: 'د IPv4 ساحه',
    cidrv6: 'د IPv6 ساحه',
    base64: 'base64-encoded متن',
    base64url: 'base64url-encoded متن',
    json_string: 'JSON متن',
    e164: 'د E.164 شمېره',
    jwt: 'JWT',
    template_literal: 'ورودي'
  };
  const m = { nan: 'NaN', number: 'عدد', array: 'ارې' };
  return r => {
    switch (r.code) {
      case 'invalid_type': {
        const u = m[r.expected] ?? r.expected;
        const v = parsedType(r.input);
        const b = m[v] ?? v;
        if (/^[A-Z]/.test(r.expected)) {
          return `ناسم ورودي: باید instanceof ${r.expected} وای, مګر ${b} ترلاسه شو`;
        }
        return `ناسم ورودي: باید ${u} وای, مګر ${b} ترلاسه شو`;
      }
      case 'invalid_value':
        if (r.values.length === 1) {
          return `ناسم ورودي: باید ${stringifyPrimitive(r.values[0])} وای`;
        }
        return `ناسم انتخاب: باید یو له ${joinValues(r.values, '|')} څخه وای`;
      case 'too_big': {
        const u = r.inclusive ? '<=' : '<';
        const m = getSizing(r.origin);
        if (m) {
          return `ډیر لوی: ${r.origin ?? 'ارزښت'} باید ${u}${r.maximum.toString()} ${m.unit ?? 'عنصرونه'} ولري`;
        }
        return `ډیر لوی: ${r.origin ?? 'ارزښت'} باید ${u}${r.maximum.toString()} وي`;
      }
      case 'too_small': {
        const u = r.inclusive ? '>=' : '>';
        const m = getSizing(r.origin);
        if (m) {
          return `ډیر کوچنی: ${r.origin} باید ${u}${r.minimum.toString()} ${m.unit} ولري`;
        }
        return `ډیر کوچنی: ${r.origin} باید ${u}${r.minimum.toString()} وي`;
      }
      case 'invalid_format': {
        const m = r;
        if (m.format === 'starts_with') {
          return `ناسم متن: باید د "${m.prefix}" سره پیل شي`;
        }
        if (m.format === 'ends_with') {
          return `ناسم متن: باید د "${m.suffix}" سره پای ته ورسيږي`;
        }
        if (m.format === 'includes') {
          return `ناسم متن: باید "${m.includes}" ولري`;
        }
        if (m.format === 'regex') {
          return `ناسم متن: باید د ${m.pattern} سره مطابقت ولري`;
        }
        return `${u[m.format] ?? r.format} ناسم دی`;
      }
      case 'not_multiple_of':
        return `ناسم عدد: باید د ${r.divisor} مضرب وي`;
      case 'unrecognized_keys':
        return `ناسم ${r.keys.length > 1 ? 'کلیډونه' : 'کلیډ'}: ${joinValues(r.keys, ', ')}`;
      case 'invalid_key':
        return `ناسم کلیډ په ${r.origin} کې`;
      case 'invalid_union':
        return `ناسمه ورودي`;
      case 'invalid_element':
        return `ناسم عنصر په ${r.origin} کې`;
      default:
        return `ناسمه ورودي`;
    }
  };
};
function ps() {
  return { localeError: ps_error() };
}
const pl_error = () => {
  const r = {
    string: { unit: 'znaków', verb: 'mieć' },
    file: { unit: 'bajtów', verb: 'mieć' },
    array: { unit: 'elementów', verb: 'mieć' },
    set: { unit: 'elementów', verb: 'mieć' }
  };
  function getSizing(u) {
    return r[u] ?? null;
  }
  const u = {
    regex: 'wyrażenie',
    email: 'adres email',
    url: 'URL',
    emoji: 'emoji',
    uuid: 'UUID',
    uuidv4: 'UUIDv4',
    uuidv6: 'UUIDv6',
    nanoid: 'nanoid',
    guid: 'GUID',
    cuid: 'cuid',
    cuid2: 'cuid2',
    ulid: 'ULID',
    xid: 'XID',
    ksuid: 'KSUID',
    datetime: 'data i godzina w formacie ISO',
    date: 'data w formacie ISO',
    time: 'godzina w formacie ISO',
    duration: 'czas trwania ISO',
    ipv4: 'adres IPv4',
    ipv6: 'adres IPv6',
    cidrv4: 'zakres IPv4',
    cidrv6: 'zakres IPv6',
    base64: 'ciąg znaków zakodowany w formacie base64',
    base64url: 'ciąg znaków zakodowany w formacie base64url',
    json_string: 'ciąg znaków w formacie JSON',
    e164: 'liczba E.164',
    jwt: 'JWT',
    template_literal: 'wejście'
  };
  const m = { nan: 'NaN', number: 'liczba', array: 'tablica' };
  return r => {
    switch (r.code) {
      case 'invalid_type': {
        const u = m[r.expected] ?? r.expected;
        const v = parsedType(r.input);
        const b = m[v] ?? v;
        if (/^[A-Z]/.test(r.expected)) {
          return `Nieprawidłowe dane wejściowe: oczekiwano instanceof ${r.expected}, otrzymano ${b}`;
        }
        return `Nieprawidłowe dane wejściowe: oczekiwano ${u}, otrzymano ${b}`;
      }
      case 'invalid_value':
        if (r.values.length === 1)
          return `Nieprawidłowe dane wejściowe: oczekiwano ${stringifyPrimitive(r.values[0])}`;
        return `Nieprawidłowa opcja: oczekiwano jednej z wartości ${joinValues(r.values, '|')}`;
      case 'too_big': {
        const u = r.inclusive ? '<=' : '<';
        const m = getSizing(r.origin);
        if (m) {
          return `Za duża wartość: oczekiwano, że ${r.origin ?? 'wartość'} będzie mieć ${u}${r.maximum.toString()} ${m.unit ?? 'elementów'}`;
        }
        return `Zbyt duż(y/a/e): oczekiwano, że ${r.origin ?? 'wartość'} będzie wynosić ${u}${r.maximum.toString()}`;
      }
      case 'too_small': {
        const u = r.inclusive ? '>=' : '>';
        const m = getSizing(r.origin);
        if (m) {
          return `Za mała wartość: oczekiwano, że ${r.origin ?? 'wartość'} będzie mieć ${u}${r.minimum.toString()} ${m.unit ?? 'elementów'}`;
        }
        return `Zbyt mał(y/a/e): oczekiwano, że ${r.origin ?? 'wartość'} będzie wynosić ${u}${r.minimum.toString()}`;
      }
      case 'invalid_format': {
        const m = r;
        if (m.format === 'starts_with')
          return `Nieprawidłowy ciąg znaków: musi zaczynać się od "${m.prefix}"`;
        if (m.format === 'ends_with')
          return `Nieprawidłowy ciąg znaków: musi kończyć się na "${m.suffix}"`;
        if (m.format === 'includes')
          return `Nieprawidłowy ciąg znaków: musi zawierać "${m.includes}"`;
        if (m.format === 'regex')
          return `Nieprawidłowy ciąg znaków: musi odpowiadać wzorcowi ${m.pattern}`;
        return `Nieprawidłow(y/a/e) ${u[m.format] ?? r.format}`;
      }
      case 'not_multiple_of':
        return `Nieprawidłowa liczba: musi być wielokrotnością ${r.divisor}`;
      case 'unrecognized_keys':
        return `Nierozpoznane klucze${r.keys.length > 1 ? 's' : ''}: ${joinValues(r.keys, ', ')}`;
      case 'invalid_key':
        return `Nieprawidłowy klucz w ${r.origin}`;
      case 'invalid_union':
        return 'Nieprawidłowe dane wejściowe';
      case 'invalid_element':
        return `Nieprawidłowa wartość w ${r.origin}`;
      default:
        return `Nieprawidłowe dane wejściowe`;
    }
  };
};
function pl() {
  return { localeError: pl_error() };
}
const pt_error = () => {
  const r = {
    string: { unit: 'caracteres', verb: 'ter' },
    file: { unit: 'bytes', verb: 'ter' },
    array: { unit: 'itens', verb: 'ter' },
    set: { unit: 'itens', verb: 'ter' }
  };
  function getSizing(u) {
    return r[u] ?? null;
  }
  const u = {
    regex: 'padrão',
    email: 'endereço de e-mail',
    url: 'URL',
    emoji: 'emoji',
    uuid: 'UUID',
    uuidv4: 'UUIDv4',
    uuidv6: 'UUIDv6',
    nanoid: 'nanoid',
    guid: 'GUID',
    cuid: 'cuid',
    cuid2: 'cuid2',
    ulid: 'ULID',
    xid: 'XID',
    ksuid: 'KSUID',
    datetime: 'data e hora ISO',
    date: 'data ISO',
    time: 'hora ISO',
    duration: 'duração ISO',
    ipv4: 'endereço IPv4',
    ipv6: 'endereço IPv6',
    cidrv4: 'faixa de IPv4',
    cidrv6: 'faixa de IPv6',
    base64: 'texto codificado em base64',
    base64url: 'URL codificada em base64',
    json_string: 'texto JSON',
    e164: 'número E.164',
    jwt: 'JWT',
    template_literal: 'entrada'
  };
  const m = { nan: 'NaN', number: 'número', null: 'nulo' };
  return r => {
    switch (r.code) {
      case 'invalid_type': {
        const u = m[r.expected] ?? r.expected;
        const v = parsedType(r.input);
        const b = m[v] ?? v;
        if (/^[A-Z]/.test(r.expected)) {
          return `Tipo inválido: esperado instanceof ${r.expected}, recebido ${b}`;
        }
        return `Tipo inválido: esperado ${u}, recebido ${b}`;
      }
      case 'invalid_value':
        if (r.values.length === 1)
          return `Entrada inválida: esperado ${stringifyPrimitive(r.values[0])}`;
        return `Opção inválida: esperada uma das ${joinValues(r.values, '|')}`;
      case 'too_big': {
        const u = r.inclusive ? '<=' : '<';
        const m = getSizing(r.origin);
        if (m)
          return `Muito grande: esperado que ${r.origin ?? 'valor'} tivesse ${u}${r.maximum.toString()} ${m.unit ?? 'elementos'}`;
        return `Muito grande: esperado que ${r.origin ?? 'valor'} fosse ${u}${r.maximum.toString()}`;
      }
      case 'too_small': {
        const u = r.inclusive ? '>=' : '>';
        const m = getSizing(r.origin);
        if (m) {
          return `Muito pequeno: esperado que ${r.origin} tivesse ${u}${r.minimum.toString()} ${m.unit}`;
        }
        return `Muito pequeno: esperado que ${r.origin} fosse ${u}${r.minimum.toString()}`;
      }
      case 'invalid_format': {
        const m = r;
        if (m.format === 'starts_with')
          return `Texto inválido: deve começar com "${m.prefix}"`;
        if (m.format === 'ends_with') return `Texto inválido: deve terminar com "${m.suffix}"`;
        if (m.format === 'includes') return `Texto inválido: deve incluir "${m.includes}"`;
        if (m.format === 'regex')
          return `Texto inválido: deve corresponder ao padrão ${m.pattern}`;
        return `${u[m.format] ?? r.format} inválido`;
      }
      case 'not_multiple_of':
        return `Número inválido: deve ser múltiplo de ${r.divisor}`;
      case 'unrecognized_keys':
        return `Chave${r.keys.length > 1 ? 's' : ''} desconhecida${r.keys.length > 1 ? 's' : ''}: ${joinValues(r.keys, ', ')}`;
      case 'invalid_key':
        return `Chave inválida em ${r.origin}`;
      case 'invalid_union':
        return 'Entrada inválida';
      case 'invalid_element':
        return `Valor inválido em ${r.origin}`;
      default:
        return `Campo inválido`;
    }
  };
};
function pt() {
  return { localeError: pt_error() };
}
function getRussianPlural(r, u, m, v) {
  const b = Math.abs(r);
  const x = b % 10;
  const w = b % 100;
  if (w >= 11 && w <= 19) {
    return v;
  }
  if (x === 1) {
    return u;
  }
  if (x >= 2 && x <= 4) {
    return m;
  }
  return v;
}
const ru_error = () => {
  const r = {
    string: { unit: { one: 'символ', few: 'символа', many: 'символов' }, verb: 'иметь' },
    file: { unit: { one: 'байт', few: 'байта', many: 'байт' }, verb: 'иметь' },
    array: { unit: { one: 'элемент', few: 'элемента', many: 'элементов' }, verb: 'иметь' },
    set: { unit: { one: 'элемент', few: 'элемента', many: 'элементов' }, verb: 'иметь' }
  };
  function getSizing(u) {
    return r[u] ?? null;
  }
  const u = {
    regex: 'ввод',
    email: 'email адрес',
    url: 'URL',
    emoji: 'эмодзи',
    uuid: 'UUID',
    uuidv4: 'UUIDv4',
    uuidv6: 'UUIDv6',
    nanoid: 'nanoid',
    guid: 'GUID',
    cuid: 'cuid',
    cuid2: 'cuid2',
    ulid: 'ULID',
    xid: 'XID',
    ksuid: 'KSUID',
    datetime: 'ISO дата и время',
    date: 'ISO дата',
    time: 'ISO время',
    duration: 'ISO длительность',
    ipv4: 'IPv4 адрес',
    ipv6: 'IPv6 адрес',
    cidrv4: 'IPv4 диапазон',
    cidrv6: 'IPv6 диапазон',
    base64: 'строка в формате base64',
    base64url: 'строка в формате base64url',
    json_string: 'JSON строка',
    e164: 'номер E.164',
    jwt: 'JWT',
    template_literal: 'ввод'
  };
  const m = { nan: 'NaN', number: 'число', array: 'массив' };
  return r => {
    switch (r.code) {
      case 'invalid_type': {
        const u = m[r.expected] ?? r.expected;
        const v = parsedType(r.input);
        const b = m[v] ?? v;
        if (/^[A-Z]/.test(r.expected)) {
          return `Неверный ввод: ожидалось instanceof ${r.expected}, получено ${b}`;
        }
        return `Неверный ввод: ожидалось ${u}, получено ${b}`;
      }
      case 'invalid_value':
        if (r.values.length === 1)
          return `Неверный ввод: ожидалось ${stringifyPrimitive(r.values[0])}`;
        return `Неверный вариант: ожидалось одно из ${joinValues(r.values, '|')}`;
      case 'too_big': {
        const u = r.inclusive ? '<=' : '<';
        const m = getSizing(r.origin);
        if (m) {
          const v = Number(r.maximum);
          const b = getRussianPlural(v, m.unit.one, m.unit.few, m.unit.many);
          return `Слишком большое значение: ожидалось, что ${r.origin ?? 'значение'} будет иметь ${u}${r.maximum.toString()} ${b}`;
        }
        return `Слишком большое значение: ожидалось, что ${r.origin ?? 'значение'} будет ${u}${r.maximum.toString()}`;
      }
      case 'too_small': {
        const u = r.inclusive ? '>=' : '>';
        const m = getSizing(r.origin);
        if (m) {
          const v = Number(r.minimum);
          const b = getRussianPlural(v, m.unit.one, m.unit.few, m.unit.many);
          return `Слишком маленькое значение: ожидалось, что ${r.origin} будет иметь ${u}${r.minimum.toString()} ${b}`;
        }
        return `Слишком маленькое значение: ожидалось, что ${r.origin} будет ${u}${r.minimum.toString()}`;
      }
      case 'invalid_format': {
        const m = r;
        if (m.format === 'starts_with')
          return `Неверная строка: должна начинаться с "${m.prefix}"`;
        if (m.format === 'ends_with')
          return `Неверная строка: должна заканчиваться на "${m.suffix}"`;
        if (m.format === 'includes')
          return `Неверная строка: должна содержать "${m.includes}"`;
        if (m.format === 'regex')
          return `Неверная строка: должна соответствовать шаблону ${m.pattern}`;
        return `Неверный ${u[m.format] ?? r.format}`;
      }
      case 'not_multiple_of':
        return `Неверное число: должно быть кратным ${r.divisor}`;
      case 'unrecognized_keys':
        return `Нераспознанн${r.keys.length > 1 ? 'ые' : 'ый'} ключ${r.keys.length > 1 ? 'и' : ''}: ${joinValues(r.keys, ', ')}`;
      case 'invalid_key':
        return `Неверный ключ в ${r.origin}`;
      case 'invalid_union':
        return 'Неверные входные данные';
      case 'invalid_element':
        return `Неверное значение в ${r.origin}`;
      default:
        return `Неверные входные данные`;
    }
  };
};
function ru() {
  return { localeError: ru_error() };
}
const sl_error = () => {
  const r = {
    string: { unit: 'znakov', verb: 'imeti' },
    file: { unit: 'bajtov', verb: 'imeti' },
    array: { unit: 'elementov', verb: 'imeti' },
    set: { unit: 'elementov', verb: 'imeti' }
  };
  function getSizing(u) {
    return r[u] ?? null;
  }
  const u = {
    regex: 'vnos',
    email: 'e-poštni naslov',
    url: 'URL',
    emoji: 'emoji',
    uuid: 'UUID',
    uuidv4: 'UUIDv4',
    uuidv6: 'UUIDv6',
    nanoid: 'nanoid',
    guid: 'GUID',
    cuid: 'cuid',
    cuid2: 'cuid2',
    ulid: 'ULID',
    xid: 'XID',
    ksuid: 'KSUID',
    datetime: 'ISO datum in čas',
    date: 'ISO datum',
    time: 'ISO čas',
    duration: 'ISO trajanje',
    ipv4: 'IPv4 naslov',
    ipv6: 'IPv6 naslov',
    cidrv4: 'obseg IPv4',
    cidrv6: 'obseg IPv6',
    base64: 'base64 kodiran niz',
    base64url: 'base64url kodiran niz',
    json_string: 'JSON niz',
    e164: 'E.164 številka',
    jwt: 'JWT',
    template_literal: 'vnos'
  };
  const m = { nan: 'NaN', number: 'število', array: 'tabela' };
  return r => {
    switch (r.code) {
      case 'invalid_type': {
        const u = m[r.expected] ?? r.expected;
        const v = parsedType(r.input);
        const b = m[v] ?? v;
        if (/^[A-Z]/.test(r.expected)) {
          return `Neveljaven vnos: pričakovano instanceof ${r.expected}, prejeto ${b}`;
        }
        return `Neveljaven vnos: pričakovano ${u}, prejeto ${b}`;
      }
      case 'invalid_value':
        if (r.values.length === 1)
          return `Neveljaven vnos: pričakovano ${stringifyPrimitive(r.values[0])}`;
        return `Neveljavna možnost: pričakovano eno izmed ${joinValues(r.values, '|')}`;
      case 'too_big': {
        const u = r.inclusive ? '<=' : '<';
        const m = getSizing(r.origin);
        if (m)
          return `Preveliko: pričakovano, da bo ${r.origin ?? 'vrednost'} imelo ${u}${r.maximum.toString()} ${m.unit ?? 'elementov'}`;
        return `Preveliko: pričakovano, da bo ${r.origin ?? 'vrednost'} ${u}${r.maximum.toString()}`;
      }
      case 'too_small': {
        const u = r.inclusive ? '>=' : '>';
        const m = getSizing(r.origin);
        if (m) {
          return `Premajhno: pričakovano, da bo ${r.origin} imelo ${u}${r.minimum.toString()} ${m.unit}`;
        }
        return `Premajhno: pričakovano, da bo ${r.origin} ${u}${r.minimum.toString()}`;
      }
      case 'invalid_format': {
        const m = r;
        if (m.format === 'starts_with') {
          return `Neveljaven niz: mora se začeti z "${m.prefix}"`;
        }
        if (m.format === 'ends_with') return `Neveljaven niz: mora se končati z "${m.suffix}"`;
        if (m.format === 'includes') return `Neveljaven niz: mora vsebovati "${m.includes}"`;
        if (m.format === 'regex') return `Neveljaven niz: mora ustrezati vzorcu ${m.pattern}`;
        return `Neveljaven ${u[m.format] ?? r.format}`;
      }
      case 'not_multiple_of':
        return `Neveljavno število: mora biti večkratnik ${r.divisor}`;
      case 'unrecognized_keys':
        return `Neprepoznan${r.keys.length > 1 ? 'i ključi' : ' ključ'}: ${joinValues(r.keys, ', ')}`;
      case 'invalid_key':
        return `Neveljaven ključ v ${r.origin}`;
      case 'invalid_union':
        return 'Neveljaven vnos';
      case 'invalid_element':
        return `Neveljavna vrednost v ${r.origin}`;
      default:
        return 'Neveljaven vnos';
    }
  };
};
function sl() {
  return { localeError: sl_error() };
}
const sv_error = () => {
  const r = {
    string: { unit: 'tecken', verb: 'att ha' },
    file: { unit: 'bytes', verb: 'att ha' },
    array: { unit: 'objekt', verb: 'att innehålla' },
    set: { unit: 'objekt', verb: 'att innehålla' }
  };
  function getSizing(u) {
    return r[u] ?? null;
  }
  const u = {
    regex: 'reguljärt uttryck',
    email: 'e-postadress',
    url: 'URL',
    emoji: 'emoji',
    uuid: 'UUID',
    uuidv4: 'UUIDv4',
    uuidv6: 'UUIDv6',
    nanoid: 'nanoid',
    guid: 'GUID',
    cuid: 'cuid',
    cuid2: 'cuid2',
    ulid: 'ULID',
    xid: 'XID',
    ksuid: 'KSUID',
    datetime: 'ISO-datum och tid',
    date: 'ISO-datum',
    time: 'ISO-tid',
    duration: 'ISO-varaktighet',
    ipv4: 'IPv4-intervall',
    ipv6: 'IPv6-intervall',
    cidrv4: 'IPv4-spektrum',
    cidrv6: 'IPv6-spektrum',
    base64: 'base64-kodad sträng',
    base64url: 'base64url-kodad sträng',
    json_string: 'JSON-sträng',
    e164: 'E.164-nummer',
    jwt: 'JWT',
    template_literal: 'mall-literal'
  };
  const m = { nan: 'NaN', number: 'antal', array: 'lista' };
  return r => {
    switch (r.code) {
      case 'invalid_type': {
        const u = m[r.expected] ?? r.expected;
        const v = parsedType(r.input);
        const b = m[v] ?? v;
        if (/^[A-Z]/.test(r.expected)) {
          return `Ogiltig inmatning: förväntat instanceof ${r.expected}, fick ${b}`;
        }
        return `Ogiltig inmatning: förväntat ${u}, fick ${b}`;
      }
      case 'invalid_value':
        if (r.values.length === 1)
          return `Ogiltig inmatning: förväntat ${stringifyPrimitive(r.values[0])}`;
        return `Ogiltigt val: förväntade en av ${joinValues(r.values, '|')}`;
      case 'too_big': {
        const u = r.inclusive ? '<=' : '<';
        const m = getSizing(r.origin);
        if (m) {
          return `För stor(t): förväntade ${r.origin ?? 'värdet'} att ha ${u}${r.maximum.toString()} ${m.unit ?? 'element'}`;
        }
        return `För stor(t): förväntat ${r.origin ?? 'värdet'} att ha ${u}${r.maximum.toString()}`;
      }
      case 'too_small': {
        const u = r.inclusive ? '>=' : '>';
        const m = getSizing(r.origin);
        if (m) {
          return `För lite(t): förväntade ${r.origin ?? 'värdet'} att ha ${u}${r.minimum.toString()} ${m.unit}`;
        }
        return `För lite(t): förväntade ${r.origin ?? 'värdet'} att ha ${u}${r.minimum.toString()}`;
      }
      case 'invalid_format': {
        const m = r;
        if (m.format === 'starts_with') {
          return `Ogiltig sträng: måste börja med "${m.prefix}"`;
        }
        if (m.format === 'ends_with') return `Ogiltig sträng: måste sluta med "${m.suffix}"`;
        if (m.format === 'includes') return `Ogiltig sträng: måste innehålla "${m.includes}"`;
        if (m.format === 'regex')
          return `Ogiltig sträng: måste matcha mönstret "${m.pattern}"`;
        return `Ogiltig(t) ${u[m.format] ?? r.format}`;
      }
      case 'not_multiple_of':
        return `Ogiltigt tal: måste vara en multipel av ${r.divisor}`;
      case 'unrecognized_keys':
        return `${r.keys.length > 1 ? 'Okända nycklar' : 'Okänd nyckel'}: ${joinValues(r.keys, ', ')}`;
      case 'invalid_key':
        return `Ogiltig nyckel i ${r.origin ?? 'värdet'}`;
      case 'invalid_union':
        return 'Ogiltig input';
      case 'invalid_element':
        return `Ogiltigt värde i ${r.origin ?? 'värdet'}`;
      default:
        return `Ogiltig input`;
    }
  };
};
function sv() {
  return { localeError: sv_error() };
}
const ta_error = () => {
  const r = {
    string: { unit: 'எழுத்துக்கள்', verb: 'கொண்டிருக்க வேண்டும்' },
    file: { unit: 'பைட்டுகள்', verb: 'கொண்டிருக்க வேண்டும்' },
    array: { unit: 'உறுப்புகள்', verb: 'கொண்டிருக்க வேண்டும்' },
    set: { unit: 'உறுப்புகள்', verb: 'கொண்டிருக்க வேண்டும்' }
  };
  function getSizing(u) {
    return r[u] ?? null;
  }
  const u = {
    regex: 'உள்ளீடு',
    email: 'மின்னஞ்சல் முகவரி',
    url: 'URL',
    emoji: 'emoji',
    uuid: 'UUID',
    uuidv4: 'UUIDv4',
    uuidv6: 'UUIDv6',
    nanoid: 'nanoid',
    guid: 'GUID',
    cuid: 'cuid',
    cuid2: 'cuid2',
    ulid: 'ULID',
    xid: 'XID',
    ksuid: 'KSUID',
    datetime: 'ISO தேதி நேரம்',
    date: 'ISO தேதி',
    time: 'ISO நேரம்',
    duration: 'ISO கால அளவு',
    ipv4: 'IPv4 முகவரி',
    ipv6: 'IPv6 முகவரி',
    cidrv4: 'IPv4 வரம்பு',
    cidrv6: 'IPv6 வரம்பு',
    base64: 'base64-encoded சரம்',
    base64url: 'base64url-encoded சரம்',
    json_string: 'JSON சரம்',
    e164: 'E.164 எண்',
    jwt: 'JWT',
    template_literal: 'input'
  };
  const m = { nan: 'NaN', number: 'எண்', array: 'அணி', null: 'வெறுமை' };
  return r => {
    switch (r.code) {
      case 'invalid_type': {
        const u = m[r.expected] ?? r.expected;
        const v = parsedType(r.input);
        const b = m[v] ?? v;
        if (/^[A-Z]/.test(r.expected)) {
          return `தவறான உள்ளீடு: எதிர்பார்க்கப்பட்டது instanceof ${r.expected}, பெறப்பட்டது ${b}`;
        }
        return `தவறான உள்ளீடு: எதிர்பார்க்கப்பட்டது ${u}, பெறப்பட்டது ${b}`;
      }
      case 'invalid_value':
        if (r.values.length === 1)
          return `தவறான உள்ளீடு: எதிர்பார்க்கப்பட்டது ${stringifyPrimitive(r.values[0])}`;
        return `தவறான விருப்பம்: எதிர்பார்க்கப்பட்டது ${joinValues(r.values, '|')} இல் ஒன்று`;
      case 'too_big': {
        const u = r.inclusive ? '<=' : '<';
        const m = getSizing(r.origin);
        if (m) {
          return `மிக பெரியது: எதிர்பார்க்கப்பட்டது ${r.origin ?? 'மதிப்பு'} ${u}${r.maximum.toString()} ${m.unit ?? 'உறுப்புகள்'} ஆக இருக்க வேண்டும்`;
        }
        return `மிக பெரியது: எதிர்பார்க்கப்பட்டது ${r.origin ?? 'மதிப்பு'} ${u}${r.maximum.toString()} ஆக இருக்க வேண்டும்`;
      }
      case 'too_small': {
        const u = r.inclusive ? '>=' : '>';
        const m = getSizing(r.origin);
        if (m) {
          return `மிகச் சிறியது: எதிர்பார்க்கப்பட்டது ${r.origin} ${u}${r.minimum.toString()} ${m.unit} ஆக இருக்க வேண்டும்`;
        }
        return `மிகச் சிறியது: எதிர்பார்க்கப்பட்டது ${r.origin} ${u}${r.minimum.toString()} ஆக இருக்க வேண்டும்`;
      }
      case 'invalid_format': {
        const m = r;
        if (m.format === 'starts_with') return `தவறான சரம்: "${m.prefix}" இல் தொடங்க வேண்டும்`;
        if (m.format === 'ends_with') return `தவறான சரம்: "${m.suffix}" இல் முடிவடைய வேண்டும்`;
        if (m.format === 'includes') return `தவறான சரம்: "${m.includes}" ஐ உள்ளடக்க வேண்டும்`;
        if (m.format === 'regex')
          return `தவறான சரம்: ${m.pattern} முறைபாட்டுடன் பொருந்த வேண்டும்`;
        return `தவறான ${u[m.format] ?? r.format}`;
      }
      case 'not_multiple_of':
        return `தவறான எண்: ${r.divisor} இன் பலமாக இருக்க வேண்டும்`;
      case 'unrecognized_keys':
        return `அடையாளம் தெரியாத விசை${r.keys.length > 1 ? 'கள்' : ''}: ${joinValues(r.keys, ', ')}`;
      case 'invalid_key':
        return `${r.origin} இல் தவறான விசை`;
      case 'invalid_union':
        return 'தவறான உள்ளீடு';
      case 'invalid_element':
        return `${r.origin} இல் தவறான மதிப்பு`;
      default:
        return `தவறான உள்ளீடு`;
    }
  };
};
function ta() {
  return { localeError: ta_error() };
}
const th_error = () => {
  const r = {
    string: { unit: 'ตัวอักษร', verb: 'ควรมี' },
    file: { unit: 'ไบต์', verb: 'ควรมี' },
    array: { unit: 'รายการ', verb: 'ควรมี' },
    set: { unit: 'รายการ', verb: 'ควรมี' }
  };
  function getSizing(u) {
    return r[u] ?? null;
  }
  const u = {
    regex: 'ข้อมูลที่ป้อน',
    email: 'ที่อยู่อีเมล',
    url: 'URL',
    emoji: 'อิโมจิ',
    uuid: 'UUID',
    uuidv4: 'UUIDv4',
    uuidv6: 'UUIDv6',
    nanoid: 'nanoid',
    guid: 'GUID',
    cuid: 'cuid',
    cuid2: 'cuid2',
    ulid: 'ULID',
    xid: 'XID',
    ksuid: 'KSUID',
    datetime: 'วันที่เวลาแบบ ISO',
    date: 'วันที่แบบ ISO',
    time: 'เวลาแบบ ISO',
    duration: 'ช่วงเวลาแบบ ISO',
    ipv4: 'ที่อยู่ IPv4',
    ipv6: 'ที่อยู่ IPv6',
    cidrv4: 'ช่วง IP แบบ IPv4',
    cidrv6: 'ช่วง IP แบบ IPv6',
    base64: 'ข้อความแบบ Base64',
    base64url: 'ข้อความแบบ Base64 สำหรับ URL',
    json_string: 'ข้อความแบบ JSON',
    e164: 'เบอร์โทรศัพท์ระหว่างประเทศ (E.164)',
    jwt: 'โทเคน JWT',
    template_literal: 'ข้อมูลที่ป้อน'
  };
  const m = {
    nan: 'NaN',
    number: 'ตัวเลข',
    array: 'อาร์เรย์ (Array)',
    null: 'ไม่มีค่า (null)'
  };
  return r => {
    switch (r.code) {
      case 'invalid_type': {
        const u = m[r.expected] ?? r.expected;
        const v = parsedType(r.input);
        const b = m[v] ?? v;
        if (/^[A-Z]/.test(r.expected)) {
          return `ประเภทข้อมูลไม่ถูกต้อง: ควรเป็น instanceof ${r.expected} แต่ได้รับ ${b}`;
        }
        return `ประเภทข้อมูลไม่ถูกต้อง: ควรเป็น ${u} แต่ได้รับ ${b}`;
      }
      case 'invalid_value':
        if (r.values.length === 1)
          return `ค่าไม่ถูกต้อง: ควรเป็น ${stringifyPrimitive(r.values[0])}`;
        return `ตัวเลือกไม่ถูกต้อง: ควรเป็นหนึ่งใน ${joinValues(r.values, '|')}`;
      case 'too_big': {
        const u = r.inclusive ? 'ไม่เกิน' : 'น้อยกว่า';
        const m = getSizing(r.origin);
        if (m)
          return `เกินกำหนด: ${r.origin ?? 'ค่า'} ควรมี${u} ${r.maximum.toString()} ${m.unit ?? 'รายการ'}`;
        return `เกินกำหนด: ${r.origin ?? 'ค่า'} ควรมี${u} ${r.maximum.toString()}`;
      }
      case 'too_small': {
        const u = r.inclusive ? 'อย่างน้อย' : 'มากกว่า';
        const m = getSizing(r.origin);
        if (m) {
          return `น้อยกว่ากำหนด: ${r.origin} ควรมี${u} ${r.minimum.toString()} ${m.unit}`;
        }
        return `น้อยกว่ากำหนด: ${r.origin} ควรมี${u} ${r.minimum.toString()}`;
      }
      case 'invalid_format': {
        const m = r;
        if (m.format === 'starts_with') {
          return `รูปแบบไม่ถูกต้อง: ข้อความต้องขึ้นต้นด้วย "${m.prefix}"`;
        }
        if (m.format === 'ends_with')
          return `รูปแบบไม่ถูกต้อง: ข้อความต้องลงท้ายด้วย "${m.suffix}"`;
        if (m.format === 'includes')
          return `รูปแบบไม่ถูกต้อง: ข้อความต้องมี "${m.includes}" อยู่ในข้อความ`;
        if (m.format === 'regex')
          return `รูปแบบไม่ถูกต้อง: ต้องตรงกับรูปแบบที่กำหนด ${m.pattern}`;
        return `รูปแบบไม่ถูกต้อง: ${u[m.format] ?? r.format}`;
      }
      case 'not_multiple_of':
        return `ตัวเลขไม่ถูกต้อง: ต้องเป็นจำนวนที่หารด้วย ${r.divisor} ได้ลงตัว`;
      case 'unrecognized_keys':
        return `พบคีย์ที่ไม่รู้จัก: ${joinValues(r.keys, ', ')}`;
      case 'invalid_key':
        return `คีย์ไม่ถูกต้องใน ${r.origin}`;
      case 'invalid_union':
        return 'ข้อมูลไม่ถูกต้อง: ไม่ตรงกับรูปแบบยูเนียนที่กำหนดไว้';
      case 'invalid_element':
        return `ข้อมูลไม่ถูกต้องใน ${r.origin}`;
      default:
        return `ข้อมูลไม่ถูกต้อง`;
    }
  };
};
function th() {
  return { localeError: th_error() };
}
const tr_error = () => {
  const r = {
    string: { unit: 'karakter', verb: 'olmalı' },
    file: { unit: 'bayt', verb: 'olmalı' },
    array: { unit: 'öğe', verb: 'olmalı' },
    set: { unit: 'öğe', verb: 'olmalı' }
  };
  function getSizing(u) {
    return r[u] ?? null;
  }
  const u = {
    regex: 'girdi',
    email: 'e-posta adresi',
    url: 'URL',
    emoji: 'emoji',
    uuid: 'UUID',
    uuidv4: 'UUIDv4',
    uuidv6: 'UUIDv6',
    nanoid: 'nanoid',
    guid: 'GUID',
    cuid: 'cuid',
    cuid2: 'cuid2',
    ulid: 'ULID',
    xid: 'XID',
    ksuid: 'KSUID',
    datetime: 'ISO tarih ve saat',
    date: 'ISO tarih',
    time: 'ISO saat',
    duration: 'ISO süre',
    ipv4: 'IPv4 adresi',
    ipv6: 'IPv6 adresi',
    cidrv4: 'IPv4 aralığı',
    cidrv6: 'IPv6 aralığı',
    base64: 'base64 ile şifrelenmiş metin',
    base64url: 'base64url ile şifrelenmiş metin',
    json_string: 'JSON dizesi',
    e164: 'E.164 sayısı',
    jwt: 'JWT',
    template_literal: 'Şablon dizesi'
  };
  const m = { nan: 'NaN' };
  return r => {
    switch (r.code) {
      case 'invalid_type': {
        const u = m[r.expected] ?? r.expected;
        const v = parsedType(r.input);
        const b = m[v] ?? v;
        if (/^[A-Z]/.test(r.expected)) {
          return `Geçersiz değer: beklenen instanceof ${r.expected}, alınan ${b}`;
        }
        return `Geçersiz değer: beklenen ${u}, alınan ${b}`;
      }
      case 'invalid_value':
        if (r.values.length === 1)
          return `Geçersiz değer: beklenen ${stringifyPrimitive(r.values[0])}`;
        return `Geçersiz seçenek: aşağıdakilerden biri olmalı: ${joinValues(r.values, '|')}`;
      case 'too_big': {
        const u = r.inclusive ? '<=' : '<';
        const m = getSizing(r.origin);
        if (m)
          return `Çok büyük: beklenen ${r.origin ?? 'değer'} ${u}${r.maximum.toString()} ${m.unit ?? 'öğe'}`;
        return `Çok büyük: beklenen ${r.origin ?? 'değer'} ${u}${r.maximum.toString()}`;
      }
      case 'too_small': {
        const u = r.inclusive ? '>=' : '>';
        const m = getSizing(r.origin);
        if (m) return `Çok küçük: beklenen ${r.origin} ${u}${r.minimum.toString()} ${m.unit}`;
        return `Çok küçük: beklenen ${r.origin} ${u}${r.minimum.toString()}`;
      }
      case 'invalid_format': {
        const m = r;
        if (m.format === 'starts_with') return `Geçersiz metin: "${m.prefix}" ile başlamalı`;
        if (m.format === 'ends_with') return `Geçersiz metin: "${m.suffix}" ile bitmeli`;
        if (m.format === 'includes') return `Geçersiz metin: "${m.includes}" içermeli`;
        if (m.format === 'regex') return `Geçersiz metin: ${m.pattern} desenine uymalı`;
        return `Geçersiz ${u[m.format] ?? r.format}`;
      }
      case 'not_multiple_of':
        return `Geçersiz sayı: ${r.divisor} ile tam bölünebilmeli`;
      case 'unrecognized_keys':
        return `Tanınmayan anahtar${r.keys.length > 1 ? 'lar' : ''}: ${joinValues(r.keys, ', ')}`;
      case 'invalid_key':
        return `${r.origin} içinde geçersiz anahtar`;
      case 'invalid_union':
        return 'Geçersiz değer';
      case 'invalid_element':
        return `${r.origin} içinde geçersiz değer`;
      default:
        return `Geçersiz değer`;
    }
  };
};
function tr() {
  return { localeError: tr_error() };
}
const uk_error = () => {
  const r = {
    string: { unit: 'символів', verb: 'матиме' },
    file: { unit: 'байтів', verb: 'матиме' },
    array: { unit: 'елементів', verb: 'матиме' },
    set: { unit: 'елементів', verb: 'матиме' }
  };
  function getSizing(u) {
    return r[u] ?? null;
  }
  const u = {
    regex: 'вхідні дані',
    email: 'адреса електронної пошти',
    url: 'URL',
    emoji: 'емодзі',
    uuid: 'UUID',
    uuidv4: 'UUIDv4',
    uuidv6: 'UUIDv6',
    nanoid: 'nanoid',
    guid: 'GUID',
    cuid: 'cuid',
    cuid2: 'cuid2',
    ulid: 'ULID',
    xid: 'XID',
    ksuid: 'KSUID',
    datetime: 'дата та час ISO',
    date: 'дата ISO',
    time: 'час ISO',
    duration: 'тривалість ISO',
    ipv4: 'адреса IPv4',
    ipv6: 'адреса IPv6',
    cidrv4: 'діапазон IPv4',
    cidrv6: 'діапазон IPv6',
    base64: 'рядок у кодуванні base64',
    base64url: 'рядок у кодуванні base64url',
    json_string: 'рядок JSON',
    e164: 'номер E.164',
    jwt: 'JWT',
    template_literal: 'вхідні дані'
  };
  const m = { nan: 'NaN', number: 'число', array: 'масив' };
  return r => {
    switch (r.code) {
      case 'invalid_type': {
        const u = m[r.expected] ?? r.expected;
        const v = parsedType(r.input);
        const b = m[v] ?? v;
        if (/^[A-Z]/.test(r.expected)) {
          return `Неправильні вхідні дані: очікується instanceof ${r.expected}, отримано ${b}`;
        }
        return `Неправильні вхідні дані: очікується ${u}, отримано ${b}`;
      }
      case 'invalid_value':
        if (r.values.length === 1)
          return `Неправильні вхідні дані: очікується ${stringifyPrimitive(r.values[0])}`;
        return `Неправильна опція: очікується одне з ${joinValues(r.values, '|')}`;
      case 'too_big': {
        const u = r.inclusive ? '<=' : '<';
        const m = getSizing(r.origin);
        if (m)
          return `Занадто велике: очікується, що ${r.origin ?? 'значення'} ${m.verb} ${u}${r.maximum.toString()} ${m.unit ?? 'елементів'}`;
        return `Занадто велике: очікується, що ${r.origin ?? 'значення'} буде ${u}${r.maximum.toString()}`;
      }
      case 'too_small': {
        const u = r.inclusive ? '>=' : '>';
        const m = getSizing(r.origin);
        if (m) {
          return `Занадто мале: очікується, що ${r.origin} ${m.verb} ${u}${r.minimum.toString()} ${m.unit}`;
        }
        return `Занадто мале: очікується, що ${r.origin} буде ${u}${r.minimum.toString()}`;
      }
      case 'invalid_format': {
        const m = r;
        if (m.format === 'starts_with')
          return `Неправильний рядок: повинен починатися з "${m.prefix}"`;
        if (m.format === 'ends_with')
          return `Неправильний рядок: повинен закінчуватися на "${m.suffix}"`;
        if (m.format === 'includes')
          return `Неправильний рядок: повинен містити "${m.includes}"`;
        if (m.format === 'regex')
          return `Неправильний рядок: повинен відповідати шаблону ${m.pattern}`;
        return `Неправильний ${u[m.format] ?? r.format}`;
      }
      case 'not_multiple_of':
        return `Неправильне число: повинно бути кратним ${r.divisor}`;
      case 'unrecognized_keys':
        return `Нерозпізнаний ключ${r.keys.length > 1 ? 'і' : ''}: ${joinValues(r.keys, ', ')}`;
      case 'invalid_key':
        return `Неправильний ключ у ${r.origin}`;
      case 'invalid_union':
        return 'Неправильні вхідні дані';
      case 'invalid_element':
        return `Неправильне значення у ${r.origin}`;
      default:
        return `Неправильні вхідні дані`;
    }
  };
};
function uk() {
  return { localeError: uk_error() };
}
function ua() {
  return uk();
}
const ur_error = () => {
  const r = {
    string: { unit: 'حروف', verb: 'ہونا' },
    file: { unit: 'بائٹس', verb: 'ہونا' },
    array: { unit: 'آئٹمز', verb: 'ہونا' },
    set: { unit: 'آئٹمز', verb: 'ہونا' }
  };
  function getSizing(u) {
    return r[u] ?? null;
  }
  const u = {
    regex: 'ان پٹ',
    email: 'ای میل ایڈریس',
    url: 'یو آر ایل',
    emoji: 'ایموجی',
    uuid: 'یو یو آئی ڈی',
    uuidv4: 'یو یو آئی ڈی وی 4',
    uuidv6: 'یو یو آئی ڈی وی 6',
    nanoid: 'نینو آئی ڈی',
    guid: 'جی یو آئی ڈی',
    cuid: 'سی یو آئی ڈی',
    cuid2: 'سی یو آئی ڈی 2',
    ulid: 'یو ایل آئی ڈی',
    xid: 'ایکس آئی ڈی',
    ksuid: 'کے ایس یو آئی ڈی',
    datetime: 'آئی ایس او ڈیٹ ٹائم',
    date: 'آئی ایس او تاریخ',
    time: 'آئی ایس او وقت',
    duration: 'آئی ایس او مدت',
    ipv4: 'آئی پی وی 4 ایڈریس',
    ipv6: 'آئی پی وی 6 ایڈریس',
    cidrv4: 'آئی پی وی 4 رینج',
    cidrv6: 'آئی پی وی 6 رینج',
    base64: 'بیس 64 ان کوڈڈ سٹرنگ',
    base64url: 'بیس 64 یو آر ایل ان کوڈڈ سٹرنگ',
    json_string: 'جے ایس او این سٹرنگ',
    e164: 'ای 164 نمبر',
    jwt: 'جے ڈبلیو ٹی',
    template_literal: 'ان پٹ'
  };
  const m = { nan: 'NaN', number: 'نمبر', array: 'آرے', null: 'نل' };
  return r => {
    switch (r.code) {
      case 'invalid_type': {
        const u = m[r.expected] ?? r.expected;
        const v = parsedType(r.input);
        const b = m[v] ?? v;
        if (/^[A-Z]/.test(r.expected)) {
          return `غلط ان پٹ: instanceof ${r.expected} متوقع تھا، ${b} موصول ہوا`;
        }
        return `غلط ان پٹ: ${u} متوقع تھا، ${b} موصول ہوا`;
      }
      case 'invalid_value':
        if (r.values.length === 1)
          return `غلط ان پٹ: ${stringifyPrimitive(r.values[0])} متوقع تھا`;
        return `غلط آپشن: ${joinValues(r.values, '|')} میں سے ایک متوقع تھا`;
      case 'too_big': {
        const u = r.inclusive ? '<=' : '<';
        const m = getSizing(r.origin);
        if (m)
          return `بہت بڑا: ${r.origin ?? 'ویلیو'} کے ${u}${r.maximum.toString()} ${m.unit ?? 'عناصر'} ہونے متوقع تھے`;
        return `بہت بڑا: ${r.origin ?? 'ویلیو'} کا ${u}${r.maximum.toString()} ہونا متوقع تھا`;
      }
      case 'too_small': {
        const u = r.inclusive ? '>=' : '>';
        const m = getSizing(r.origin);
        if (m) {
          return `بہت چھوٹا: ${r.origin} کے ${u}${r.minimum.toString()} ${m.unit} ہونے متوقع تھے`;
        }
        return `بہت چھوٹا: ${r.origin} کا ${u}${r.minimum.toString()} ہونا متوقع تھا`;
      }
      case 'invalid_format': {
        const m = r;
        if (m.format === 'starts_with') {
          return `غلط سٹرنگ: "${m.prefix}" سے شروع ہونا چاہیے`;
        }
        if (m.format === 'ends_with') return `غلط سٹرنگ: "${m.suffix}" پر ختم ہونا چاہیے`;
        if (m.format === 'includes') return `غلط سٹرنگ: "${m.includes}" شامل ہونا چاہیے`;
        if (m.format === 'regex') return `غلط سٹرنگ: پیٹرن ${m.pattern} سے میچ ہونا چاہیے`;
        return `غلط ${u[m.format] ?? r.format}`;
      }
      case 'not_multiple_of':
        return `غلط نمبر: ${r.divisor} کا مضاعف ہونا چاہیے`;
      case 'unrecognized_keys':
        return `غیر تسلیم شدہ کی${r.keys.length > 1 ? 'ز' : ''}: ${joinValues(r.keys, '، ')}`;
      case 'invalid_key':
        return `${r.origin} میں غلط کی`;
      case 'invalid_union':
        return 'غلط ان پٹ';
      case 'invalid_element':
        return `${r.origin} میں غلط ویلیو`;
      default:
        return `غلط ان پٹ`;
    }
  };
};
function ur() {
  return { localeError: ur_error() };
}
const uz_error = () => {
  const r = {
    string: { unit: 'belgi', verb: 'bo‘lishi kerak' },
    file: { unit: 'bayt', verb: 'bo‘lishi kerak' },
    array: { unit: 'element', verb: 'bo‘lishi kerak' },
    set: { unit: 'element', verb: 'bo‘lishi kerak' }
  };
  function getSizing(u) {
    return r[u] ?? null;
  }
  const u = {
    regex: 'kirish',
    email: 'elektron pochta manzili',
    url: 'URL',
    emoji: 'emoji',
    uuid: 'UUID',
    uuidv4: 'UUIDv4',
    uuidv6: 'UUIDv6',
    nanoid: 'nanoid',
    guid: 'GUID',
    cuid: 'cuid',
    cuid2: 'cuid2',
    ulid: 'ULID',
    xid: 'XID',
    ksuid: 'KSUID',
    datetime: 'ISO sana va vaqti',
    date: 'ISO sana',
    time: 'ISO vaqt',
    duration: 'ISO davomiylik',
    ipv4: 'IPv4 manzil',
    ipv6: 'IPv6 manzil',
    mac: 'MAC manzil',
    cidrv4: 'IPv4 diapazon',
    cidrv6: 'IPv6 diapazon',
    base64: 'base64 kodlangan satr',
    base64url: 'base64url kodlangan satr',
    json_string: 'JSON satr',
    e164: 'E.164 raqam',
    jwt: 'JWT',
    template_literal: 'kirish'
  };
  const m = { nan: 'NaN', number: 'raqam', array: 'massiv' };
  return r => {
    switch (r.code) {
      case 'invalid_type': {
        const u = m[r.expected] ?? r.expected;
        const v = parsedType(r.input);
        const b = m[v] ?? v;
        if (/^[A-Z]/.test(r.expected)) {
          return `Noto‘g‘ri kirish: kutilgan instanceof ${r.expected}, qabul qilingan ${b}`;
        }
        return `Noto‘g‘ri kirish: kutilgan ${u}, qabul qilingan ${b}`;
      }
      case 'invalid_value':
        if (r.values.length === 1)
          return `Noto‘g‘ri kirish: kutilgan ${stringifyPrimitive(r.values[0])}`;
        return `Noto‘g‘ri variant: quyidagilardan biri kutilgan ${joinValues(r.values, '|')}`;
      case 'too_big': {
        const u = r.inclusive ? '<=' : '<';
        const m = getSizing(r.origin);
        if (m)
          return `Juda katta: kutilgan ${r.origin ?? 'qiymat'} ${u}${r.maximum.toString()} ${m.unit} ${m.verb}`;
        return `Juda katta: kutilgan ${r.origin ?? 'qiymat'} ${u}${r.maximum.toString()}`;
      }
      case 'too_small': {
        const u = r.inclusive ? '>=' : '>';
        const m = getSizing(r.origin);
        if (m) {
          return `Juda kichik: kutilgan ${r.origin} ${u}${r.minimum.toString()} ${m.unit} ${m.verb}`;
        }
        return `Juda kichik: kutilgan ${r.origin} ${u}${r.minimum.toString()}`;
      }
      case 'invalid_format': {
        const m = r;
        if (m.format === 'starts_with')
          return `Noto‘g‘ri satr: "${m.prefix}" bilan boshlanishi kerak`;
        if (m.format === 'ends_with')
          return `Noto‘g‘ri satr: "${m.suffix}" bilan tugashi kerak`;
        if (m.format === 'includes')
          return `Noto‘g‘ri satr: "${m.includes}" ni o‘z ichiga olishi kerak`;
        if (m.format === 'regex')
          return `Noto‘g‘ri satr: ${m.pattern} shabloniga mos kelishi kerak`;
        return `Noto‘g‘ri ${u[m.format] ?? r.format}`;
      }
      case 'not_multiple_of':
        return `Noto‘g‘ri raqam: ${r.divisor} ning karralisi bo‘lishi kerak`;
      case 'unrecognized_keys':
        return `Noma’lum kalit${r.keys.length > 1 ? 'lar' : ''}: ${joinValues(r.keys, ', ')}`;
      case 'invalid_key':
        return `${r.origin} dagi kalit noto‘g‘ri`;
      case 'invalid_union':
        return 'Noto‘g‘ri kirish';
      case 'invalid_element':
        return `${r.origin} da noto‘g‘ri qiymat`;
      default:
        return `Noto‘g‘ri kirish`;
    }
  };
};
function uz() {
  return { localeError: uz_error() };
}
const vi_error = () => {
  const r = {
    string: { unit: 'ký tự', verb: 'có' },
    file: { unit: 'byte', verb: 'có' },
    array: { unit: 'phần tử', verb: 'có' },
    set: { unit: 'phần tử', verb: 'có' }
  };
  function getSizing(u) {
    return r[u] ?? null;
  }
  const u = {
    regex: 'đầu vào',
    email: 'địa chỉ email',
    url: 'URL',
    emoji: 'emoji',
    uuid: 'UUID',
    uuidv4: 'UUIDv4',
    uuidv6: 'UUIDv6',
    nanoid: 'nanoid',
    guid: 'GUID',
    cuid: 'cuid',
    cuid2: 'cuid2',
    ulid: 'ULID',
    xid: 'XID',
    ksuid: 'KSUID',
    datetime: 'ngày giờ ISO',
    date: 'ngày ISO',
    time: 'giờ ISO',
    duration: 'khoảng thời gian ISO',
    ipv4: 'địa chỉ IPv4',
    ipv6: 'địa chỉ IPv6',
    cidrv4: 'dải IPv4',
    cidrv6: 'dải IPv6',
    base64: 'chuỗi mã hóa base64',
    base64url: 'chuỗi mã hóa base64url',
    json_string: 'chuỗi JSON',
    e164: 'số E.164',
    jwt: 'JWT',
    template_literal: 'đầu vào'
  };
  const m = { nan: 'NaN', number: 'số', array: 'mảng' };
  return r => {
    switch (r.code) {
      case 'invalid_type': {
        const u = m[r.expected] ?? r.expected;
        const v = parsedType(r.input);
        const b = m[v] ?? v;
        if (/^[A-Z]/.test(r.expected)) {
          return `Đầu vào không hợp lệ: mong đợi instanceof ${r.expected}, nhận được ${b}`;
        }
        return `Đầu vào không hợp lệ: mong đợi ${u}, nhận được ${b}`;
      }
      case 'invalid_value':
        if (r.values.length === 1)
          return `Đầu vào không hợp lệ: mong đợi ${stringifyPrimitive(r.values[0])}`;
        return `Tùy chọn không hợp lệ: mong đợi một trong các giá trị ${joinValues(r.values, '|')}`;
      case 'too_big': {
        const u = r.inclusive ? '<=' : '<';
        const m = getSizing(r.origin);
        if (m)
          return `Quá lớn: mong đợi ${r.origin ?? 'giá trị'} ${m.verb} ${u}${r.maximum.toString()} ${m.unit ?? 'phần tử'}`;
        return `Quá lớn: mong đợi ${r.origin ?? 'giá trị'} ${u}${r.maximum.toString()}`;
      }
      case 'too_small': {
        const u = r.inclusive ? '>=' : '>';
        const m = getSizing(r.origin);
        if (m) {
          return `Quá nhỏ: mong đợi ${r.origin} ${m.verb} ${u}${r.minimum.toString()} ${m.unit}`;
        }
        return `Quá nhỏ: mong đợi ${r.origin} ${u}${r.minimum.toString()}`;
      }
      case 'invalid_format': {
        const m = r;
        if (m.format === 'starts_with')
          return `Chuỗi không hợp lệ: phải bắt đầu bằng "${m.prefix}"`;
        if (m.format === 'ends_with')
          return `Chuỗi không hợp lệ: phải kết thúc bằng "${m.suffix}"`;
        if (m.format === 'includes') return `Chuỗi không hợp lệ: phải bao gồm "${m.includes}"`;
        if (m.format === 'regex') return `Chuỗi không hợp lệ: phải khớp với mẫu ${m.pattern}`;
        return `${u[m.format] ?? r.format} không hợp lệ`;
      }
      case 'not_multiple_of':
        return `Số không hợp lệ: phải là bội số của ${r.divisor}`;
      case 'unrecognized_keys':
        return `Khóa không được nhận dạng: ${joinValues(r.keys, ', ')}`;
      case 'invalid_key':
        return `Khóa không hợp lệ trong ${r.origin}`;
      case 'invalid_union':
        return 'Đầu vào không hợp lệ';
      case 'invalid_element':
        return `Giá trị không hợp lệ trong ${r.origin}`;
      default:
        return `Đầu vào không hợp lệ`;
    }
  };
};
function vi() {
  return { localeError: vi_error() };
}
const zh_CN_error = () => {
  const r = {
    string: { unit: '字符', verb: '包含' },
    file: { unit: '字节', verb: '包含' },
    array: { unit: '项', verb: '包含' },
    set: { unit: '项', verb: '包含' }
  };
  function getSizing(u) {
    return r[u] ?? null;
  }
  const u = {
    regex: '输入',
    email: '电子邮件',
    url: 'URL',
    emoji: '表情符号',
    uuid: 'UUID',
    uuidv4: 'UUIDv4',
    uuidv6: 'UUIDv6',
    nanoid: 'nanoid',
    guid: 'GUID',
    cuid: 'cuid',
    cuid2: 'cuid2',
    ulid: 'ULID',
    xid: 'XID',
    ksuid: 'KSUID',
    datetime: 'ISO日期时间',
    date: 'ISO日期',
    time: 'ISO时间',
    duration: 'ISO时长',
    ipv4: 'IPv4地址',
    ipv6: 'IPv6地址',
    cidrv4: 'IPv4网段',
    cidrv6: 'IPv6网段',
    base64: 'base64编码字符串',
    base64url: 'base64url编码字符串',
    json_string: 'JSON字符串',
    e164: 'E.164号码',
    jwt: 'JWT',
    template_literal: '输入'
  };
  const m = { nan: 'NaN', number: '数字', array: '数组', null: '空值(null)' };
  return r => {
    switch (r.code) {
      case 'invalid_type': {
        const u = m[r.expected] ?? r.expected;
        const v = parsedType(r.input);
        const b = m[v] ?? v;
        if (/^[A-Z]/.test(r.expected)) {
          return `无效输入：期望 instanceof ${r.expected}，实际接收 ${b}`;
        }
        return `无效输入：期望 ${u}，实际接收 ${b}`;
      }
      case 'invalid_value':
        if (r.values.length === 1) return `无效输入：期望 ${stringifyPrimitive(r.values[0])}`;
        return `无效选项：期望以下之一 ${joinValues(r.values, '|')}`;
      case 'too_big': {
        const u = r.inclusive ? '<=' : '<';
        const m = getSizing(r.origin);
        if (m)
          return `数值过大：期望 ${r.origin ?? '值'} ${u}${r.maximum.toString()} ${m.unit ?? '个元素'}`;
        return `数值过大：期望 ${r.origin ?? '值'} ${u}${r.maximum.toString()}`;
      }
      case 'too_small': {
        const u = r.inclusive ? '>=' : '>';
        const m = getSizing(r.origin);
        if (m) {
          return `数值过小：期望 ${r.origin} ${u}${r.minimum.toString()} ${m.unit}`;
        }
        return `数值过小：期望 ${r.origin} ${u}${r.minimum.toString()}`;
      }
      case 'invalid_format': {
        const m = r;
        if (m.format === 'starts_with') return `无效字符串：必须以 "${m.prefix}" 开头`;
        if (m.format === 'ends_with') return `无效字符串：必须以 "${m.suffix}" 结尾`;
        if (m.format === 'includes') return `无效字符串：必须包含 "${m.includes}"`;
        if (m.format === 'regex') return `无效字符串：必须满足正则表达式 ${m.pattern}`;
        return `无效${u[m.format] ?? r.format}`;
      }
      case 'not_multiple_of':
        return `无效数字：必须是 ${r.divisor} 的倍数`;
      case 'unrecognized_keys':
        return `出现未知的键(key): ${joinValues(r.keys, ', ')}`;
      case 'invalid_key':
        return `${r.origin} 中的键(key)无效`;
      case 'invalid_union':
        return '无效输入';
      case 'invalid_element':
        return `${r.origin} 中包含无效值(value)`;
      default:
        return `无效输入`;
    }
  };
};
function zh_CN() {
  return { localeError: zh_CN_error() };
}
const zh_TW_error = () => {
  const r = {
    string: { unit: '字元', verb: '擁有' },
    file: { unit: '位元組', verb: '擁有' },
    array: { unit: '項目', verb: '擁有' },
    set: { unit: '項目', verb: '擁有' }
  };
  function getSizing(u) {
    return r[u] ?? null;
  }
  const u = {
    regex: '輸入',
    email: '郵件地址',
    url: 'URL',
    emoji: 'emoji',
    uuid: 'UUID',
    uuidv4: 'UUIDv4',
    uuidv6: 'UUIDv6',
    nanoid: 'nanoid',
    guid: 'GUID',
    cuid: 'cuid',
    cuid2: 'cuid2',
    ulid: 'ULID',
    xid: 'XID',
    ksuid: 'KSUID',
    datetime: 'ISO 日期時間',
    date: 'ISO 日期',
    time: 'ISO 時間',
    duration: 'ISO 期間',
    ipv4: 'IPv4 位址',
    ipv6: 'IPv6 位址',
    cidrv4: 'IPv4 範圍',
    cidrv6: 'IPv6 範圍',
    base64: 'base64 編碼字串',
    base64url: 'base64url 編碼字串',
    json_string: 'JSON 字串',
    e164: 'E.164 數值',
    jwt: 'JWT',
    template_literal: '輸入'
  };
  const m = { nan: 'NaN' };
  return r => {
    switch (r.code) {
      case 'invalid_type': {
        const u = m[r.expected] ?? r.expected;
        const v = parsedType(r.input);
        const b = m[v] ?? v;
        if (/^[A-Z]/.test(r.expected)) {
          return `無效的輸入值：預期為 instanceof ${r.expected}，但收到 ${b}`;
        }
        return `無效的輸入值：預期為 ${u}，但收到 ${b}`;
      }
      case 'invalid_value':
        if (r.values.length === 1)
          return `無效的輸入值：預期為 ${stringifyPrimitive(r.values[0])}`;
        return `無效的選項：預期為以下其中之一 ${joinValues(r.values, '|')}`;
      case 'too_big': {
        const u = r.inclusive ? '<=' : '<';
        const m = getSizing(r.origin);
        if (m)
          return `數值過大：預期 ${r.origin ?? '值'} 應為 ${u}${r.maximum.toString()} ${m.unit ?? '個元素'}`;
        return `數值過大：預期 ${r.origin ?? '值'} 應為 ${u}${r.maximum.toString()}`;
      }
      case 'too_small': {
        const u = r.inclusive ? '>=' : '>';
        const m = getSizing(r.origin);
        if (m) {
          return `數值過小：預期 ${r.origin} 應為 ${u}${r.minimum.toString()} ${m.unit}`;
        }
        return `數值過小：預期 ${r.origin} 應為 ${u}${r.minimum.toString()}`;
      }
      case 'invalid_format': {
        const m = r;
        if (m.format === 'starts_with') {
          return `無效的字串：必須以 "${m.prefix}" 開頭`;
        }
        if (m.format === 'ends_with') return `無效的字串：必須以 "${m.suffix}" 結尾`;
        if (m.format === 'includes') return `無效的字串：必須包含 "${m.includes}"`;
        if (m.format === 'regex') return `無效的字串：必須符合格式 ${m.pattern}`;
        return `無效的 ${u[m.format] ?? r.format}`;
      }
      case 'not_multiple_of':
        return `無效的數字：必須為 ${r.divisor} 的倍數`;
      case 'unrecognized_keys':
        return `無法識別的鍵值${r.keys.length > 1 ? '們' : ''}：${joinValues(r.keys, '、')}`;
      case 'invalid_key':
        return `${r.origin} 中有無效的鍵值`;
      case 'invalid_union':
        return '無效的輸入值';
      case 'invalid_element':
        return `${r.origin} 中有無效的值`;
      default:
        return `無效的輸入值`;
    }
  };
};
function zh_TW() {
  return { localeError: zh_TW_error() };
}
const yo_error = () => {
  const r = {
    string: { unit: 'àmi', verb: 'ní' },
    file: { unit: 'bytes', verb: 'ní' },
    array: { unit: 'nkan', verb: 'ní' },
    set: { unit: 'nkan', verb: 'ní' }
  };
  function getSizing(u) {
    return r[u] ?? null;
  }
  const u = {
    regex: 'ẹ̀rọ ìbáwọlé',
    email: 'àdírẹ́sì ìmẹ́lì',
    url: 'URL',
    emoji: 'emoji',
    uuid: 'UUID',
    uuidv4: 'UUIDv4',
    uuidv6: 'UUIDv6',
    nanoid: 'nanoid',
    guid: 'GUID',
    cuid: 'cuid',
    cuid2: 'cuid2',
    ulid: 'ULID',
    xid: 'XID',
    ksuid: 'KSUID',
    datetime: 'àkókò ISO',
    date: 'ọjọ́ ISO',
    time: 'àkókò ISO',
    duration: 'àkókò tó pé ISO',
    ipv4: 'àdírẹ́sì IPv4',
    ipv6: 'àdírẹ́sì IPv6',
    cidrv4: 'àgbègbè IPv4',
    cidrv6: 'àgbègbè IPv6',
    base64: 'ọ̀rọ̀ tí a kọ́ ní base64',
    base64url: 'ọ̀rọ̀ base64url',
    json_string: 'ọ̀rọ̀ JSON',
    e164: 'nọ́mbà E.164',
    jwt: 'JWT',
    template_literal: 'ẹ̀rọ ìbáwọlé'
  };
  const m = { nan: 'NaN', number: 'nọ́mbà', array: 'akopọ' };
  return r => {
    switch (r.code) {
      case 'invalid_type': {
        const u = m[r.expected] ?? r.expected;
        const v = parsedType(r.input);
        const b = m[v] ?? v;
        if (/^[A-Z]/.test(r.expected)) {
          return `Ìbáwọlé aṣìṣe: a ní láti fi instanceof ${r.expected}, àmọ̀ a rí ${b}`;
        }
        return `Ìbáwọlé aṣìṣe: a ní láti fi ${u}, àmọ̀ a rí ${b}`;
      }
      case 'invalid_value':
        if (r.values.length === 1)
          return `Ìbáwọlé aṣìṣe: a ní láti fi ${stringifyPrimitive(r.values[0])}`;
        return `Àṣàyàn aṣìṣe: yan ọ̀kan lára ${joinValues(r.values, '|')}`;
      case 'too_big': {
        const u = r.inclusive ? '<=' : '<';
        const m = getSizing(r.origin);
        if (m)
          return `Tó pọ̀ jù: a ní láti jẹ́ pé ${r.origin ?? 'iye'} ${m.verb} ${u}${r.maximum} ${m.unit}`;
        return `Tó pọ̀ jù: a ní láti jẹ́ ${u}${r.maximum}`;
      }
      case 'too_small': {
        const u = r.inclusive ? '>=' : '>';
        const m = getSizing(r.origin);
        if (m)
          return `Kéré ju: a ní láti jẹ́ pé ${r.origin} ${m.verb} ${u}${r.minimum} ${m.unit}`;
        return `Kéré ju: a ní láti jẹ́ ${u}${r.minimum}`;
      }
      case 'invalid_format': {
        const m = r;
        if (m.format === 'starts_with') return `Ọ̀rọ̀ aṣìṣe: gbọ́dọ̀ bẹ̀rẹ̀ pẹ̀lú "${m.prefix}"`;
        if (m.format === 'ends_with') return `Ọ̀rọ̀ aṣìṣe: gbọ́dọ̀ parí pẹ̀lú "${m.suffix}"`;
        if (m.format === 'includes') return `Ọ̀rọ̀ aṣìṣe: gbọ́dọ̀ ní "${m.includes}"`;
        if (m.format === 'regex') return `Ọ̀rọ̀ aṣìṣe: gbọ́dọ̀ bá àpẹẹrẹ mu ${m.pattern}`;
        return `Aṣìṣe: ${u[m.format] ?? r.format}`;
      }
      case 'not_multiple_of':
        return `Nọ́mbà aṣìṣe: gbọ́dọ̀ jẹ́ èyà pípín ti ${r.divisor}`;
      case 'unrecognized_keys':
        return `Bọtìnì àìmọ̀: ${joinValues(r.keys, ', ')}`;
      case 'invalid_key':
        return `Bọtìnì aṣìṣe nínú ${r.origin}`;
      case 'invalid_union':
        return 'Ìbáwọlé aṣìṣe';
      case 'invalid_element':
        return `Iye aṣìṣe nínú ${r.origin}`;
      default:
        return 'Ìbáwọlé aṣìṣe';
    }
  };
};
function yo() {
  return { localeError: yo_error() };
}
var Dr;
const Tr = Symbol('ZodOutput');
const Ar = Symbol('ZodInput');
class $ZodRegistry {
  constructor() {
    this._map = new WeakMap();
    this._idmap = new Map();
  }
  add(r, ...u) {
    const m = u[0];
    this._map.set(r, m);
    if (m && typeof m === 'object' && 'id' in m) {
      this._idmap.set(m.id, r);
    }
    return this;
  }
  clear() {
    this._map = new WeakMap();
    this._idmap = new Map();
    return this;
  }
  remove(r) {
    const u = this._map.get(r);
    if (u && typeof u === 'object' && 'id' in u) {
      this._idmap.delete(u.id);
    }
    this._map.delete(r);
    return this;
  }
  get(r) {
    const u = r._zod.parent;
    if (u) {
      const m = { ...(this.get(u) ?? {}) };
      delete m.id;
      const v = { ...m, ...this._map.get(r) };
      return Object.keys(v).length ? v : undefined;
    }
    return this._map.get(r);
  }
  has(r) {
    return this._map.has(r);
  }
}
function registry() {
  return new $ZodRegistry();
}
(Dr = globalThis).__zod_globalRegistry ?? (Dr.__zod_globalRegistry = registry());
const Nr = globalThis.__zod_globalRegistry;
function _string(r, u) {
  return new r({ type: 'string', ...normalizeParams(u) });
}
function _coercedString(r, u) {
  return new r({ type: 'string', coerce: true, ...normalizeParams(u) });
}
function _email(r, u) {
  return new r({
    type: 'string',
    format: 'email',
    check: 'string_format',
    abort: false,
    ...normalizeParams(u)
  });
}
function _guid(r, u) {
  return new r({
    type: 'string',
    format: 'guid',
    check: 'string_format',
    abort: false,
    ...normalizeParams(u)
  });
}
function _uuid(r, u) {
  return new r({
    type: 'string',
    format: 'uuid',
    check: 'string_format',
    abort: false,
    ...normalizeParams(u)
  });
}
function _uuidv4(r, u) {
  return new r({
    type: 'string',
    format: 'uuid',
    check: 'string_format',
    abort: false,
    version: 'v4',
    ...normalizeParams(u)
  });
}
function _uuidv6(r, u) {
  return new r({
    type: 'string',
    format: 'uuid',
    check: 'string_format',
    abort: false,
    version: 'v6',
    ...normalizeParams(u)
  });
}
function _uuidv7(r, u) {
  return new r({
    type: 'string',
    format: 'uuid',
    check: 'string_format',
    abort: false,
    version: 'v7',
    ...normalizeParams(u)
  });
}
function _url(r, u) {
  return new r({
    type: 'string',
    format: 'url',
    check: 'string_format',
    abort: false,
    ...normalizeParams(u)
  });
}
function api_emoji(r, u) {
  return new r({
    type: 'string',
    format: 'emoji',
    check: 'string_format',
    abort: false,
    ...normalizeParams(u)
  });
}
function _nanoid(r, u) {
  return new r({
    type: 'string',
    format: 'nanoid',
    check: 'string_format',
    abort: false,
    ...normalizeParams(u)
  });
}
function _cuid(r, u) {
  return new r({
    type: 'string',
    format: 'cuid',
    check: 'string_format',
    abort: false,
    ...normalizeParams(u)
  });
}
function _cuid2(r, u) {
  return new r({
    type: 'string',
    format: 'cuid2',
    check: 'string_format',
    abort: false,
    ...normalizeParams(u)
  });
}
function _ulid(r, u) {
  return new r({
    type: 'string',
    format: 'ulid',
    check: 'string_format',
    abort: false,
    ...normalizeParams(u)
  });
}
function _xid(r, u) {
  return new r({
    type: 'string',
    format: 'xid',
    check: 'string_format',
    abort: false,
    ...normalizeParams(u)
  });
}
function _ksuid(r, u) {
  return new r({
    type: 'string',
    format: 'ksuid',
    check: 'string_format',
    abort: false,
    ...normalizeParams(u)
  });
}
function _ipv4(r, u) {
  return new r({
    type: 'string',
    format: 'ipv4',
    check: 'string_format',
    abort: false,
    ...normalizeParams(u)
  });
}
function _ipv6(r, u) {
  return new r({
    type: 'string',
    format: 'ipv6',
    check: 'string_format',
    abort: false,
    ...normalizeParams(u)
  });
}
function _mac(r, u) {
  return new r({
    type: 'string',
    format: 'mac',
    check: 'string_format',
    abort: false,
    ...normalizeParams(u)
  });
}
function _cidrv4(r, u) {
  return new r({
    type: 'string',
    format: 'cidrv4',
    check: 'string_format',
    abort: false,
    ...normalizeParams(u)
  });
}
function _cidrv6(r, u) {
  return new r({
    type: 'string',
    format: 'cidrv6',
    check: 'string_format',
    abort: false,
    ...normalizeParams(u)
  });
}
function _base64(r, u) {
  return new r({
    type: 'string',
    format: 'base64',
    check: 'string_format',
    abort: false,
    ...normalizeParams(u)
  });
}
function _base64url(r, u) {
  return new r({
    type: 'string',
    format: 'base64url',
    check: 'string_format',
    abort: false,
    ...normalizeParams(u)
  });
}
function _e164(r, u) {
  return new r({
    type: 'string',
    format: 'e164',
    check: 'string_format',
    abort: false,
    ...normalizeParams(u)
  });
}
function _jwt(r, u) {
  return new r({
    type: 'string',
    format: 'jwt',
    check: 'string_format',
    abort: false,
    ...normalizeParams(u)
  });
}
const Rr = { Any: null, Minute: -1, Second: 0, Millisecond: 3, Microsecond: 6 };
function _isoDateTime(r, u) {
  return new r({
    type: 'string',
    format: 'datetime',
    check: 'string_format',
    offset: false,
    local: false,
    precision: null,
    ...normalizeParams(u)
  });
}
function _isoDate(r, u) {
  return new r({
    type: 'string',
    format: 'date',
    check: 'string_format',
    ...normalizeParams(u)
  });
}
function _isoTime(r, u) {
  return new r({
    type: 'string',
    format: 'time',
    check: 'string_format',
    precision: null,
    ...normalizeParams(u)
  });
}
function _isoDuration(r, u) {
  return new r({
    type: 'string',
    format: 'duration',
    check: 'string_format',
    ...normalizeParams(u)
  });
}
function _number(r, u) {
  return new r({ type: 'number', checks: [], ...normalizeParams(u) });
}
function _coercedNumber(r, u) {
  return new r({ type: 'number', coerce: true, checks: [], ...normalizeParams(u) });
}
function _int(r, u) {
  return new r({
    type: 'number',
    check: 'number_format',
    abort: false,
    format: 'safeint',
    ...normalizeParams(u)
  });
}
function _float32(r, u) {
  return new r({
    type: 'number',
    check: 'number_format',
    abort: false,
    format: 'float32',
    ...normalizeParams(u)
  });
}
function _float64(r, u) {
  return new r({
    type: 'number',
    check: 'number_format',
    abort: false,
    format: 'float64',
    ...normalizeParams(u)
  });
}
function _int32(r, u) {
  return new r({
    type: 'number',
    check: 'number_format',
    abort: false,
    format: 'int32',
    ...normalizeParams(u)
  });
}
function _uint32(r, u) {
  return new r({
    type: 'number',
    check: 'number_format',
    abort: false,
    format: 'uint32',
    ...normalizeParams(u)
  });
}
function _boolean(r, u) {
  return new r({ type: 'boolean', ...normalizeParams(u) });
}
function _coercedBoolean(r, u) {
  return new r({ type: 'boolean', coerce: true, ...normalizeParams(u) });
}
function _bigint(r, u) {
  return new r({ type: 'bigint', ...normalizeParams(u) });
}
function _coercedBigint(r, u) {
  return new r({ type: 'bigint', coerce: true, ...normalizeParams(u) });
}
function _int64(r, u) {
  return new r({
    type: 'bigint',
    check: 'bigint_format',
    abort: false,
    format: 'int64',
    ...normalizeParams(u)
  });
}
function _uint64(r, u) {
  return new r({
    type: 'bigint',
    check: 'bigint_format',
    abort: false,
    format: 'uint64',
    ...normalizeParams(u)
  });
}
function _symbol(r, u) {
  return new r({ type: 'symbol', ...normalizeParams(u) });
}
function api_undefined(r, u) {
  return new r({ type: 'undefined', ...normalizeParams(u) });
}
function api_null(r, u) {
  return new r({ type: 'null', ...normalizeParams(u) });
}
function _any(r) {
  return new r({ type: 'any' });
}
function _unknown(r) {
  return new r({ type: 'unknown' });
}
function _never(r, u) {
  return new r({ type: 'never', ...normalizeParams(u) });
}
function _void(r, u) {
  return new r({ type: 'void', ...normalizeParams(u) });
}
function _date(r, u) {
  return new r({ type: 'date', ...normalizeParams(u) });
}
function _coercedDate(r, u) {
  return new r({ type: 'date', coerce: true, ...normalizeParams(u) });
}
function _nan(r, u) {
  return new r({ type: 'nan', ...normalizeParams(u) });
}
function _lt(r, u) {
  return new Ai({ check: 'less_than', ...normalizeParams(u), value: r, inclusive: false });
}
function _lte(r, u) {
  return new Ai({ check: 'less_than', ...normalizeParams(u), value: r, inclusive: true });
}
function _gt(r, u) {
  return new Ni({ check: 'greater_than', ...normalizeParams(u), value: r, inclusive: false });
}
function _gte(r, u) {
  return new Ni({ check: 'greater_than', ...normalizeParams(u), value: r, inclusive: true });
}
function _positive(r) {
  return _gt(0, r);
}
function _negative(r) {
  return _lt(0, r);
}
function _nonpositive(r) {
  return _lte(0, r);
}
function _nonnegative(r) {
  return _gte(0, r);
}
function _multipleOf(r, u) {
  return new Ri({ check: 'multiple_of', ...normalizeParams(u), value: r });
}
function _maxSize(r, u) {
  return new Zi({ check: 'max_size', ...normalizeParams(u), maximum: r });
}
function _minSize(r, u) {
  return new Fi({ check: 'min_size', ...normalizeParams(u), minimum: r });
}
function _size(r, u) {
  return new qi({ check: 'size_equals', ...normalizeParams(u), size: r });
}
function _maxLength(r, u) {
  const m = new Bi({ check: 'max_length', ...normalizeParams(u), maximum: r });
  return m;
}
function _minLength(r, u) {
  return new Vi({ check: 'min_length', ...normalizeParams(u), minimum: r });
}
function _length(r, u) {
  return new Mi({ check: 'length_equals', ...normalizeParams(u), length: r });
}
function _regex(r, u) {
  return new Ki({
    check: 'string_format',
    format: 'regex',
    ...normalizeParams(u),
    pattern: r
  });
}
function _lowercase(r) {
  return new Wi({ check: 'string_format', format: 'lowercase', ...normalizeParams(r) });
}
function _uppercase(r) {
  return new Gi({ check: 'string_format', format: 'uppercase', ...normalizeParams(r) });
}
function _includes(r, u) {
  return new Hi({
    check: 'string_format',
    format: 'includes',
    ...normalizeParams(u),
    includes: r
  });
}
function _startsWith(r, u) {
  return new Xi({
    check: 'string_format',
    format: 'starts_with',
    ...normalizeParams(u),
    prefix: r
  });
}
function _endsWith(r, u) {
  return new Yi({
    check: 'string_format',
    format: 'ends_with',
    ...normalizeParams(u),
    suffix: r
  });
}
function _property(r, u, m) {
  return new Qi({ check: 'property', property: r, schema: u, ...normalizeParams(m) });
}
function _mime(r, u) {
  return new ea({ check: 'mime_type', mime: r, ...normalizeParams(u) });
}
function _overwrite(r) {
  return new na({ check: 'overwrite', tx: r });
}
function _normalize(r) {
  return _overwrite(u => u.normalize(r));
}
function _trim() {
  return _overwrite(r => r.trim());
}
function _toLowerCase() {
  return _overwrite(r => r.toLowerCase());
}
function _toUpperCase() {
  return _overwrite(r => r.toUpperCase());
}
function _slugify() {
  return _overwrite(r => slugify(r));
}
function _array(r, u, m) {
  return new r({ type: 'array', element: u, ...normalizeParams(m) });
}
function _union(r, u, m) {
  return new r({ type: 'union', options: u, ...normalizeParams(m) });
}
function _xor(r, u, m) {
  return new r({ type: 'union', options: u, inclusive: false, ...normalizeParams(m) });
}
function _discriminatedUnion(r, u, m, v) {
  return new r({ type: 'union', options: m, discriminator: u, ...normalizeParams(v) });
}
function _intersection(r, u, m) {
  return new r({ type: 'intersection', left: u, right: m });
}
function _tuple(r, u, m, v) {
  const b = m instanceof aa;
  const x = b ? v : m;
  const w = b ? m : null;
  return new r({ type: 'tuple', items: u, rest: w, ...normalizeParams(x) });
}
function _record(r, u, m, v) {
  return new r({ type: 'record', keyType: u, valueType: m, ...normalizeParams(v) });
}
function _map(r, u, m, v) {
  return new r({ type: 'map', keyType: u, valueType: m, ...normalizeParams(v) });
}
function _set(r, u, m) {
  return new r({ type: 'set', valueType: u, ...normalizeParams(m) });
}
function _enum(r, u, m) {
  const v = Array.isArray(u) ? Object.fromEntries(u.map(r => [r, r])) : u;
  return new r({ type: 'enum', entries: v, ...normalizeParams(m) });
}
function _nativeEnum(r, u, m) {
  return new r({ type: 'enum', entries: u, ...normalizeParams(m) });
}
function _literal(r, u, m) {
  return new r({ type: 'literal', values: Array.isArray(u) ? u : [u], ...normalizeParams(m) });
}
function _file(r, u) {
  return new r({ type: 'file', ...normalizeParams(u) });
}
function _transform(r, u) {
  return new r({ type: 'transform', transform: u });
}
function _optional(r, u) {
  return new r({ type: 'optional', innerType: u });
}
function _nullable(r, u) {
  return new r({ type: 'nullable', innerType: u });
}
function _default(r, u, m) {
  return new r({
    type: 'default',
    innerType: u,
    get defaultValue() {
      return typeof m === 'function' ? m() : shallowClone(m);
    }
  });
}
function _nonoptional(r, u, m) {
  return new r({ type: 'nonoptional', innerType: u, ...normalizeParams(m) });
}
function _success(r, u) {
  return new r({ type: 'success', innerType: u });
}
function _catch(r, u, m) {
  return new r({
    type: 'catch',
    innerType: u,
    catchValue: typeof m === 'function' ? m : () => m
  });
}
function _pipe(r, u, m) {
  return new r({ type: 'pipe', in: u, out: m });
}
function _readonly(r, u) {
  return new r({ type: 'readonly', innerType: u });
}
function _templateLiteral(r, u, m) {
  return new r({ type: 'template_literal', parts: u, ...normalizeParams(m) });
}
function _lazy(r, u) {
  return new r({ type: 'lazy', getter: u });
}
function _promise(r, u) {
  return new r({ type: 'promise', innerType: u });
}
function _custom(r, u, m) {
  const v = normalizeParams(m);
  v.abort ?? (v.abort = true);
  const b = new r({ type: 'custom', check: 'custom', fn: u, ...v });
  return b;
}
function _refine(r, u, m) {
  const v = new r({ type: 'custom', check: 'custom', fn: u, ...normalizeParams(m) });
  return v;
}
function _superRefine(r) {
  const u = _check(m => {
    m.addIssue = r => {
      if (typeof r === 'string') {
        m.issues.push(util_issue(r, m.value, u._zod.def));
      } else {
        const v = r;
        if (v.fatal) v.continue = false;
        v.code ?? (v.code = 'custom');
        v.input ?? (v.input = m.value);
        v.inst ?? (v.inst = u);
        v.continue ?? (v.continue = !u._zod.def.abort);
        m.issues.push(util_issue(v));
      }
    };
    return r(m.value, m);
  });
  return u;
}
function _check(r, u) {
  const m = new Di({ check: 'custom', ...normalizeParams(u) });
  m._zod.check = r;
  return m;
}
function describe(r) {
  const u = new Di({ check: 'describe' });
  u._zod.onattach = [
    u => {
      const m = Nr.get(u) ?? {};
      Nr.add(u, { ...m, description: r });
    }
  ];
  u._zod.check = () => {};
  return u;
}
function meta(r) {
  const u = new Di({ check: 'meta' });
  u._zod.onattach = [
    u => {
      const m = Nr.get(u) ?? {};
      Nr.add(u, { ...m, ...r });
    }
  ];
  u._zod.check = () => {};
  return u;
}
function _stringbool(r, u) {
  const m = normalizeParams(u);
  let v = m.truthy ?? ['true', '1', 'yes', 'on', 'y', 'enabled'];
  let b = m.falsy ?? ['false', '0', 'no', 'off', 'n', 'disabled'];
  if (m.case !== 'sensitive') {
    v = v.map(r => (typeof r === 'string' ? r.toLowerCase() : r));
    b = b.map(r => (typeof r === 'string' ? r.toLowerCase() : r));
  }
  const x = new Set(v);
  const w = new Set(b);
  const $ = r.Codec ?? Ir;
  const k = r.Boolean ?? Za;
  const S = r.String ?? ra;
  const I = new S({ type: 'string', error: m.error });
  const z = new k({ type: 'boolean', error: m.error });
  const j = new $({
    type: 'pipe',
    in: I,
    out: z,
    transform: (r, u) => {
      let v = r;
      if (m.case !== 'sensitive') v = v.toLowerCase();
      if (x.has(v)) {
        return true;
      } else if (w.has(v)) {
        return false;
      } else {
        u.issues.push({
          code: 'invalid_value',
          expected: 'stringbool',
          values: [...x, ...w],
          input: u.value,
          inst: j,
          continue: false
        });
        return {};
      }
    },
    reverseTransform: (r, u) => {
      if (r === true) {
        return v[0] || 'true';
      } else {
        return b[0] || 'false';
      }
    },
    error: m.error
  });
  return j;
}
function _stringFormat(r, u, m, v = {}) {
  const b = normalizeParams(v);
  const x = {
    ...normalizeParams(v),
    check: 'string_format',
    type: 'string',
    format: u,
    fn: typeof m === 'function' ? m : r => m.test(r),
    ...b
  };
  if (m instanceof RegExp) {
    x.pattern = m;
  }
  const w = new r(x);
  return w;
}
function initializeContext(r) {
  let u = r?.target ?? 'draft-2020-12';
  if (u === 'draft-4') u = 'draft-04';
  if (u === 'draft-7') u = 'draft-07';
  return {
    processors: r.processors ?? {},
    metadataRegistry: r?.metadata ?? Nr,
    target: u,
    unrepresentable: r?.unrepresentable ?? 'throw',
    override: r?.override ?? (() => {}),
    io: r?.io ?? 'output',
    counter: 0,
    seen: new Map(),
    cycles: r?.cycles ?? 'ref',
    reused: r?.reused ?? 'inline',
    external: r?.external ?? undefined
  };
}
function to_json_schema_process(r, u, m = { path: [], schemaPath: [] }) {
  var v;
  const b = r._zod.def;
  const x = u.seen.get(r);
  if (x) {
    x.count++;
    const u = m.schemaPath.includes(r);
    if (u) {
      x.cycle = m.path;
    }
    return x.schema;
  }
  const w = { schema: {}, count: 1, cycle: undefined, path: m.path };
  u.seen.set(r, w);
  const $ = r._zod.toJSONSchema?.();
  if ($) {
    w.schema = $;
  } else {
    const v = { ...m, schemaPath: [...m.schemaPath, r], path: m.path };
    if (r._zod.processJSONSchema) {
      r._zod.processJSONSchema(u, w.schema, v);
    } else {
      const m = w.schema;
      const x = u.processors[b.type];
      if (!x) {
        throw new Error(`[toJSONSchema]: Non-representable type encountered: ${b.type}`);
      }
      x(r, u, m, v);
    }
    const x = r._zod.parent;
    if (x) {
      if (!w.ref) w.ref = x;
      to_json_schema_process(x, u, v);
      u.seen.get(x).isParent = true;
    }
  }
  const k = u.metadataRegistry.get(r);
  if (k) Object.assign(w.schema, k);
  if (u.io === 'input' && isTransforming(r)) {
    delete w.schema.examples;
    delete w.schema.default;
  }
  if (u.io === 'input' && w.schema._prefault)
    (v = w.schema).default ?? (v.default = w.schema._prefault);
  delete w.schema._prefault;
  const S = u.seen.get(r);
  return S.schema;
}
function extractDefs(r, u) {
  const m = r.seen.get(u);
  if (!m) throw new Error('Unprocessed schema. This is a bug in Zod.');
  const v = new Map();
  for (const u of r.seen.entries()) {
    const m = r.metadataRegistry.get(u[0])?.id;
    if (m) {
      const r = v.get(m);
      if (r && r !== u[0]) {
        throw new Error(
          `Duplicate schema id "${m}" detected during JSON Schema conversion. Two different schemas cannot share the same id when converted together.`
        );
      }
      v.set(m, u[0]);
    }
  }
  const makeURI = u => {
    const v = r.target === 'draft-2020-12' ? '$defs' : 'definitions';
    if (r.external) {
      const m = r.external.registry.get(u[0])?.id;
      const b = r.external.uri ?? (r => r);
      if (m) {
        return { ref: b(m) };
      }
      const x = u[1].defId ?? u[1].schema.id ?? `schema${r.counter++}`;
      u[1].defId = x;
      return { defId: x, ref: `${b('__shared')}#/${v}/${x}` };
    }
    if (u[1] === m) {
      return { ref: '#' };
    }
    const b = `#`;
    const x = `${b}/${v}/`;
    const w = u[1].schema.id ?? `__schema${r.counter++}`;
    return { defId: w, ref: x + w };
  };
  const extractToDef = r => {
    if (r[1].schema.$ref) {
      return;
    }
    const u = r[1];
    const { ref: m, defId: v } = makeURI(r);
    u.def = { ...u.schema };
    if (v) u.defId = v;
    const b = u.schema;
    for (const r in b) {
      delete b[r];
    }
    b.$ref = m;
  };
  if (r.cycles === 'throw') {
    for (const u of r.seen.entries()) {
      const r = u[1];
      if (r.cycle) {
        throw new Error(
          'Cycle detected: ' +
            `#/${r.cycle?.join('/')}/<root>` +
            '\n\nSet the `cycles` parameter to `"ref"` to resolve cyclical schemas with defs.'
        );
      }
    }
  }
  for (const m of r.seen.entries()) {
    const v = m[1];
    if (u === m[0]) {
      extractToDef(m);
      continue;
    }
    if (r.external) {
      const v = r.external.registry.get(m[0])?.id;
      if (u !== m[0] && v) {
        extractToDef(m);
        continue;
      }
    }
    const b = r.metadataRegistry.get(m[0])?.id;
    if (b) {
      extractToDef(m);
      continue;
    }
    if (v.cycle) {
      extractToDef(m);
      continue;
    }
    if (v.count > 1) {
      if (r.reused === 'ref') {
        extractToDef(m);
        continue;
      }
    }
  }
}
function finalize(r, u) {
  const m = r.seen.get(u);
  if (!m) throw new Error('Unprocessed schema. This is a bug in Zod.');
  const flattenRef = u => {
    const m = r.seen.get(u);
    if (m.ref === null) return;
    const v = m.def ?? m.schema;
    const b = { ...v };
    const x = m.ref;
    m.ref = null;
    if (x) {
      flattenRef(x);
      const m = r.seen.get(x);
      const w = m.schema;
      if (
        w.$ref &&
        (r.target === 'draft-07' || r.target === 'draft-04' || r.target === 'openapi-3.0')
      ) {
        v.allOf = v.allOf ?? [];
        v.allOf.push(w);
      } else {
        Object.assign(v, w);
      }
      Object.assign(v, b);
      const $ = u._zod.parent === x;
      if ($) {
        for (const r in v) {
          if (r === '$ref' || r === 'allOf') continue;
          if (!(r in b)) {
            delete v[r];
          }
        }
      }
      if (w.$ref && m.def) {
        for (const r in v) {
          if (r === '$ref' || r === 'allOf') continue;
          if (r in m.def && JSON.stringify(v[r]) === JSON.stringify(m.def[r])) {
            delete v[r];
          }
        }
      }
    }
    const w = u._zod.parent;
    if (w && w !== x) {
      flattenRef(w);
      const u = r.seen.get(w);
      if (u?.schema.$ref) {
        v.$ref = u.schema.$ref;
        if (u.def) {
          for (const r in v) {
            if (r === '$ref' || r === 'allOf') continue;
            if (r in u.def && JSON.stringify(v[r]) === JSON.stringify(u.def[r])) {
              delete v[r];
            }
          }
        }
      }
    }
    r.override({ zodSchema: u, jsonSchema: v, path: m.path ?? [] });
  };
  for (const u of [...r.seen.entries()].reverse()) {
    flattenRef(u[0]);
  }
  const v = {};
  if (r.target === 'draft-2020-12') {
    v.$schema = 'https://json-schema.org/draft/2020-12/schema';
  } else if (r.target === 'draft-07') {
    v.$schema = 'http://json-schema.org/draft-07/schema#';
  } else if (r.target === 'draft-04') {
    v.$schema = 'http://json-schema.org/draft-04/schema#';
  } else if (r.target === 'openapi-3.0') {
  } else {
  }
  if (r.external?.uri) {
    const m = r.external.registry.get(u)?.id;
    if (!m) throw new Error('Schema is missing an `id` property');
    v.$id = r.external.uri(m);
  }
  Object.assign(v, m.def ?? m.schema);
  const b = r.external?.defs ?? {};
  for (const u of r.seen.entries()) {
    const r = u[1];
    if (r.def && r.defId) {
      b[r.defId] = r.def;
    }
  }
  if (r.external) {
  } else {
    if (Object.keys(b).length > 0) {
      if (r.target === 'draft-2020-12') {
        v.$defs = b;
      } else {
        v.definitions = b;
      }
    }
  }
  try {
    const m = JSON.parse(JSON.stringify(v));
    Object.defineProperty(m, '~standard', {
      value: {
        ...u['~standard'],
        jsonSchema: {
          input: createStandardJSONSchemaMethod(u, 'input', r.processors),
          output: createStandardJSONSchemaMethod(u, 'output', r.processors)
        }
      },
      enumerable: false,
      writable: false
    });
    return m;
  } catch (r) {
    throw new Error('Error converting schema to JSON.');
  }
}
function isTransforming(r, u) {
  const m = u ?? { seen: new Set() };
  if (m.seen.has(r)) return false;
  m.seen.add(r);
  const v = r._zod.def;
  if (v.type === 'transform') return true;
  if (v.type === 'array') return isTransforming(v.element, m);
  if (v.type === 'set') return isTransforming(v.valueType, m);
  if (v.type === 'lazy') return isTransforming(v.getter(), m);
  if (
    v.type === 'promise' ||
    v.type === 'optional' ||
    v.type === 'nonoptional' ||
    v.type === 'nullable' ||
    v.type === 'readonly' ||
    v.type === 'default' ||
    v.type === 'prefault'
  ) {
    return isTransforming(v.innerType, m);
  }
  if (v.type === 'intersection') {
    return isTransforming(v.left, m) || isTransforming(v.right, m);
  }
  if (v.type === 'record' || v.type === 'map') {
    return isTransforming(v.keyType, m) || isTransforming(v.valueType, m);
  }
  if (v.type === 'pipe') {
    return isTransforming(v.in, m) || isTransforming(v.out, m);
  }
  if (v.type === 'object') {
    for (const r in v.shape) {
      if (isTransforming(v.shape[r], m)) return true;
    }
    return false;
  }
  if (v.type === 'union') {
    for (const r of v.options) {
      if (isTransforming(r, m)) return true;
    }
    return false;
  }
  if (v.type === 'tuple') {
    for (const r of v.items) {
      if (isTransforming(r, m)) return true;
    }
    if (v.rest && isTransforming(v.rest, m)) return true;
    return false;
  }
  return false;
}
const createToJSONSchemaMethod =
  (r, u = {}) =>
  m => {
    const v = initializeContext({ ...m, processors: u });
    to_json_schema_process(r, v);
    extractDefs(v, r);
    return finalize(v, r);
  };
const createStandardJSONSchemaMethod =
  (r, u, m = {}) =>
  v => {
    const { libraryOptions: b, target: x } = v ?? {};
    const w = initializeContext({ ...(b ?? {}), target: x, io: u, processors: m });
    to_json_schema_process(r, w);
    extractDefs(w, r);
    return finalize(w, r);
  };
const Cr = {
  guid: 'uuid',
  url: 'uri',
  datetime: 'date-time',
  json_string: 'json-string',
  regex: ''
};
const stringProcessor = (r, u, m, v) => {
  const b = m;
  b.type = 'string';
  const { minimum: x, maximum: w, format: $, patterns: k, contentEncoding: S } = r._zod.bag;
  if (typeof x === 'number') b.minLength = x;
  if (typeof w === 'number') b.maxLength = w;
  if ($) {
    b.format = Cr[$] ?? $;
    if (b.format === '') delete b.format;
    if ($ === 'time') {
      delete b.format;
    }
  }
  if (S) b.contentEncoding = S;
  if (k && k.size > 0) {
    const r = [...k];
    if (r.length === 1) b.pattern = r[0].source;
    else if (r.length > 1) {
      b.allOf = [
        ...r.map(r => ({
          ...(u.target === 'draft-07' || u.target === 'draft-04' || u.target === 'openapi-3.0'
            ? { type: 'string' }
            : {}),
          pattern: r.source
        }))
      ];
    }
  }
};
const numberProcessor = (r, u, m, v) => {
  const b = m;
  const {
    minimum: x,
    maximum: w,
    format: $,
    multipleOf: k,
    exclusiveMaximum: S,
    exclusiveMinimum: I
  } = r._zod.bag;
  if (typeof $ === 'string' && $.includes('int')) b.type = 'integer';
  else b.type = 'number';
  if (typeof I === 'number') {
    if (u.target === 'draft-04' || u.target === 'openapi-3.0') {
      b.minimum = I;
      b.exclusiveMinimum = true;
    } else {
      b.exclusiveMinimum = I;
    }
  }
  if (typeof x === 'number') {
    b.minimum = x;
    if (typeof I === 'number' && u.target !== 'draft-04') {
      if (I >= x) delete b.minimum;
      else delete b.exclusiveMinimum;
    }
  }
  if (typeof S === 'number') {
    if (u.target === 'draft-04' || u.target === 'openapi-3.0') {
      b.maximum = S;
      b.exclusiveMaximum = true;
    } else {
      b.exclusiveMaximum = S;
    }
  }
  if (typeof w === 'number') {
    b.maximum = w;
    if (typeof S === 'number' && u.target !== 'draft-04') {
      if (S <= w) delete b.maximum;
      else delete b.exclusiveMaximum;
    }
  }
  if (typeof k === 'number') b.multipleOf = k;
};
const booleanProcessor = (r, u, m, v) => {
  m.type = 'boolean';
};
const bigintProcessor = (r, u, m, v) => {
  if (u.unrepresentable === 'throw') {
    throw new Error('BigInt cannot be represented in JSON Schema');
  }
};
const symbolProcessor = (r, u, m, v) => {
  if (u.unrepresentable === 'throw') {
    throw new Error('Symbols cannot be represented in JSON Schema');
  }
};
const nullProcessor = (r, u, m, v) => {
  if (u.target === 'openapi-3.0') {
    m.type = 'string';
    m.nullable = true;
    m.enum = [null];
  } else {
    m.type = 'null';
  }
};
const undefinedProcessor = (r, u, m, v) => {
  if (u.unrepresentable === 'throw') {
    throw new Error('Undefined cannot be represented in JSON Schema');
  }
};
const voidProcessor = (r, u, m, v) => {
  if (u.unrepresentable === 'throw') {
    throw new Error('Void cannot be represented in JSON Schema');
  }
};
const neverProcessor = (r, u, m, v) => {
  m.not = {};
};
const anyProcessor = (r, u, m, v) => {};
const unknownProcessor = (r, u, m, v) => {};
const dateProcessor = (r, u, m, v) => {
  if (u.unrepresentable === 'throw') {
    throw new Error('Date cannot be represented in JSON Schema');
  }
};
const enumProcessor = (r, u, m, v) => {
  const b = r._zod.def;
  const x = getEnumValues(b.entries);
  if (x.every(r => typeof r === 'number')) m.type = 'number';
  if (x.every(r => typeof r === 'string')) m.type = 'string';
  m.enum = x;
};
const literalProcessor = (r, u, m, v) => {
  const b = r._zod.def;
  const x = [];
  for (const r of b.values) {
    if (r === undefined) {
      if (u.unrepresentable === 'throw') {
        throw new Error('Literal `undefined` cannot be represented in JSON Schema');
      } else {
      }
    } else if (typeof r === 'bigint') {
      if (u.unrepresentable === 'throw') {
        throw new Error('BigInt literals cannot be represented in JSON Schema');
      } else {
        x.push(Number(r));
      }
    } else {
      x.push(r);
    }
  }
  if (x.length === 0) {
  } else if (x.length === 1) {
    const r = x[0];
    m.type = r === null ? 'null' : typeof r;
    if (u.target === 'draft-04' || u.target === 'openapi-3.0') {
      m.enum = [r];
    } else {
      m.const = r;
    }
  } else {
    if (x.every(r => typeof r === 'number')) m.type = 'number';
    if (x.every(r => typeof r === 'string')) m.type = 'string';
    if (x.every(r => typeof r === 'boolean')) m.type = 'boolean';
    if (x.every(r => r === null)) m.type = 'null';
    m.enum = x;
  }
};
const nanProcessor = (r, u, m, v) => {
  if (u.unrepresentable === 'throw') {
    throw new Error('NaN cannot be represented in JSON Schema');
  }
};
const templateLiteralProcessor = (r, u, m, v) => {
  const b = m;
  const x = r._zod.pattern;
  if (!x) throw new Error('Pattern not found in template literal');
  b.type = 'string';
  b.pattern = x.source;
};
const fileProcessor = (r, u, m, v) => {
  const b = m;
  const x = { type: 'string', format: 'binary', contentEncoding: 'binary' };
  const { minimum: w, maximum: $, mime: k } = r._zod.bag;
  if (w !== undefined) x.minLength = w;
  if ($ !== undefined) x.maxLength = $;
  if (k) {
    if (k.length === 1) {
      x.contentMediaType = k[0];
      Object.assign(b, x);
    } else {
      Object.assign(b, x);
      b.anyOf = k.map(r => ({ contentMediaType: r }));
    }
  } else {
    Object.assign(b, x);
  }
};
const successProcessor = (r, u, m, v) => {
  m.type = 'boolean';
};
const customProcessor = (r, u, m, v) => {
  if (u.unrepresentable === 'throw') {
    throw new Error('Custom types cannot be represented in JSON Schema');
  }
};
const functionProcessor = (r, u, m, v) => {
  if (u.unrepresentable === 'throw') {
    throw new Error('Function types cannot be represented in JSON Schema');
  }
};
const transformProcessor = (r, u, m, v) => {
  if (u.unrepresentable === 'throw') {
    throw new Error('Transforms cannot be represented in JSON Schema');
  }
};
const mapProcessor = (r, u, m, v) => {
  if (u.unrepresentable === 'throw') {
    throw new Error('Map cannot be represented in JSON Schema');
  }
};
const setProcessor = (r, u, m, v) => {
  if (u.unrepresentable === 'throw') {
    throw new Error('Set cannot be represented in JSON Schema');
  }
};
const arrayProcessor = (r, u, m, v) => {
  const b = m;
  const x = r._zod.def;
  const { minimum: w, maximum: $ } = r._zod.bag;
  if (typeof w === 'number') b.minItems = w;
  if (typeof $ === 'number') b.maxItems = $;
  b.type = 'array';
  b.items = to_json_schema_process(x.element, u, { ...v, path: [...v.path, 'items'] });
};
const objectProcessor = (r, u, m, v) => {
  const b = m;
  const x = r._zod.def;
  b.type = 'object';
  b.properties = {};
  const w = x.shape;
  for (const r in w) {
    b.properties[r] = to_json_schema_process(w[r], u, {
      ...v,
      path: [...v.path, 'properties', r]
    });
  }
  const $ = new Set(Object.keys(w));
  const k = new Set(
    [...$].filter(r => {
      const m = x.shape[r]._zod;
      if (u.io === 'input') {
        return m.optin === undefined;
      } else {
        return m.optout === undefined;
      }
    })
  );
  if (k.size > 0) {
    b.required = Array.from(k);
  }
  if (x.catchall?._zod.def.type === 'never') {
    b.additionalProperties = false;
  } else if (!x.catchall) {
    if (u.io === 'output') b.additionalProperties = false;
  } else if (x.catchall) {
    b.additionalProperties = to_json_schema_process(x.catchall, u, {
      ...v,
      path: [...v.path, 'additionalProperties']
    });
  }
};
const unionProcessor = (r, u, m, v) => {
  const b = r._zod.def;
  const x = b.inclusive === false;
  const w = b.options.map((r, m) =>
    to_json_schema_process(r, u, { ...v, path: [...v.path, x ? 'oneOf' : 'anyOf', m] })
  );
  if (x) {
    m.oneOf = w;
  } else {
    m.anyOf = w;
  }
};
const intersectionProcessor = (r, u, m, v) => {
  const b = r._zod.def;
  const x = to_json_schema_process(b.left, u, { ...v, path: [...v.path, 'allOf', 0] });
  const w = to_json_schema_process(b.right, u, { ...v, path: [...v.path, 'allOf', 1] });
  const isSimpleIntersection = r => 'allOf' in r && Object.keys(r).length === 1;
  const $ = [
    ...(isSimpleIntersection(x) ? x.allOf : [x]),
    ...(isSimpleIntersection(w) ? w.allOf : [w])
  ];
  m.allOf = $;
};
const tupleProcessor = (r, u, m, v) => {
  const b = m;
  const x = r._zod.def;
  b.type = 'array';
  const w = u.target === 'draft-2020-12' ? 'prefixItems' : 'items';
  const $ =
    u.target === 'draft-2020-12'
      ? 'items'
      : u.target === 'openapi-3.0'
        ? 'items'
        : 'additionalItems';
  const k = x.items.map((r, m) =>
    to_json_schema_process(r, u, { ...v, path: [...v.path, w, m] })
  );
  const S = x.rest
    ? to_json_schema_process(x.rest, u, {
        ...v,
        path: [...v.path, $, ...(u.target === 'openapi-3.0' ? [x.items.length] : [])]
      })
    : null;
  if (u.target === 'draft-2020-12') {
    b.prefixItems = k;
    if (S) {
      b.items = S;
    }
  } else if (u.target === 'openapi-3.0') {
    b.items = { anyOf: k };
    if (S) {
      b.items.anyOf.push(S);
    }
    b.minItems = k.length;
    if (!S) {
      b.maxItems = k.length;
    }
  } else {
    b.items = k;
    if (S) {
      b.additionalItems = S;
    }
  }
  const { minimum: I, maximum: z } = r._zod.bag;
  if (typeof I === 'number') b.minItems = I;
  if (typeof z === 'number') b.maxItems = z;
};
const recordProcessor = (r, u, m, v) => {
  const b = m;
  const x = r._zod.def;
  b.type = 'object';
  const w = x.keyType;
  const $ = w._zod.bag;
  const k = $?.patterns;
  if (x.mode === 'loose' && k && k.size > 0) {
    const r = to_json_schema_process(x.valueType, u, {
      ...v,
      path: [...v.path, 'patternProperties', '*']
    });
    b.patternProperties = {};
    for (const u of k) {
      b.patternProperties[u.source] = r;
    }
  } else {
    if (u.target === 'draft-07' || u.target === 'draft-2020-12') {
      b.propertyNames = to_json_schema_process(x.keyType, u, {
        ...v,
        path: [...v.path, 'propertyNames']
      });
    }
    b.additionalProperties = to_json_schema_process(x.valueType, u, {
      ...v,
      path: [...v.path, 'additionalProperties']
    });
  }
  const S = w._zod.values;
  if (S) {
    const r = [...S].filter(r => typeof r === 'string' || typeof r === 'number');
    if (r.length > 0) {
      b.required = r;
    }
  }
};
const nullableProcessor = (r, u, m, v) => {
  const b = r._zod.def;
  const x = to_json_schema_process(b.innerType, u, v);
  const w = u.seen.get(r);
  if (u.target === 'openapi-3.0') {
    w.ref = b.innerType;
    m.nullable = true;
  } else {
    m.anyOf = [x, { type: 'null' }];
  }
};
const nonoptionalProcessor = (r, u, m, v) => {
  const b = r._zod.def;
  to_json_schema_process(b.innerType, u, v);
  const x = u.seen.get(r);
  x.ref = b.innerType;
};
const defaultProcessor = (r, u, m, v) => {
  const b = r._zod.def;
  to_json_schema_process(b.innerType, u, v);
  const x = u.seen.get(r);
  x.ref = b.innerType;
  m.default = JSON.parse(JSON.stringify(b.defaultValue));
};
const prefaultProcessor = (r, u, m, v) => {
  const b = r._zod.def;
  to_json_schema_process(b.innerType, u, v);
  const x = u.seen.get(r);
  x.ref = b.innerType;
  if (u.io === 'input') m._prefault = JSON.parse(JSON.stringify(b.defaultValue));
};
const catchProcessor = (r, u, m, v) => {
  const b = r._zod.def;
  to_json_schema_process(b.innerType, u, v);
  const x = u.seen.get(r);
  x.ref = b.innerType;
  let w;
  try {
    w = b.catchValue(undefined);
  } catch {
    throw new Error('Dynamic catch values are not supported in JSON Schema');
  }
  m.default = w;
};
const pipeProcessor = (r, u, m, v) => {
  const b = r._zod.def;
  const x = u.io === 'input' ? (b.in._zod.def.type === 'transform' ? b.out : b.in) : b.out;
  to_json_schema_process(x, u, v);
  const w = u.seen.get(r);
  w.ref = x;
};
const readonlyProcessor = (r, u, m, v) => {
  const b = r._zod.def;
  to_json_schema_process(b.innerType, u, v);
  const x = u.seen.get(r);
  x.ref = b.innerType;
  m.readOnly = true;
};
const promiseProcessor = (r, u, m, v) => {
  const b = r._zod.def;
  to_json_schema_process(b.innerType, u, v);
  const x = u.seen.get(r);
  x.ref = b.innerType;
};
const optionalProcessor = (r, u, m, v) => {
  const b = r._zod.def;
  to_json_schema_process(b.innerType, u, v);
  const x = u.seen.get(r);
  x.ref = b.innerType;
};
const lazyProcessor = (r, u, m, v) => {
  const b = r._zod.innerType;
  to_json_schema_process(b, u, v);
  const x = u.seen.get(r);
  x.ref = b;
};
const Lr = {
  string: stringProcessor,
  number: numberProcessor,
  boolean: booleanProcessor,
  bigint: bigintProcessor,
  symbol: symbolProcessor,
  null: nullProcessor,
  undefined: undefinedProcessor,
  void: voidProcessor,
  never: neverProcessor,
  any: anyProcessor,
  unknown: unknownProcessor,
  date: dateProcessor,
  enum: enumProcessor,
  literal: literalProcessor,
  nan: nanProcessor,
  template_literal: templateLiteralProcessor,
  file: fileProcessor,
  success: successProcessor,
  custom: customProcessor,
  function: functionProcessor,
  transform: transformProcessor,
  map: mapProcessor,
  set: setProcessor,
  array: arrayProcessor,
  object: objectProcessor,
  union: unionProcessor,
  intersection: intersectionProcessor,
  tuple: tupleProcessor,
  record: recordProcessor,
  nullable: nullableProcessor,
  nonoptional: nonoptionalProcessor,
  default: defaultProcessor,
  prefault: prefaultProcessor,
  catch: catchProcessor,
  pipe: pipeProcessor,
  readonly: readonlyProcessor,
  promise: promiseProcessor,
  optional: optionalProcessor,
  lazy: lazyProcessor
};
function toJSONSchema(r, u) {
  if ('_idmap' in r) {
    const m = r;
    const v = initializeContext({ ...u, processors: Lr });
    const b = {};
    for (const r of m._idmap.entries()) {
      const [u, m] = r;
      to_json_schema_process(m, v);
    }
    const x = {};
    const w = { registry: m, uri: u?.uri, defs: b };
    v.external = w;
    for (const r of m._idmap.entries()) {
      const [u, m] = r;
      extractDefs(v, m);
      x[u] = finalize(v, m);
    }
    if (Object.keys(b).length > 0) {
      const r = v.target === 'draft-2020-12' ? '$defs' : 'definitions';
      x.__shared = { [r]: b };
    }
    return { schemas: x };
  }
  const m = initializeContext({ ...u, processors: Lr });
  to_json_schema_process(r, m);
  extractDefs(m, r);
  return finalize(m, r);
}
class JSONSchemaGenerator {
  get metadataRegistry() {
    return this.ctx.metadataRegistry;
  }
  get target() {
    return this.ctx.target;
  }
  get unrepresentable() {
    return this.ctx.unrepresentable;
  }
  get override() {
    return this.ctx.override;
  }
  get io() {
    return this.ctx.io;
  }
  get counter() {
    return this.ctx.counter;
  }
  set counter(r) {
    this.ctx.counter = r;
  }
  get seen() {
    return this.ctx.seen;
  }
  constructor(r) {
    let u = r?.target ?? 'draft-2020-12';
    if (u === 'draft-4') u = 'draft-04';
    if (u === 'draft-7') u = 'draft-07';
    this.ctx = initializeContext({
      processors: Lr,
      target: u,
      ...(r?.metadata && { metadata: r.metadata }),
      ...(r?.unrepresentable && { unrepresentable: r.unrepresentable }),
      ...(r?.override && { override: r.override }),
      ...(r?.io && { io: r.io })
    });
  }
  process(r, u = { path: [], schemaPath: [] }) {
    return to_json_schema_process(r, this.ctx, u);
  }
  emit(r, u) {
    if (u) {
      if (u.cycles) this.ctx.cycles = u.cycles;
      if (u.reused) this.ctx.reused = u.reused;
      if (u.external) this.ctx.external = u.external;
    }
    extractDefs(this.ctx, r);
    const m = finalize(this.ctx, r);
    const { '~standard': v, ...b } = m;
    return b;
  }
}
const Zr = $constructor('ZodISODateTime', (r, u) => {
  wa.init(r, u);
  uo.init(r, u);
});
function iso_datetime(r) {
  return _isoDateTime(Zr, r);
}
const Fr = $constructor('ZodISODate', (r, u) => {
  $a.init(r, u);
  uo.init(r, u);
});
function iso_date(r) {
  return _isoDate(Fr, r);
}
const qr = $constructor('ZodISOTime', (r, u) => {
  Sa.init(r, u);
  uo.init(r, u);
});
function iso_time(r) {
  return _isoTime(qr, r);
}
const Br = $constructor('ZodISODuration', (r, u) => {
  Ia.init(r, u);
  uo.init(r, u);
});
function iso_duration(r) {
  return _isoDuration(Br, r);
}
const errors_initializer = (r, u) => {
  vn.init(r, u);
  r.name = 'ZodError';
  Object.defineProperties(r, {
    format: { value: u => formatError(r, u) },
    flatten: { value: u => flattenError(r, u) },
    addIssue: {
      value: u => {
        r.issues.push(u);
        r.message = JSON.stringify(r.issues, jsonStringifyReplacer, 2);
      }
    },
    addIssues: {
      value: u => {
        r.issues.push(...u);
        r.message = JSON.stringify(r.issues, jsonStringifyReplacer, 2);
      }
    },
    isEmpty: {
      get() {
        return r.issues.length === 0;
      }
    }
  });
};
const Vr = $constructor('ZodError', errors_initializer);
const Mr = $constructor('ZodError', errors_initializer, { Parent: Error });
const Jr = _parse(Mr);
const Kr = _parseAsync(Mr);
const Wr = _safeParse(Mr);
const Gr = _safeParseAsync(Mr);
const Hr = _encode(Mr);
const Xr = _decode(Mr);
const Yr = _encodeAsync(Mr);
const Qr = _decodeAsync(Mr);
const to = _safeEncode(Mr);
const io = _safeDecode(Mr);
const ao = _safeEncodeAsync(Mr);
const ro = _safeDecodeAsync(Mr);
const oo = $constructor('ZodType', (r, u) => {
  aa.init(r, u);
  Object.assign(r['~standard'], {
    jsonSchema: {
      input: createStandardJSONSchemaMethod(r, 'input'),
      output: createStandardJSONSchemaMethod(r, 'output')
    }
  });
  r.toJSONSchema = createToJSONSchemaMethod(r, {});
  r.def = u;
  r.type = u.type;
  Object.defineProperty(r, '_def', { value: u });
  r.check = (...m) =>
    r.clone(
      mergeDefs(u, {
        checks: [
          ...(u.checks ?? []),
          ...m.map(r =>
            typeof r === 'function'
              ? { _zod: { check: r, def: { check: 'custom' }, onattach: [] } }
              : r
          )
        ]
      }),
      { parent: true }
    );
  r.with = r.check;
  r.clone = (u, m) => clone(r, u, m);
  r.brand = () => r;
  r.register = (u, m) => {
    u.add(r, m);
    return r;
  };
  r.parse = (u, m) => Jr(r, u, m, { callee: r.parse });
  r.safeParse = (u, m) => Wr(r, u, m);
  r.parseAsync = async (u, m) => Kr(r, u, m, { callee: r.parseAsync });
  r.safeParseAsync = async (u, m) => Gr(r, u, m);
  r.spa = r.safeParseAsync;
  r.encode = (u, m) => Hr(r, u, m);
  r.decode = (u, m) => Xr(r, u, m);
  r.encodeAsync = async (u, m) => Yr(r, u, m);
  r.decodeAsync = async (u, m) => Qr(r, u, m);
  r.safeEncode = (u, m) => to(r, u, m);
  r.safeDecode = (u, m) => io(r, u, m);
  r.safeEncodeAsync = async (u, m) => ao(r, u, m);
  r.safeDecodeAsync = async (u, m) => ro(r, u, m);
  r.refine = (u, m) => r.check(refine(u, m));
  r.superRefine = u => r.check(superRefine(u));
  r.overwrite = u => r.check(_overwrite(u));
  r.optional = () => optional(r);
  r.exactOptional = () => exactOptional(r);
  r.nullable = () => nullable(r);
  r.nullish = () => optional(nullable(r));
  r.nonoptional = u => nonoptional(r, u);
  r.array = () => array(r);
  r.or = u => union([r, u]);
  r.and = u => intersection(r, u);
  r.transform = u => pipe(r, transform(u));
  r.default = u => schemas_default(r, u);
  r.prefault = u => prefault(r, u);
  r.catch = u => schemas_catch(r, u);
  r.pipe = u => pipe(r, u);
  r.readonly = () => readonly(r);
  r.describe = u => {
    const m = r.clone();
    Nr.add(m, { description: u });
    return m;
  };
  Object.defineProperty(r, 'description', {
    get() {
      return Nr.get(r)?.description;
    },
    configurable: true
  });
  r.meta = (...u) => {
    if (u.length === 0) {
      return Nr.get(r);
    }
    const m = r.clone();
    Nr.add(m, u[0]);
    return m;
  };
  r.isOptional = () => r.safeParse(undefined).success;
  r.isNullable = () => r.safeParse(null).success;
  r.apply = u => u(r);
  return r;
});
const so = $constructor('_ZodString', (r, u) => {
  ra.init(r, u);
  oo.init(r, u);
  r._zod.processJSONSchema = (u, m, v) => stringProcessor(r, u, m, v);
  const m = r._zod.bag;
  r.format = m.format ?? null;
  r.minLength = m.minimum ?? null;
  r.maxLength = m.maximum ?? null;
  r.regex = (...u) => r.check(_regex(...u));
  r.includes = (...u) => r.check(_includes(...u));
  r.startsWith = (...u) => r.check(_startsWith(...u));
  r.endsWith = (...u) => r.check(_endsWith(...u));
  r.min = (...u) => r.check(_minLength(...u));
  r.max = (...u) => r.check(_maxLength(...u));
  r.length = (...u) => r.check(_length(...u));
  r.nonempty = (...u) => r.check(_minLength(1, ...u));
  r.lowercase = u => r.check(_lowercase(u));
  r.uppercase = u => r.check(_uppercase(u));
  r.trim = () => r.check(_trim());
  r.normalize = (...u) => r.check(_normalize(...u));
  r.toLowerCase = () => r.check(_toLowerCase());
  r.toUpperCase = () => r.check(_toUpperCase());
  r.slugify = () => r.check(_slugify());
});
const co = $constructor('ZodString', (r, u) => {
  ra.init(r, u);
  so.init(r, u);
  r.email = u => r.check(_email(lo, u));
  r.url = u => r.check(_url(fo, u));
  r.jwt = u => r.check(_jwt(Eo, u));
  r.emoji = u => r.check(api_emoji(ho, u));
  r.guid = u => r.check(_guid(po, u));
  r.uuid = u => r.check(_uuid(mo, u));
  r.uuidv4 = u => r.check(_uuidv4(mo, u));
  r.uuidv6 = u => r.check(_uuidv6(mo, u));
  r.uuidv7 = u => r.check(_uuidv7(mo, u));
  r.nanoid = u => r.check(_nanoid(go, u));
  r.guid = u => r.check(_guid(po, u));
  r.cuid = u => r.check(_cuid(vo, u));
  r.cuid2 = u => r.check(_cuid2(bo, u));
  r.ulid = u => r.check(_ulid(xo, u));
  r.base64 = u => r.check(_base64(Oo, u));
  r.base64url = u => r.check(_base64url(Po, u));
  r.xid = u => r.check(_xid(_o, u));
  r.ksuid = u => r.check(_ksuid(wo, u));
  r.ipv4 = u => r.check(_ipv4($o, u));
  r.ipv6 = u => r.check(_ipv6(Io, u));
  r.cidrv4 = u => r.check(_cidrv4(zo, u));
  r.cidrv6 = u => r.check(_cidrv6(jo, u));
  r.e164 = u => r.check(_e164(Uo, u));
  r.datetime = u => r.check(iso_datetime(u));
  r.date = u => r.check(iso_date(u));
  r.time = u => r.check(iso_time(u));
  r.duration = u => r.check(iso_duration(u));
});
function schemas_string(r) {
  return _string(co, r);
}
const uo = $constructor('ZodStringFormat', (r, u) => {
  oa.init(r, u);
  so.init(r, u);
});
const lo = $constructor('ZodEmail', (r, u) => {
  pa.init(r, u);
  uo.init(r, u);
});
function schemas_email(r) {
  return _email(lo, r);
}
const po = $constructor('ZodGUID', (r, u) => {
  sa.init(r, u);
  uo.init(r, u);
});
function schemas_guid(r) {
  return _guid(po, r);
}
const mo = $constructor('ZodUUID', (r, u) => {
  la.init(r, u);
  uo.init(r, u);
});
function schemas_uuid(r) {
  return _uuid(mo, r);
}
function uuidv4(r) {
  return _uuidv4(mo, r);
}
function uuidv6(r) {
  return _uuidv6(mo, r);
}
function uuidv7(r) {
  return _uuidv7(mo, r);
}
const fo = $constructor('ZodURL', (r, u) => {
  ma.init(r, u);
  uo.init(r, u);
});
function url(r) {
  return _url(fo, r);
}
function httpUrl(r) {
  return _url(fo, { protocol: /^https?$/, hostname: ii, ...normalizeParams(r) });
}
const ho = $constructor('ZodEmoji', (r, u) => {
  ha.init(r, u);
  uo.init(r, u);
});
function schemas_emoji(r) {
  return api_emoji(ho, r);
}
const go = $constructor('ZodNanoID', (r, u) => {
  ga.init(r, u);
  uo.init(r, u);
});
function schemas_nanoid(r) {
  return _nanoid(go, r);
}
const vo = $constructor('ZodCUID', (r, u) => {
  va.init(r, u);
  uo.init(r, u);
});
function schemas_cuid(r) {
  return _cuid(vo, r);
}
const bo = $constructor('ZodCUID2', (r, u) => {
  ba.init(r, u);
  uo.init(r, u);
});
function schemas_cuid2(r) {
  return _cuid2(bo, r);
}
const xo = $constructor('ZodULID', (r, u) => {
  ya.init(r, u);
  uo.init(r, u);
});
function schemas_ulid(r) {
  return _ulid(xo, r);
}
const _o = $constructor('ZodXID', (r, u) => {
  xa.init(r, u);
  uo.init(r, u);
});
function schemas_xid(r) {
  return _xid(_o, r);
}
const wo = $constructor('ZodKSUID', (r, u) => {
  _a.init(r, u);
  uo.init(r, u);
});
function schemas_ksuid(r) {
  return _ksuid(wo, r);
}
const $o = $constructor('ZodIPv4', (r, u) => {
  za.init(r, u);
  uo.init(r, u);
});
function schemas_ipv4(r) {
  return _ipv4($o, r);
}
const So = $constructor('ZodMAC', (r, u) => {
  Pa.init(r, u);
  uo.init(r, u);
});
function schemas_mac(r) {
  return _mac(So, r);
}
const Io = $constructor('ZodIPv6', (r, u) => {
  Oa.init(r, u);
  uo.init(r, u);
});
function schemas_ipv6(r) {
  return _ipv6(Io, r);
}
const zo = $constructor('ZodCIDRv4', (r, u) => {
  Ua.init(r, u);
  uo.init(r, u);
});
function schemas_cidrv4(r) {
  return _cidrv4(zo, r);
}
const jo = $constructor('ZodCIDRv6', (r, u) => {
  Ea.init(r, u);
  uo.init(r, u);
});
function schemas_cidrv6(r) {
  return _cidrv6(jo, r);
}
const Oo = $constructor('ZodBase64', (r, u) => {
  Da.init(r, u);
  uo.init(r, u);
});
function schemas_base64(r) {
  return _base64(Oo, r);
}
const Po = $constructor('ZodBase64URL', (r, u) => {
  Ta.init(r, u);
  uo.init(r, u);
});
function schemas_base64url(r) {
  return _base64url(Po, r);
}
const Uo = $constructor('ZodE164', (r, u) => {
  Aa.init(r, u);
  uo.init(r, u);
});
function schemas_e164(r) {
  return _e164(Uo, r);
}
const Eo = $constructor('ZodJWT', (r, u) => {
  Na.init(r, u);
  uo.init(r, u);
});
function jwt(r) {
  return _jwt(Eo, r);
}
const Do = $constructor('ZodCustomStringFormat', (r, u) => {
  Ra.init(r, u);
  uo.init(r, u);
});
function stringFormat(r, u, m = {}) {
  return _stringFormat(Do, r, u, m);
}
function schemas_hostname(r) {
  return _stringFormat(Do, 'hostname', ni, r);
}
function schemas_hex(r) {
  return _stringFormat(Do, 'hex', gi, r);
}
function hash(r, u) {
  const m = u?.enc ?? 'hex';
  const v = `${r}_${m}`;
  const b = w[v];
  if (!b) throw new Error(`Unrecognized hash format: ${v}`);
  return _stringFormat(Do, v, b, u);
}
const To = $constructor('ZodNumber', (r, u) => {
  Ca.init(r, u);
  oo.init(r, u);
  r._zod.processJSONSchema = (u, m, v) => numberProcessor(r, u, m, v);
  r.gt = (u, m) => r.check(_gt(u, m));
  r.gte = (u, m) => r.check(_gte(u, m));
  r.min = (u, m) => r.check(_gte(u, m));
  r.lt = (u, m) => r.check(_lt(u, m));
  r.lte = (u, m) => r.check(_lte(u, m));
  r.max = (u, m) => r.check(_lte(u, m));
  r.int = u => r.check(schemas_int(u));
  r.safe = u => r.check(schemas_int(u));
  r.positive = u => r.check(_gt(0, u));
  r.nonnegative = u => r.check(_gte(0, u));
  r.negative = u => r.check(_lt(0, u));
  r.nonpositive = u => r.check(_lte(0, u));
  r.multipleOf = (u, m) => r.check(_multipleOf(u, m));
  r.step = (u, m) => r.check(_multipleOf(u, m));
  r.finite = () => r;
  const m = r._zod.bag;
  r.minValue =
    Math.max(
      m.minimum ?? Number.NEGATIVE_INFINITY,
      m.exclusiveMinimum ?? Number.NEGATIVE_INFINITY
    ) ?? null;
  r.maxValue =
    Math.min(
      m.maximum ?? Number.POSITIVE_INFINITY,
      m.exclusiveMaximum ?? Number.POSITIVE_INFINITY
    ) ?? null;
  r.isInt = (m.format ?? '').includes('int') || Number.isSafeInteger(m.multipleOf ?? 0.5);
  r.isFinite = true;
  r.format = m.format ?? null;
});
function schemas_number(r) {
  return _number(To, r);
}
const Ao = $constructor('ZodNumberFormat', (r, u) => {
  La.init(r, u);
  To.init(r, u);
});
function schemas_int(r) {
  return _int(Ao, r);
}
function float32(r) {
  return _float32(Ao, r);
}
function float64(r) {
  return _float64(Ao, r);
}
function int32(r) {
  return _int32(Ao, r);
}
function uint32(r) {
  return _uint32(Ao, r);
}
const No = $constructor('ZodBoolean', (r, u) => {
  Za.init(r, u);
  oo.init(r, u);
  r._zod.processJSONSchema = (u, m, v) => booleanProcessor(r, u, m, v);
});
function schemas_boolean(r) {
  return _boolean(No, r);
}
const Ro = $constructor('ZodBigInt', (r, u) => {
  Fa.init(r, u);
  oo.init(r, u);
  r._zod.processJSONSchema = (u, m, v) => bigintProcessor(r, u, m, v);
  r.gte = (u, m) => r.check(_gte(u, m));
  r.min = (u, m) => r.check(_gte(u, m));
  r.gt = (u, m) => r.check(_gt(u, m));
  r.gte = (u, m) => r.check(_gte(u, m));
  r.min = (u, m) => r.check(_gte(u, m));
  r.lt = (u, m) => r.check(_lt(u, m));
  r.lte = (u, m) => r.check(_lte(u, m));
  r.max = (u, m) => r.check(_lte(u, m));
  r.positive = u => r.check(_gt(BigInt(0), u));
  r.negative = u => r.check(_lt(BigInt(0), u));
  r.nonpositive = u => r.check(_lte(BigInt(0), u));
  r.nonnegative = u => r.check(_gte(BigInt(0), u));
  r.multipleOf = (u, m) => r.check(_multipleOf(u, m));
  const m = r._zod.bag;
  r.minValue = m.minimum ?? null;
  r.maxValue = m.maximum ?? null;
  r.format = m.format ?? null;
});
function schemas_bigint(r) {
  return _bigint(Ro, r);
}
const Co = $constructor('ZodBigIntFormat', (r, u) => {
  qa.init(r, u);
  Ro.init(r, u);
});
function int64(r) {
  return _int64(Co, r);
}
function uint64(r) {
  return _uint64(Co, r);
}
const Lo = $constructor('ZodSymbol', (r, u) => {
  Ba.init(r, u);
  oo.init(r, u);
  r._zod.processJSONSchema = (u, m, v) => symbolProcessor(r, u, m, v);
});
function symbol(r) {
  return _symbol(Lo, r);
}
const Zo = $constructor('ZodUndefined', (r, u) => {
  Va.init(r, u);
  oo.init(r, u);
  r._zod.processJSONSchema = (u, m, v) => undefinedProcessor(r, u, m, v);
});
function schemas_undefined(r) {
  return api_undefined(Zo, r);
}
const Fo = $constructor('ZodNull', (r, u) => {
  Ma.init(r, u);
  oo.init(r, u);
  r._zod.processJSONSchema = (u, m, v) => nullProcessor(r, u, m, v);
});
function schemas_null(r) {
  return api_null(Fo, r);
}
const qo = $constructor('ZodAny', (r, u) => {
  Ja.init(r, u);
  oo.init(r, u);
  r._zod.processJSONSchema = (u, m, v) => anyProcessor(r, u, m, v);
});
function any() {
  return _any(qo);
}
const Bo = $constructor('ZodUnknown', (r, u) => {
  Ka.init(r, u);
  oo.init(r, u);
  r._zod.processJSONSchema = (u, m, v) => unknownProcessor(r, u, m, v);
});
function unknown() {
  return _unknown(Bo);
}
const Vo = $constructor('ZodNever', (r, u) => {
  Wa.init(r, u);
  oo.init(r, u);
  r._zod.processJSONSchema = (u, m, v) => neverProcessor(r, u, m, v);
});
function never(r) {
  return _never(Vo, r);
}
const Mo = $constructor('ZodVoid', (r, u) => {
  Ga.init(r, u);
  oo.init(r, u);
  r._zod.processJSONSchema = (u, m, v) => voidProcessor(r, u, m, v);
});
function schemas_void(r) {
  return _void(Mo, r);
}
const Jo = $constructor('ZodDate', (r, u) => {
  Ha.init(r, u);
  oo.init(r, u);
  r._zod.processJSONSchema = (u, m, v) => dateProcessor(r, u, m, v);
  r.min = (u, m) => r.check(_gte(u, m));
  r.max = (u, m) => r.check(_lte(u, m));
  const m = r._zod.bag;
  r.minDate = m.minimum ? new Date(m.minimum) : null;
  r.maxDate = m.maximum ? new Date(m.maximum) : null;
});
function schemas_date(r) {
  return _date(Jo, r);
}
const Ko = $constructor('ZodArray', (r, u) => {
  Xa.init(r, u);
  oo.init(r, u);
  r._zod.processJSONSchema = (u, m, v) => arrayProcessor(r, u, m, v);
  r.element = u.element;
  r.min = (u, m) => r.check(_minLength(u, m));
  r.nonempty = u => r.check(_minLength(1, u));
  r.max = (u, m) => r.check(_maxLength(u, m));
  r.length = (u, m) => r.check(_length(u, m));
  r.unwrap = () => r.element;
});
function array(r, u) {
  return _array(Ko, r, u);
}
function keyof(r) {
  const u = r._zod.def.shape;
  return schemas_enum(Object.keys(u));
}
const Wo = $constructor('ZodObject', (r, u) => {
  Qa.init(r, u);
  oo.init(r, u);
  r._zod.processJSONSchema = (u, m, v) => objectProcessor(r, u, m, v);
  defineLazy(r, 'shape', () => u.shape);
  r.keyof = () => schemas_enum(Object.keys(r._zod.def.shape));
  r.catchall = u => r.clone({ ...r._zod.def, catchall: u });
  r.passthrough = () => r.clone({ ...r._zod.def, catchall: unknown() });
  r.loose = () => r.clone({ ...r._zod.def, catchall: unknown() });
  r.strict = () => r.clone({ ...r._zod.def, catchall: never() });
  r.strip = () => r.clone({ ...r._zod.def, catchall: undefined });
  r.extend = u => util_extend(r, u);
  r.safeExtend = u => safeExtend(r, u);
  r.merge = u => util_merge(r, u);
  r.pick = u => pick(r, u);
  r.omit = u => omit(r, u);
  r.partial = (...u) => partial(ls, r, u[0]);
  r.required = (...u) => required(vs, r, u[0]);
});
function object(r, u) {
  const m = { type: 'object', shape: r ?? {}, ...normalizeParams(u) };
  return new Wo(m);
}
function strictObject(r, u) {
  return new Wo({ type: 'object', shape: r, catchall: never(), ...normalizeParams(u) });
}
function looseObject(r, u) {
  return new Wo({ type: 'object', shape: r, catchall: unknown(), ...normalizeParams(u) });
}
const Go = $constructor('ZodUnion', (r, u) => {
  er.init(r, u);
  oo.init(r, u);
  r._zod.processJSONSchema = (u, m, v) => unionProcessor(r, u, m, v);
  r.options = u.options;
});
function union(r, u) {
  return new Go({ type: 'union', options: r, ...normalizeParams(u) });
}
const Ho = $constructor('ZodXor', (r, u) => {
  Go.init(r, u);
  nr.init(r, u);
  r._zod.processJSONSchema = (u, m, v) => unionProcessor(r, u, m, v);
  r.options = u.options;
});
function xor(r, u) {
  return new Ho({ type: 'union', options: r, inclusive: false, ...normalizeParams(u) });
}
const Xo = $constructor('ZodDiscriminatedUnion', (r, u) => {
  Go.init(r, u);
  ir.init(r, u);
});
function discriminatedUnion(r, u, m) {
  return new Xo({ type: 'union', options: u, discriminator: r, ...normalizeParams(m) });
}
const Yo = $constructor('ZodIntersection', (r, u) => {
  rr.init(r, u);
  oo.init(r, u);
  r._zod.processJSONSchema = (u, m, v) => intersectionProcessor(r, u, m, v);
});
function intersection(r, u) {
  return new Yo({ type: 'intersection', left: r, right: u });
}
const Qo = $constructor('ZodTuple', (r, u) => {
  or.init(r, u);
  oo.init(r, u);
  r._zod.processJSONSchema = (u, m, v) => tupleProcessor(r, u, m, v);
  r.rest = u => r.clone({ ...r._zod.def, rest: u });
});
function tuple(r, u, m) {
  const v = u instanceof aa;
  const b = v ? m : u;
  const x = v ? u : null;
  return new Qo({ type: 'tuple', items: r, rest: x, ...normalizeParams(b) });
}
const ts = $constructor('ZodRecord', (r, u) => {
  sr.init(r, u);
  oo.init(r, u);
  r._zod.processJSONSchema = (u, m, v) => recordProcessor(r, u, m, v);
  r.keyType = u.keyType;
  r.valueType = u.valueType;
});
function record(r, u, m) {
  return new ts({ type: 'record', keyType: r, valueType: u, ...normalizeParams(m) });
}
function partialRecord(r, u, m) {
  const v = clone(r);
  v._zod.values = undefined;
  return new ts({ type: 'record', keyType: v, valueType: u, ...normalizeParams(m) });
}
function looseRecord(r, u, m) {
  return new ts({
    type: 'record',
    keyType: r,
    valueType: u,
    mode: 'loose',
    ...normalizeParams(m)
  });
}
const ns = $constructor('ZodMap', (r, u) => {
  cr.init(r, u);
  oo.init(r, u);
  r._zod.processJSONSchema = (u, m, v) => mapProcessor(r, u, m, v);
  r.keyType = u.keyType;
  r.valueType = u.valueType;
  r.min = (...u) => r.check(_minSize(...u));
  r.nonempty = u => r.check(_minSize(1, u));
  r.max = (...u) => r.check(_maxSize(...u));
  r.size = (...u) => r.check(_size(...u));
});
function map(r, u, m) {
  return new ns({ type: 'map', keyType: r, valueType: u, ...normalizeParams(m) });
}
const as = $constructor('ZodSet', (r, u) => {
  lr.init(r, u);
  oo.init(r, u);
  r._zod.processJSONSchema = (u, m, v) => setProcessor(r, u, m, v);
  r.min = (...u) => r.check(_minSize(...u));
  r.nonempty = u => r.check(_minSize(1, u));
  r.max = (...u) => r.check(_maxSize(...u));
  r.size = (...u) => r.check(_size(...u));
});
function set(r, u) {
  return new as({ type: 'set', valueType: r, ...normalizeParams(u) });
}
const rs = $constructor('ZodEnum', (r, u) => {
  pr.init(r, u);
  oo.init(r, u);
  r._zod.processJSONSchema = (u, m, v) => enumProcessor(r, u, m, v);
  r.enum = u.entries;
  r.options = Object.values(u.entries);
  const m = new Set(Object.keys(u.entries));
  r.extract = (r, v) => {
    const b = {};
    for (const v of r) {
      if (m.has(v)) {
        b[v] = u.entries[v];
      } else throw new Error(`Key ${v} not found in enum`);
    }
    return new rs({ ...u, checks: [], ...normalizeParams(v), entries: b });
  };
  r.exclude = (r, v) => {
    const b = { ...u.entries };
    for (const u of r) {
      if (m.has(u)) {
        delete b[u];
      } else throw new Error(`Key ${u} not found in enum`);
    }
    return new rs({ ...u, checks: [], ...normalizeParams(v), entries: b });
  };
});
function schemas_enum(r, u) {
  const m = Array.isArray(r) ? Object.fromEntries(r.map(r => [r, r])) : r;
  return new rs({ type: 'enum', entries: m, ...normalizeParams(u) });
}
function nativeEnum(r, u) {
  return new rs({ type: 'enum', entries: r, ...normalizeParams(u) });
}
const os = $constructor('ZodLiteral', (r, u) => {
  dr.init(r, u);
  oo.init(r, u);
  r._zod.processJSONSchema = (u, m, v) => literalProcessor(r, u, m, v);
  r.values = new Set(u.values);
  Object.defineProperty(r, 'value', {
    get() {
      if (u.values.length > 1) {
        throw new Error(
          'This schema contains multiple valid literal values. Use `.values` instead.'
        );
      }
      return u.values[0];
    }
  });
});
function literal(r, u) {
  return new os({
    type: 'literal',
    values: Array.isArray(r) ? r : [r],
    ...normalizeParams(u)
  });
}
const ss = $constructor('ZodFile', (r, u) => {
  mr.init(r, u);
  oo.init(r, u);
  r._zod.processJSONSchema = (u, m, v) => fileProcessor(r, u, m, v);
  r.min = (u, m) => r.check(_minSize(u, m));
  r.max = (u, m) => r.check(_maxSize(u, m));
  r.mime = (u, m) => r.check(_mime(Array.isArray(u) ? u : [u], m));
});
function file(r) {
  return _file(ss, r);
}
const us = $constructor('ZodTransform', (r, u) => {
  hr.init(r, u);
  oo.init(r, u);
  r._zod.processJSONSchema = (u, m, v) => transformProcessor(r, u, m, v);
  r._zod.parse = (m, v) => {
    if (v.direction === 'backward') {
      throw new $ZodEncodeError(r.constructor.name);
    }
    m.addIssue = v => {
      if (typeof v === 'string') {
        m.issues.push(util_issue(v, m.value, u));
      } else {
        const u = v;
        if (u.fatal) u.continue = false;
        u.code ?? (u.code = 'custom');
        u.input ?? (u.input = m.value);
        u.inst ?? (u.inst = r);
        m.issues.push(util_issue(u));
      }
    };
    const b = u.transform(m.value, m);
    if (b instanceof Promise) {
      return b.then(r => {
        m.value = r;
        return m;
      });
    }
    m.value = b;
    return m;
  };
});
function transform(r) {
  return new us({ type: 'transform', transform: r });
}
const ls = $constructor('ZodOptional', (r, u) => {
  gr.init(r, u);
  oo.init(r, u);
  r._zod.processJSONSchema = (u, m, v) => optionalProcessor(r, u, m, v);
  r.unwrap = () => r._zod.def.innerType;
});
function optional(r) {
  return new ls({ type: 'optional', innerType: r });
}
const ds = $constructor('ZodExactOptional', (r, u) => {
  vr.init(r, u);
  oo.init(r, u);
  r._zod.processJSONSchema = (u, m, v) => optionalProcessor(r, u, m, v);
  r.unwrap = () => r._zod.def.innerType;
});
function exactOptional(r) {
  return new ds({ type: 'optional', innerType: r });
}
const fs = $constructor('ZodNullable', (r, u) => {
  br.init(r, u);
  oo.init(r, u);
  r._zod.processJSONSchema = (u, m, v) => nullableProcessor(r, u, m, v);
  r.unwrap = () => r._zod.def.innerType;
});
function nullable(r) {
  return new fs({ type: 'nullable', innerType: r });
}
function schemas_nullish(r) {
  return optional(nullable(r));
}
const hs = $constructor('ZodDefault', (r, u) => {
  yr.init(r, u);
  oo.init(r, u);
  r._zod.processJSONSchema = (u, m, v) => defaultProcessor(r, u, m, v);
  r.unwrap = () => r._zod.def.innerType;
  r.removeDefault = r.unwrap;
});
function schemas_default(r, u) {
  return new hs({
    type: 'default',
    innerType: r,
    get defaultValue() {
      return typeof u === 'function' ? u() : shallowClone(u);
    }
  });
}
const gs = $constructor('ZodPrefault', (r, u) => {
  xr.init(r, u);
  oo.init(r, u);
  r._zod.processJSONSchema = (u, m, v) => prefaultProcessor(r, u, m, v);
  r.unwrap = () => r._zod.def.innerType;
});
function prefault(r, u) {
  return new gs({
    type: 'prefault',
    innerType: r,
    get defaultValue() {
      return typeof u === 'function' ? u() : shallowClone(u);
    }
  });
}
const vs = $constructor('ZodNonOptional', (r, u) => {
  _r.init(r, u);
  oo.init(r, u);
  r._zod.processJSONSchema = (u, m, v) => nonoptionalProcessor(r, u, m, v);
  r.unwrap = () => r._zod.def.innerType;
});
function nonoptional(r, u) {
  return new vs({ type: 'nonoptional', innerType: r, ...normalizeParams(u) });
}
const bs = $constructor('ZodSuccess', (r, u) => {
  wr.init(r, u);
  oo.init(r, u);
  r._zod.processJSONSchema = (u, m, v) => successProcessor(r, u, m, v);
  r.unwrap = () => r._zod.def.innerType;
});
function success(r) {
  return new bs({ type: 'success', innerType: r });
}
const ys = $constructor('ZodCatch', (r, u) => {
  $r.init(r, u);
  oo.init(r, u);
  r._zod.processJSONSchema = (u, m, v) => catchProcessor(r, u, m, v);
  r.unwrap = () => r._zod.def.innerType;
  r.removeCatch = r.unwrap;
});
function schemas_catch(r, u) {
  return new ys({
    type: 'catch',
    innerType: r,
    catchValue: typeof u === 'function' ? u : () => u
  });
}
const xs = $constructor('ZodNaN', (r, u) => {
  kr.init(r, u);
  oo.init(r, u);
  r._zod.processJSONSchema = (u, m, v) => nanProcessor(r, u, m, v);
});
function nan(r) {
  return _nan(xs, r);
}
const _s = $constructor('ZodPipe', (r, u) => {
  Sr.init(r, u);
  oo.init(r, u);
  r._zod.processJSONSchema = (u, m, v) => pipeProcessor(r, u, m, v);
  r.in = u.in;
  r.out = u.out;
});
function pipe(r, u) {
  return new _s({ type: 'pipe', in: r, out: u });
}
const ws = $constructor('ZodCodec', (r, u) => {
  _s.init(r, u);
  Ir.init(r, u);
});
function codec(r, u, m) {
  return new ws({
    type: 'pipe',
    in: r,
    out: u,
    transform: m.decode,
    reverseTransform: m.encode
  });
}
const $s = $constructor('ZodReadonly', (r, u) => {
  zr.init(r, u);
  oo.init(r, u);
  r._zod.processJSONSchema = (u, m, v) => readonlyProcessor(r, u, m, v);
  r.unwrap = () => r._zod.def.innerType;
});
function readonly(r) {
  return new $s({ type: 'readonly', innerType: r });
}
const ks = $constructor('ZodTemplateLiteral', (r, u) => {
  jr.init(r, u);
  oo.init(r, u);
  r._zod.processJSONSchema = (u, m, v) => templateLiteralProcessor(r, u, m, v);
});
function templateLiteral(r, u) {
  return new ks({ type: 'template_literal', parts: r, ...normalizeParams(u) });
}
const Ss = $constructor('ZodLazy', (r, u) => {
  Ur.init(r, u);
  oo.init(r, u);
  r._zod.processJSONSchema = (u, m, v) => lazyProcessor(r, u, m, v);
  r.unwrap = () => r._zod.def.getter();
});
function lazy(r) {
  return new Ss({ type: 'lazy', getter: r });
}
const Is = $constructor('ZodPromise', (r, u) => {
  Pr.init(r, u);
  oo.init(r, u);
  r._zod.processJSONSchema = (u, m, v) => promiseProcessor(r, u, m, v);
  r.unwrap = () => r._zod.def.innerType;
});
function promise(r) {
  return new Is({ type: 'promise', innerType: r });
}
const zs = $constructor('ZodFunction', (r, u) => {
  Or.init(r, u);
  oo.init(r, u);
  r._zod.processJSONSchema = (u, m, v) => functionProcessor(r, u, m, v);
});
function _function(r) {
  return new zs({
    type: 'function',
    input: Array.isArray(r?.input) ? tuple(r?.input) : (r?.input ?? array(unknown())),
    output: r?.output ?? unknown()
  });
}
const js = $constructor('ZodCustom', (r, u) => {
  Er.init(r, u);
  oo.init(r, u);
  r._zod.processJSONSchema = (u, m, v) => customProcessor(r, u, m, v);
});
function check(r) {
  const u = new Di({ check: 'custom' });
  u._zod.check = r;
  return u;
}
function custom(r, u) {
  return _custom(js, r ?? (() => true), u);
}
function refine(r, u = {}) {
  return _refine(js, r, u);
}
function superRefine(r) {
  return _superRefine(r);
}
const Os = describe;
const Ps = meta;
function _instanceof(r, u = {}) {
  const m = new js({
    type: 'custom',
    check: 'custom',
    fn: u => u instanceof r,
    abort: true,
    ...normalizeParams(u)
  });
  m._zod.bag.Class = r;
  m._zod.check = u => {
    if (!(u.value instanceof r)) {
      u.issues.push({
        code: 'invalid_type',
        expected: r.name,
        input: u.value,
        inst: m,
        path: [...(m._zod.def.path ?? [])]
      });
    }
  };
  return m;
}
const stringbool = (...r) => _stringbool({ Codec: ws, Boolean: No, String: co }, ...r);
function json(r) {
  const u = lazy(() =>
    union([
      schemas_string(r),
      schemas_number(),
      schemas_boolean(),
      schemas_null(),
      array(u),
      record(schemas_string(), u)
    ])
  );
  return u;
}
function preprocess(r, u) {
  return pipe(transform(r), u);
}
const Us = {
  invalid_type: 'invalid_type',
  too_big: 'too_big',
  too_small: 'too_small',
  invalid_format: 'invalid_format',
  not_multiple_of: 'not_multiple_of',
  unrecognized_keys: 'unrecognized_keys',
  invalid_union: 'invalid_union',
  invalid_key: 'invalid_key',
  invalid_element: 'invalid_element',
  invalid_value: 'invalid_value',
  custom: 'custom'
};
function setErrorMap(r) {
  config({ customError: r });
}
function getErrorMap() {
  return config().customError;
}
var Es;
(function (r) {})(Es || (Es = {}));
const Ds = { ...j, ...I, iso: z };
const Ts = new Set([
  '$schema',
  '$ref',
  '$defs',
  'definitions',
  '$id',
  'id',
  '$comment',
  '$anchor',
  '$vocabulary',
  '$dynamicRef',
  '$dynamicAnchor',
  'type',
  'enum',
  'const',
  'anyOf',
  'oneOf',
  'allOf',
  'not',
  'properties',
  'required',
  'additionalProperties',
  'patternProperties',
  'propertyNames',
  'minProperties',
  'maxProperties',
  'items',
  'prefixItems',
  'additionalItems',
  'minItems',
  'maxItems',
  'uniqueItems',
  'contains',
  'minContains',
  'maxContains',
  'minLength',
  'maxLength',
  'pattern',
  'format',
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'multipleOf',
  'description',
  'default',
  'contentEncoding',
  'contentMediaType',
  'contentSchema',
  'unevaluatedItems',
  'unevaluatedProperties',
  'if',
  'then',
  'else',
  'dependentSchemas',
  'dependentRequired',
  'nullable',
  'readOnly'
]);
function detectVersion(r, u) {
  const m = r.$schema;
  if (m === 'https://json-schema.org/draft/2020-12/schema') {
    return 'draft-2020-12';
  }
  if (m === 'http://json-schema.org/draft-07/schema#') {
    return 'draft-7';
  }
  if (m === 'http://json-schema.org/draft-04/schema#') {
    return 'draft-4';
  }
  return u ?? 'draft-2020-12';
}
function resolveRef(r, u) {
  if (!r.startsWith('#')) {
    throw new Error('External $ref is not supported, only local refs (#/...) are allowed');
  }
  const m = r.slice(1).split('/').filter(Boolean);
  if (m.length === 0) {
    return u.rootSchema;
  }
  const v = u.version === 'draft-2020-12' ? '$defs' : 'definitions';
  if (m[0] === v) {
    const v = m[1];
    if (!v || !u.defs[v]) {
      throw new Error(`Reference not found: ${r}`);
    }
    return u.defs[v];
  }
  throw new Error(`Reference not found: ${r}`);
}
function convertBaseSchema(r, u) {
  if (r.not !== undefined) {
    if (typeof r.not === 'object' && Object.keys(r.not).length === 0) {
      return Ds.never();
    }
    throw new Error('not is not supported in Zod (except { not: {} } for never)');
  }
  if (r.unevaluatedItems !== undefined) {
    throw new Error('unevaluatedItems is not supported');
  }
  if (r.unevaluatedProperties !== undefined) {
    throw new Error('unevaluatedProperties is not supported');
  }
  if (r.if !== undefined || r.then !== undefined || r.else !== undefined) {
    throw new Error('Conditional schemas (if/then/else) are not supported');
  }
  if (r.dependentSchemas !== undefined || r.dependentRequired !== undefined) {
    throw new Error('dependentSchemas and dependentRequired are not supported');
  }
  if (r.$ref) {
    const m = r.$ref;
    if (u.refs.has(m)) {
      return u.refs.get(m);
    }
    if (u.processing.has(m)) {
      return Ds.lazy(() => {
        if (!u.refs.has(m)) {
          throw new Error(`Circular reference not resolved: ${m}`);
        }
        return u.refs.get(m);
      });
    }
    u.processing.add(m);
    const v = resolveRef(m, u);
    const b = convertSchema(v, u);
    u.refs.set(m, b);
    u.processing.delete(m);
    return b;
  }
  if (r.enum !== undefined) {
    const m = r.enum;
    if (
      u.version === 'openapi-3.0' &&
      r.nullable === true &&
      m.length === 1 &&
      m[0] === null
    ) {
      return Ds.null();
    }
    if (m.length === 0) {
      return Ds.never();
    }
    if (m.length === 1) {
      return Ds.literal(m[0]);
    }
    if (m.every(r => typeof r === 'string')) {
      return Ds.enum(m);
    }
    const v = m.map(r => Ds.literal(r));
    if (v.length < 2) {
      return v[0];
    }
    return Ds.union([v[0], v[1], ...v.slice(2)]);
  }
  if (r.const !== undefined) {
    return Ds.literal(r.const);
  }
  const m = r.type;
  if (Array.isArray(m)) {
    const v = m.map(m => {
      const v = { ...r, type: m };
      return convertBaseSchema(v, u);
    });
    if (v.length === 0) {
      return Ds.never();
    }
    if (v.length === 1) {
      return v[0];
    }
    return Ds.union(v);
  }
  if (!m) {
    return Ds.any();
  }
  let v;
  switch (m) {
    case 'string': {
      let u = Ds.string();
      if (r.format) {
        const m = r.format;
        if (m === 'email') {
          u = u.check(Ds.email());
        } else if (m === 'uri' || m === 'uri-reference') {
          u = u.check(Ds.url());
        } else if (m === 'uuid' || m === 'guid') {
          u = u.check(Ds.uuid());
        } else if (m === 'date-time') {
          u = u.check(Ds.iso.datetime());
        } else if (m === 'date') {
          u = u.check(Ds.iso.date());
        } else if (m === 'time') {
          u = u.check(Ds.iso.time());
        } else if (m === 'duration') {
          u = u.check(Ds.iso.duration());
        } else if (m === 'ipv4') {
          u = u.check(Ds.ipv4());
        } else if (m === 'ipv6') {
          u = u.check(Ds.ipv6());
        } else if (m === 'mac') {
          u = u.check(Ds.mac());
        } else if (m === 'cidr') {
          u = u.check(Ds.cidrv4());
        } else if (m === 'cidr-v6') {
          u = u.check(Ds.cidrv6());
        } else if (m === 'base64') {
          u = u.check(Ds.base64());
        } else if (m === 'base64url') {
          u = u.check(Ds.base64url());
        } else if (m === 'e164') {
          u = u.check(Ds.e164());
        } else if (m === 'jwt') {
          u = u.check(Ds.jwt());
        } else if (m === 'emoji') {
          u = u.check(Ds.emoji());
        } else if (m === 'nanoid') {
          u = u.check(Ds.nanoid());
        } else if (m === 'cuid') {
          u = u.check(Ds.cuid());
        } else if (m === 'cuid2') {
          u = u.check(Ds.cuid2());
        } else if (m === 'ulid') {
          u = u.check(Ds.ulid());
        } else if (m === 'xid') {
          u = u.check(Ds.xid());
        } else if (m === 'ksuid') {
          u = u.check(Ds.ksuid());
        }
      }
      if (typeof r.minLength === 'number') {
        u = u.min(r.minLength);
      }
      if (typeof r.maxLength === 'number') {
        u = u.max(r.maxLength);
      }
      if (r.pattern) {
        u = u.regex(new RegExp(r.pattern));
      }
      v = u;
      break;
    }
    case 'number':
    case 'integer': {
      let u = m === 'integer' ? Ds.number().int() : Ds.number();
      if (typeof r.minimum === 'number') {
        u = u.min(r.minimum);
      }
      if (typeof r.maximum === 'number') {
        u = u.max(r.maximum);
      }
      if (typeof r.exclusiveMinimum === 'number') {
        u = u.gt(r.exclusiveMinimum);
      } else if (r.exclusiveMinimum === true && typeof r.minimum === 'number') {
        u = u.gt(r.minimum);
      }
      if (typeof r.exclusiveMaximum === 'number') {
        u = u.lt(r.exclusiveMaximum);
      } else if (r.exclusiveMaximum === true && typeof r.maximum === 'number') {
        u = u.lt(r.maximum);
      }
      if (typeof r.multipleOf === 'number') {
        u = u.multipleOf(r.multipleOf);
      }
      v = u;
      break;
    }
    case 'boolean': {
      v = Ds.boolean();
      break;
    }
    case 'null': {
      v = Ds.null();
      break;
    }
    case 'object': {
      const m = {};
      const b = r.properties || {};
      const x = new Set(r.required || []);
      for (const [r, v] of Object.entries(b)) {
        const b = convertSchema(v, u);
        m[r] = x.has(r) ? b : b.optional();
      }
      if (r.propertyNames) {
        const b = convertSchema(r.propertyNames, u);
        const x =
          r.additionalProperties && typeof r.additionalProperties === 'object'
            ? convertSchema(r.additionalProperties, u)
            : Ds.any();
        if (Object.keys(m).length === 0) {
          v = Ds.record(b, x);
          break;
        }
        const w = Ds.object(m).passthrough();
        const $ = Ds.looseRecord(b, x);
        v = Ds.intersection(w, $);
        break;
      }
      if (r.patternProperties) {
        const b = r.patternProperties;
        const x = Object.keys(b);
        const w = [];
        for (const r of x) {
          const m = convertSchema(b[r], u);
          const v = Ds.string().regex(new RegExp(r));
          w.push(Ds.looseRecord(v, m));
        }
        const $ = [];
        if (Object.keys(m).length > 0) {
          $.push(Ds.object(m).passthrough());
        }
        $.push(...w);
        if ($.length === 0) {
          v = Ds.object({}).passthrough();
        } else if ($.length === 1) {
          v = $[0];
        } else {
          let r = Ds.intersection($[0], $[1]);
          for (let u = 2; u < $.length; u++) {
            r = Ds.intersection(r, $[u]);
          }
          v = r;
        }
        break;
      }
      const w = Ds.object(m);
      if (r.additionalProperties === false) {
        v = w.strict();
      } else if (typeof r.additionalProperties === 'object') {
        v = w.catchall(convertSchema(r.additionalProperties, u));
      } else {
        v = w.passthrough();
      }
      break;
    }
    case 'array': {
      const m = r.prefixItems;
      const b = r.items;
      if (m && Array.isArray(m)) {
        const x = m.map(r => convertSchema(r, u));
        const w =
          b && typeof b === 'object' && !Array.isArray(b) ? convertSchema(b, u) : undefined;
        if (w) {
          v = Ds.tuple(x).rest(w);
        } else {
          v = Ds.tuple(x);
        }
        if (typeof r.minItems === 'number') {
          v = v.check(Ds.minLength(r.minItems));
        }
        if (typeof r.maxItems === 'number') {
          v = v.check(Ds.maxLength(r.maxItems));
        }
      } else if (Array.isArray(b)) {
        const m = b.map(r => convertSchema(r, u));
        const x =
          r.additionalItems && typeof r.additionalItems === 'object'
            ? convertSchema(r.additionalItems, u)
            : undefined;
        if (x) {
          v = Ds.tuple(m).rest(x);
        } else {
          v = Ds.tuple(m);
        }
        if (typeof r.minItems === 'number') {
          v = v.check(Ds.minLength(r.minItems));
        }
        if (typeof r.maxItems === 'number') {
          v = v.check(Ds.maxLength(r.maxItems));
        }
      } else if (b !== undefined) {
        const m = convertSchema(b, u);
        let x = Ds.array(m);
        if (typeof r.minItems === 'number') {
          x = x.min(r.minItems);
        }
        if (typeof r.maxItems === 'number') {
          x = x.max(r.maxItems);
        }
        v = x;
      } else {
        v = Ds.array(Ds.any());
      }
      break;
    }
    default:
      throw new Error(`Unsupported type: ${m}`);
  }
  if (r.description) {
    v = v.describe(r.description);
  }
  if (r.default !== undefined) {
    v = v.default(r.default);
  }
  return v;
}
function convertSchema(r, u) {
  if (typeof r === 'boolean') {
    return r ? Ds.any() : Ds.never();
  }
  let m = convertBaseSchema(r, u);
  const v = r.type || r.enum !== undefined || r.const !== undefined;
  if (r.anyOf && Array.isArray(r.anyOf)) {
    const b = r.anyOf.map(r => convertSchema(r, u));
    const x = Ds.union(b);
    m = v ? Ds.intersection(m, x) : x;
  }
  if (r.oneOf && Array.isArray(r.oneOf)) {
    const b = r.oneOf.map(r => convertSchema(r, u));
    const x = Ds.xor(b);
    m = v ? Ds.intersection(m, x) : x;
  }
  if (r.allOf && Array.isArray(r.allOf)) {
    if (r.allOf.length === 0) {
      m = v ? m : Ds.any();
    } else {
      let b = v ? m : convertSchema(r.allOf[0], u);
      const x = v ? 0 : 1;
      for (let m = x; m < r.allOf.length; m++) {
        b = Ds.intersection(b, convertSchema(r.allOf[m], u));
      }
      m = b;
    }
  }
  if (r.nullable === true && u.version === 'openapi-3.0') {
    m = Ds.nullable(m);
  }
  if (r.readOnly === true) {
    m = Ds.readonly(m);
  }
  const b = {};
  const x = [
    '$id',
    'id',
    '$comment',
    '$anchor',
    '$vocabulary',
    '$dynamicRef',
    '$dynamicAnchor'
  ];
  for (const u of x) {
    if (u in r) {
      b[u] = r[u];
    }
  }
  const w = ['contentEncoding', 'contentMediaType', 'contentSchema'];
  for (const u of w) {
    if (u in r) {
      b[u] = r[u];
    }
  }
  for (const u of Object.keys(r)) {
    if (!Ts.has(u)) {
      b[u] = r[u];
    }
  }
  if (Object.keys(b).length > 0) {
    u.registry.add(m, b);
  }
  return m;
}
function fromJSONSchema(r, u) {
  if (typeof r === 'boolean') {
    return r ? Ds.any() : Ds.never();
  }
  const m = detectVersion(r, u?.defaultTarget);
  const v = r.$defs || r.definitions || {};
  const b = {
    version: m,
    defs: v,
    refs: new Map(),
    processing: new Set(),
    rootSchema: r,
    registry: u?.registry ?? Nr
  };
  return convertSchema(r, b);
}
function coerce_string(r) {
  return _coercedString(co, r);
}
function coerce_number(r) {
  return _coercedNumber(To, r);
}
function coerce_boolean(r) {
  return _coercedBoolean(No, r);
}
function coerce_bigint(r) {
  return _coercedBigint(Ro, r);
}
function coerce_date(r) {
  return _coercedDate(Jo, r);
}
config(en());
const As = P;
function i(r, u) {
  (null == u || u > r.length) && (u = r.length);
  for (var m = 0, v = Array(u); m < u; m++) v[m] = r[m];
  return v;
}
function o(r, u) {
  if (!{}.hasOwnProperty.call(r, u))
    throw new TypeError('attempted to use private field on non-instance');
  return r;
}
var Ns = 0;
function a(r) {
  return '__private_' + Ns++ + '_' + r;
}
function c(r, u) {
  for (var m = 0; m < u.length; m++) {
    var v = u[m];
    ((v.enumerable = v.enumerable || !1),
      (v.configurable = !0),
      'value' in v && (v.writable = !0),
      Object.defineProperty(r, g(v.key), v));
  }
}
function s(r, u, m) {
  return (
    u && c(r.prototype, u),
    m && c(r, m),
    Object.defineProperty(r, 'prototype', { writable: !1 }),
    r
  );
}
function h() {
  return (
    (h = Object.assign
      ? Object.assign.bind()
      : function (r) {
          for (var u = 1; u < arguments.length; u++) {
            var m = arguments[u];
            for (var v in m) ({}).hasOwnProperty.call(m, v) && (r[v] = m[v]);
          }
          return r;
        }),
    h.apply(null, arguments)
  );
}
function f(r) {
  return (
    (f = Object.setPrototypeOf
      ? Object.getPrototypeOf.bind()
      : function (r) {
          return r.__proto__ || Object.getPrototypeOf(r);
        }),
    f(r)
  );
}
function l(r, u) {
  ((r.prototype = Object.create(u.prototype)), (r.prototype.constructor = r), d(r, u));
}
function p() {
  try {
    var r = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {}));
  } catch (r) {}
  return (p = function () {
    return !!r;
  })();
}
function d(r, u) {
  return (
    (d = Object.setPrototypeOf
      ? Object.setPrototypeOf.bind()
      : function (r, u) {
          return ((r.__proto__ = u), r);
        }),
    d(r, u)
  );
}
function g(r) {
  var u = (function (r) {
    if ('object' != typeof r || !r) return r;
    var u = r[Symbol.toPrimitive];
    if (void 0 !== u) {
      var m = u.call(r, 'string');
      if ('object' != typeof m) return m;
      throw new TypeError('@@toPrimitive must return a primitive value.');
    }
    return String(r);
  })(r);
  return 'symbol' == typeof u ? u : u + '';
}
function y(r) {
  var u = 'function' == typeof Map ? new Map() : void 0;
  return (
    (y = function (r) {
      if (
        null === r ||
        !(function (r) {
          try {
            return -1 !== Function.toString.call(r).indexOf('[native code]');
          } catch (u) {
            return 'function' == typeof r;
          }
        })(r)
      )
        return r;
      if ('function' != typeof r)
        throw new TypeError('Super expression must either be null or a function');
      if (void 0 !== u) {
        if (u.has(r)) return u.get(r);
        u.set(r, n);
      }
      function n() {
        return (function (r, u, m) {
          if (p()) return Reflect.construct.apply(null, arguments);
          var v = [null];
          v.push.apply(v, u);
          var b = new (r.bind.apply(r, v))();
          return (m && d(b, m.prototype), b);
        })(r, arguments, f(this).constructor);
      }
      return (
        (n.prototype = Object.create(r.prototype, {
          constructor: { value: n, enumerable: !1, writable: !0, configurable: !0 }
        })),
        d(n, r)
      );
    }),
    y(r)
  );
}
var Rs = (function () {
    return s(
      function (r, u, m, v, b) {
        ((this.type = void 0),
          (this._spec = void 0),
          (this._inputSchema = void 0),
          (this._outputSchema = void 0),
          (this._params = void 0),
          (this.type = r),
          (this._spec = u),
          (this._inputSchema = m),
          (this._outputSchema = v),
          (this._params = b));
      },
      [
        {
          key: 'configSchema',
          get: function () {
            return this._spec.configSchema;
          }
        },
        {
          key: 'inputSchema',
          get: function () {
            return this._inputSchema;
          }
        },
        {
          key: 'outputSchema',
          get: function () {
            return this._outputSchema;
          }
        },
        {
          key: 'parameters',
          get: function () {
            return this._params;
          }
        },
        {
          key: 'key',
          get: function () {
            return this._params.key;
          }
        },
        {
          key: 'name',
          get: function () {
            return this._params.name;
          }
        },
        {
          key: 'description',
          get: function () {
            return this._params.description;
          }
        },
        {
          key: 'tags',
          get: function () {
            return this._params.tags;
          }
        },
        {
          key: 'instructions',
          get: function () {
            return this._params.instructions;
          }
        },
        {
          key: 'constraints',
          get: function () {
            return this._params.constraints;
          }
        },
        {
          key: 'metadata',
          get: function () {
            return this._params.metadata;
          }
        }
      ]
    );
  })(),
  Cs = (function (r) {
    function e(u) {
      var m;
      return (((m = r.call(this, u) || this).name = 'SlateError'), m);
    }
    return (
      l(e, r),
      (e.is = function (r) {
        return r instanceof e;
      }),
      e
    );
  })(y(Error)),
  Ls = (function (r) {
    function e(u) {
      var m;
      return (
        ((m = r.call(this, '[Declaration Error]: ' + u) || this).name =
          'SlateError.DeclarationError'),
        m
      );
    }
    return (
      l(e, r),
      (e.is = function (r) {
        return r instanceof e;
      }),
      e
    );
  })(Cs),
  Zs = a('configSchema'),
  Fs = a('authSchema'),
  qs = a('inputSchema'),
  Bs = a('outputSchema'),
  Vs = a('toolParams'),
  Ms = a('triggerParams'),
  Js = (function () {
    function t(r, u, m, v) {
      ((this.type = void 0),
        (this.spec = void 0),
        (this.params = void 0),
        (this.factory = void 0),
        Object.defineProperty(this, Zs, { writable: !0, value: void 0 }),
        Object.defineProperty(this, Fs, { writable: !0, value: void 0 }),
        Object.defineProperty(this, qs, { writable: !0, value: null }),
        Object.defineProperty(this, Bs, { writable: !0, value: null }),
        Object.defineProperty(this, Vs, { writable: !0, value: null }),
        Object.defineProperty(this, Ms, { writable: !0, value: null }),
        (this.type = r),
        (this.spec = u),
        (this.params = m),
        (this.factory = v),
        (o(this, Zs)[Zs] = u.configSchema),
        (o(this, Fs)[Fs] = u.authSchema));
    }
    var r = t.prototype;
    return (
      (r.input = function (r) {
        return ((o(this, qs)[qs] = r), this);
      }),
      (r.output = function (r) {
        return ((o(this, Bs)[Bs] = r), this);
      }),
      (r.handleInvocation = function (r) {
        if ('tool' !== this.type)
          throw new Ls('handleInvocation can only be set for tool actions');
        return ((o(this, Vs)[Vs] = { type: 'tool', handleInvocation: r }), this);
      }),
      (r.webhook = function (r) {
        if ('trigger' !== this.type)
          throw new Ls('handleEvent can only be set for trigger actions');
        return (
          (o(this, Ms)[Ms] = {
            type: 'trigger',
            source: 'webhook',
            handleEvent: r.handleEvent,
            handleRequest: r.handleRequest,
            autoRegisterWebhook: r.autoRegisterWebhook,
            autoUnregisterWebhook: r.autoUnregisterWebhook
          }),
          this
        );
      }),
      (r.polling = function (r) {
        if ('trigger' !== this.type)
          throw new Ls('handleEvent can only be set for trigger actions');
        return (
          (o(this, Ms)[Ms] = {
            type: 'trigger',
            source: 'polling',
            polling: r.options,
            pollEvents: r.pollEvents,
            handleEvent: r.handleEvent
          }),
          this
        );
      }),
      (r.build = function () {
        if (!o(this, qs)[qs]) throw new Ls('Input schema is not defined');
        if (!o(this, Bs)[Bs]) throw new Ls('Output schema is not defined');
        if ('tool' === this.type && !o(this, Vs)[Vs])
          throw new Ls('Tool invocation handler is not defined');
        if ('trigger' === this.type && !o(this, Ms)[Ms])
          throw new Ls('Trigger event handlers are not defined');
        return this.factory(
          h(
            {},
            this.params,
            {
              configSchema: o(this, Zs)[Zs],
              authSchema: o(this, Fs)[Fs],
              inputSchema: o(this, qs)[qs],
              outputSchema: o(this, Bs)[Bs]
            },
            o(this, Vs)[Vs],
            o(this, Ms)[Ms]
          )
        );
      }),
      t
    );
  })(),
  Ks = a('handleInvocation'),
  Ws = (function (r) {
    function e(u, m, v, b) {
      var x;
      return (
        (x = r.call(this, 'tool', u, m, v, b) || this),
        Object.defineProperty(x, Ks, { writable: !0, value: void 0 }),
        (o(x, Ks)[Ks] = b.handleInvocation),
        x
      );
    }
    return (
      l(e, r),
      (e.create = function (r, u) {
        return new Js('tool', r, u, function (u) {
          if ('tool' != u.type) throw new Error('Invalid action type for tool');
          return new e(r, u.inputSchema, u.outputSchema, u);
        });
      }),
      s(e, [
        {
          key: 'handleInvocation',
          get: function () {
            return o(this, Ks)[Ks];
          }
        }
      ])
    );
  })(Rs),
  R = function (r, u) {
    return Ws.create(r, u);
  },
  Gs = 600,
  Hs = a('source'),
  Xs = a('polling'),
  Ys = a('handleEvent'),
  Qs = a('handleRequest'),
  ec = a('pollEvents'),
  tc = a('autoRegisterWebhook'),
  nc = a('autoUnregisterWebhook'),
  ic = (function (r) {
    function e(u, m, v, b) {
      var x;
      return (
        (x = r.call(this, 'trigger', u, m, v, b) || this),
        Object.defineProperty(x, Hs, { writable: !0, value: void 0 }),
        Object.defineProperty(x, Xs, { writable: !0, value: void 0 }),
        Object.defineProperty(x, Ys, { writable: !0, value: void 0 }),
        Object.defineProperty(x, Qs, { writable: !0, value: void 0 }),
        Object.defineProperty(x, ec, { writable: !0, value: void 0 }),
        Object.defineProperty(x, tc, { writable: !0, value: void 0 }),
        Object.defineProperty(x, nc, { writable: !0, value: void 0 }),
        (o(x, Hs)[Hs] = b.source),
        (o(x, Xs)[Xs] = b.polling || { intervalInSeconds: 600 }),
        (o(x, Ys)[Ys] = b.handleEvent),
        (o(x, Qs)[Qs] = b.handleRequest),
        (o(x, ec)[ec] = b.pollEvents),
        (o(x, tc)[tc] = b.autoRegisterWebhook),
        (o(x, nc)[nc] = b.autoUnregisterWebhook),
        x
      );
    }
    return (
      l(e, r),
      (e.create = function (r, u) {
        return new Js('trigger', r, u, function (u) {
          if ('trigger' != u.type) throw new Error('Invalid action type for trigger');
          return new e(r, u.inputSchema, u.outputSchema, u);
        });
      }),
      s(e, [
        {
          key: 'polling',
          get: function () {
            return o(this, Xs)[Xs];
          }
        },
        {
          key: 'source',
          get: function () {
            return o(this, Hs)[Hs];
          }
        },
        {
          key: 'handleEvent',
          get: function () {
            return o(this, Ys)[Ys];
          }
        },
        {
          key: 'handleRequest',
          get: function () {
            return o(this, Qs)[Qs];
          }
        },
        {
          key: 'pollEvents',
          get: function () {
            return o(this, ec)[ec];
          }
        },
        {
          key: 'autoRegisterWebhook',
          get: function () {
            return o(this, tc)[tc];
          }
        },
        {
          key: 'autoUnregisterWebhook',
          get: function () {
            return o(this, nc)[nc];
          }
        }
      ])
    );
  })(Rs),
  F = function (r, u) {
    return ic.create(r, u);
  },
  ac = a('outputSchema'),
  rc = a('authStack'),
  oc = (function () {
    function t() {
      (Object.defineProperty(this, ac, { writable: !0, value: null }),
        Object.defineProperty(this, rc, { writable: !0, value: [] }));
    }
    t.create = function () {
      return new t();
    };
    var r = t.prototype;
    return (
      (r.output = function (r) {
        return ((o(this, ac)[ac] = r), this);
      }),
      (r.addAuth = function (r) {
        if (
          o(this, rc)
            [rc].map(function (r) {
              return r.key;
            })
            .includes(r.key)
        )
          throw new Error('Auth with key "' + r.key + '" already exists in the auth stack');
        return (o(this, rc)[rc].push(r), this);
      }),
      (r.addOauth = function (r) {
        return (this.addAuth(r), this);
      }),
      (r.addTokenAuth = function (r) {
        return (this.addAuth(r), this);
      }),
      (r.addServiceAccountAuth = function (r) {
        return (this.addAuth(r), this);
      }),
      (r.addCustomAuth = function (r) {
        return (this.addAuth(r), this);
      }),
      (r.addNone = function () {
        return (
          this.addAuth({ type: 'auth.none', name: 'No Authentication', key: 'none' }),
          this
        );
      }),
      s(t, [
        {
          key: 'authStack',
          get: function () {
            return o(this, rc)[rc].filter(function (r) {
              return 'auth.none' != r.type;
            });
          }
        },
        {
          key: 'outputSchema',
          get: function () {
            if (!o(this, ac)[ac])
              throw new Error('Output schema is not defined for this auth');
            return o(this, ac)[ac];
          }
        }
      ])
    );
  })(),
  X = function () {
    return oc.create();
  },
  sc = new on.AsyncLocalStorage(),
  index_module_G = function (r, u) {
    return sc.run(r, u);
  },
  H = function () {
    var r = sc.getStore();
    if (!r) throw new Error('No Slate context is available');
    return r;
  };
rn.interceptors.request.use(
  function (r) {
    var u = H().specification;
    return (
      r.headers.set('User-Agent', 'slates.dev@1.0.0/' + u.key),
      r.headers.set('X-Slates-Provider', u.key),
      r
    );
  },
  function (r) {
    return Promise.reject(r);
  }
);
var J = function (r) {
    var u = rn.create(h({}, r, { headers: h({}, null == r ? void 0 : r.headers) }));
    return (
      u.interceptors.request.use(
        function (r) {
          var u = H().specification;
          return (
            r.headers.set('User-Agent', 'slates.dev@1.0.0/' + u.key),
            r.headers.set('X-Slates-Provider', u.key),
            r
          );
        },
        function (r) {
          return Promise.reject(r);
        }
      ),
      u
    );
  },
  cc = J(),
  uc = a('configSchema'),
  lc = a('configChanged'),
  pc = a('getDefaultConfig'),
  dc = (function () {
    function t(r) {
      (Object.defineProperty(this, uc, { writable: !0, value: void 0 }),
        Object.defineProperty(this, lc, { writable: !0, value: null }),
        Object.defineProperty(this, pc, { writable: !0, value: null }),
        (o(this, uc)[uc] = r));
    }
    t.create = function (r) {
      return new t(r);
    };
    var r = t.prototype;
    return (
      (r.config = function (r) {
        return ((o(this, uc)[uc] = r), this);
      }),
      (r.onConfigChanged = function (r) {
        return ((o(this, lc)[lc] = r), this);
      }),
      (r.getDefaultConfig = function (r) {
        return ((o(this, pc)[pc] = r), this);
      }),
      s(t, [
        {
          key: 'configSchema',
          get: function () {
            return o(this, uc)[uc];
          }
        },
        {
          key: 'handlers',
          get: function () {
            return { configChanged: o(this, lc)[lc], getDefaultConfig: o(this, pc)[pc] };
          }
        }
      ])
    );
  })(),
  Z = function (r) {
    return dc.create(r);
  },
  mc = null && a('config'),
  fc = null && a('input'),
  hc = null && a('auth'),
  gc =
    null &&
    (function () {
      function t(r, u, m, v, b) {
        ((this.spec = void 0),
          (this.logger = void 0),
          Object.defineProperty(this, mc, { writable: !0, value: void 0 }),
          Object.defineProperty(this, fc, { writable: !0, value: void 0 }),
          Object.defineProperty(this, hc, { writable: !0, value: void 0 }),
          (this.spec = v),
          (this.logger = b),
          (o(this, mc)[mc] = r),
          (o(this, fc)[fc] = u),
          (o(this, hc)[hc] = m));
      }
      var r = t.prototype;
      return (
        (r.info = function (r) {
          this.logger.info(r);
        }),
        (r.warn = function (r) {
          this.logger.warn(r);
        }),
        (r.error = function (r) {
          this.logger.error(r);
        }),
        (r.progress = function (r) {
          this.logger.progress(r);
        }),
        s(t, [
          {
            key: 'specification',
            get: function () {
              return this.spec;
            }
          },
          {
            key: 'config',
            get: function () {
              return Object.freeze(o(this, mc)[mc]);
            }
          },
          {
            key: 'input',
            get: function () {
              return Object.freeze(o(this, fc)[fc]);
            }
          },
          {
            key: 'event',
            get: function () {
              return Object.freeze(o(this, fc)[fc]);
            }
          },
          {
            key: 'state',
            get: function () {
              return Object.freeze(o(this, fc)[fc].state);
            }
          },
          {
            key: 'request',
            get: function () {
              return Object.freeze(o(this, fc)[fc].request);
            }
          },
          {
            key: 'auth',
            get: function () {
              return Object.freeze(o(this, hc)[hc]);
            }
          }
        ])
      );
    })(),
  index_module_it = function (r) {
    return 'object' == typeof r
      ? null === r
        ? 'null'
        : r instanceof Error
          ? '[ERROR]: ' + r.name + ': ' + r.message + '\n' + r.stack
          : n(r)
      : String(r);
  },
  vc = null && a('logs'),
  bc = null && a('listeners'),
  yc = null && a('timer'),
  xc =
    null &&
    (function () {
      function t(r) {
        var u;
        (void 0 === r && (r = []),
          Object.defineProperty(this, vc, { writable: !0, value: [] }),
          Object.defineProperty(this, bc, { writable: !0, value: [] }),
          Object.defineProperty(this, yc, { writable: !0, value: null }),
          (u = o(this, bc)[bc]).push.apply(u, r));
      }
      var r = t.prototype;
      return (
        (r.flush = function () {
          if ((o(this, yc)[yc] && clearTimeout(o(this, yc)[yc]), 0 !== o(this, vc)[vc].length))
            for (
              var r,
                u = (function (r) {
                  var u =
                    ('undefined' != typeof Symbol && r[Symbol.iterator]) || r['@@iterator'];
                  if (u) return (u = u.call(r)).next.bind(u);
                  if (
                    Array.isArray(r) ||
                    (u = (function (r, u) {
                      if (r) {
                        if ('string' == typeof r) return i(r, u);
                        var m = {}.toString.call(r).slice(8, -1);
                        return (
                          'Object' === m && r.constructor && (m = r.constructor.name),
                          'Map' === m || 'Set' === m
                            ? Array.from(r)
                            : 'Arguments' === m ||
                                /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(m)
                              ? i(r, u)
                              : void 0
                        );
                      }
                    })(r))
                  ) {
                    u && (r = u);
                    var m = 0;
                    return function () {
                      return m >= r.length ? { done: !0 } : { done: !1, value: r[m++] };
                    };
                  }
                  throw new TypeError(
                    'Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.'
                  );
                })(o(this, bc)[bc]);
              !(r = u()).done;
            )
              (0, r.value)(o(this, vc)[vc]);
        }),
        (r.scheduleFlush = function () {
          var r = this;
          o(this, yc)[yc] ||
            (o(this, yc)[yc] = setTimeout(function () {
              (r.flush(), (o(r, yc)[yc] = null));
            }, 10));
        }),
        (r.log = function (r, u) {
          (o(this, vc)[vc].push({
            type: r,
            timestamp: new Date(),
            message: index_module_it(u)
          }),
            this.scheduleFlush());
        }),
        (r.info = function () {
          this.log('info', [].slice.call(arguments).flat());
        }),
        (r.warn = function () {
          this.log('warn', [].slice.call(arguments).flat());
        }),
        (r.error = function () {
          this.log('error', [].slice.call(arguments).flat());
        }),
        (r.progress = function () {
          this.log('progress', [].slice.call(arguments).flat());
        }),
        t
      );
    })(),
  _c = (function () {
    function t(r, u) {
      ((this._spec = void 0), (this._actions = void 0), (this._spec = r), (this._actions = u));
    }
    return (
      (t.create = function (r) {
        return new t(r.spec, [].concat(r.triggers, r.tools));
      }),
      s(t, [
        {
          key: 'spec',
          get: function () {
            return this._spec;
          }
        },
        {
          key: 'actions',
          get: function () {
            return this._actions;
          }
        }
      ])
    );
  })(),
  wc = (function () {
    function t(r, u, m) {
      ((this._config = void 0),
        (this._auth = void 0),
        (this._params = void 0),
        (this._config = r),
        (this._auth = u),
        (this._params = m));
    }
    return (
      (t.create = function (r) {
        return new t(r.config, r.auth, r);
      }),
      s(t, [
        {
          key: 'configSchema',
          get: function () {
            return this._config.configSchema;
          }
        },
        {
          key: 'authSchema',
          get: function () {
            return 'outputSchema' in this._auth ? this._auth.outputSchema : As.object({});
          }
        },
        {
          key: 'config',
          get: function () {
            return this._config;
          }
        },
        {
          key: 'auth',
          get: function () {
            return this._auth;
          }
        },
        {
          key: 'parameters',
          get: function () {
            return this._params;
          }
        },
        {
          key: 'key',
          get: function () {
            return this._params.key;
          }
        },
        {
          key: 'name',
          get: function () {
            return this._params.name;
          }
        },
        {
          key: 'description',
          get: function () {
            return this._params.description;
          }
        }
      ])
    );
  })(),
  ft = function (r) {
    return wc.create(r);
  };
let $c = J({ baseURL: 'https://api.agencyzoom.com' });
let kc = oc
  .create()
  .output(
    object({
      token: schemas_string(),
      apiKey: schemas_string().optional(),
      apiSecret: schemas_string().optional()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Username & Password',
    key: 'username_password',
    inputSchema: object({
      username: schemas_string().describe('AgencyZoom account email address'),
      password: schemas_string().describe('AgencyZoom account password')
    }),
    getOutput: async r => {
      let u = await $c.post('/v1/api/auth/login', {
        username: r.input.username,
        password: r.input.password
      });
      let m = u.data?.token || u.data;
      return { output: { token: typeof m === 'string' ? m : String(m) } };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key & Secret',
    key: 'api_key_secret',
    inputSchema: object({
      apiKey: schemas_string().describe(
        'API Key from AgencyZoom integrations page (Zapier section)'
      ),
      apiSecret: schemas_string().describe(
        'API Secret from AgencyZoom integrations page (Zapier section)'
      )
    }),
    getOutput: async r => ({
      output: { token: '', apiKey: r.input.apiKey, apiSecret: r.input.apiSecret }
    })
  });
let Sc = dc.create(object({}));
let Ic = wc.create({
  key: 'agencyzoom',
  name: 'AgencyZoom',
  description:
    'Sales automation and CRM platform for P&C insurance agencies by Vertafore. Provides lead management, customer management, policy tracking, task management, service ticketing, and producer performance analytics.',
  metadata: {},
  config: Sc,
  auth: kc
});
const {
  Axios: zc,
  AxiosError: jc,
  CanceledError: Oc,
  isCancel: Pc,
  CancelToken: Uc,
  VERSION: Ec,
  all: Dc,
  Cancel: Tc,
  isAxiosError: Ac,
  spread: Nc,
  toFormData: Rc,
  AxiosHeaders: Cc,
  HttpStatusCode: Lc,
  formToJSON: Zc,
  getAdapter: Fc,
  mergeConfig: qc
} = rn;
class Client {
  authConfig;
  api;
  constructor(r) {
    this.authConfig = r;
    this.api = J({ baseURL: 'https://api.agencyzoom.com/v1/api' });
    this.api.interceptors.request.use(u => {
      const m = Cc.from(u.headers);
      if (r.token) {
        m.set('Authorization', `Bearer ${r.token}`);
      }
      if (r.apiKey) {
        m.set('X-Api-Key', r.apiKey);
      }
      if (r.apiSecret) {
        m.set('X-Api-Secret', r.apiSecret);
      }
      u.headers = m;
      return u;
    });
  }
  async searchLeads(r = {}) {
    let u = await this.api.get('/leads', { params: r });
    return u.data;
  }
  async getLead(r) {
    let u = await this.api.get(`/leads/${r}`);
    return u.data;
  }
  async createLead(r) {
    let u = await this.api.post('/leads', r);
    return u.data;
  }
  async createBusinessLead(r) {
    let u = await this.api.post('/leads/business', r);
    return u.data;
  }
  async updateLead(r, u) {
    let m = await this.api.put(`/leads/${r}`, u);
    return m.data;
  }
  async deleteLead(r) {
    let u = await this.api.delete(`/leads/${r}`);
    return u.data;
  }
  async changeLeadStatus(r, u) {
    let m = await this.api.put(`/leads/${r}/status`, u);
    return m.data;
  }
  async markLeadSold(r, u) {
    let m = await this.api.post(`/leads/${r}/sold`, u);
    return m.data;
  }
  async addLeadNote(r, u) {
    let m = await this.api.post(`/leads/${r}/notes`, u);
    return m.data;
  }
  async getLeadOpportunities(r) {
    let u = await this.api.get(`/leads/${r}/opportunities`);
    return u.data;
  }
  async addLeadOpportunity(r, u) {
    let m = await this.api.post(`/leads/${r}/opportunities`, u);
    return m.data;
  }
  async updateLeadOpportunity(r, u, m) {
    let v = await this.api.put(`/leads/${r}/opportunities/${u}`, m);
    return v.data;
  }
  async deleteLeadOpportunity(r, u) {
    let m = await this.api.delete(`/leads/${r}/opportunities/${u}`);
    return m.data;
  }
  async getLeadQuotes(r) {
    let u = await this.api.get(`/leads/${r}/quotes`);
    return u.data;
  }
  async addLeadQuote(r, u) {
    let m = await this.api.post(`/leads/${r}/quotes`, u);
    return m.data;
  }
  async updateLeadQuote(r, u, m) {
    let v = await this.api.put(`/leads/${r}/quotes/${u}`, m);
    return v.data;
  }
  async deleteLeadQuote(r, u) {
    let m = await this.api.delete(`/leads/${r}/quotes/${u}`);
    return m.data;
  }
  async searchLeadFiles(r) {
    let u = await this.api.post('/leads/files', r);
    return u.data;
  }
  async searchCustomers(r = {}) {
    let u = await this.api.get('/customers', { params: r });
    return u.data;
  }
  async getCustomer(r) {
    let u = await this.api.get(`/customers/${r}`);
    return u.data;
  }
  async createCustomer(r) {
    let u = await this.api.post('/customers', r);
    return u.data;
  }
  async updateCustomer(r, u) {
    let m = await this.api.put(`/customers/${r}`, u);
    return m.data;
  }
  async deleteCustomer(r) {
    let u = await this.api.delete(`/customers/${r}`);
    return u.data;
  }
  async addCustomerNote(r, u) {
    let m = await this.api.post(`/customers/${r}/notes`, u);
    return m.data;
  }
  async getCustomerPolicies(r) {
    let u = await this.api.get(`/customers/${r}/policies`);
    return u.data;
  }
  async getCustomerTasks(r) {
    let u = await this.api.get(`/customers/${r}/tasks`);
    return u.data;
  }
  async updateCustomerTags(r, u) {
    let m = await this.api.put(`/customers/${r}/tags`, u);
    return m.data;
  }
  async deleteCustomerFile(r, u) {
    let m = await this.api.delete(`/customers/${r}/files/${u}`);
    return m.data;
  }
  async createPolicy(r) {
    let u = await this.api.post('/policies', r);
    return u.data;
  }
  async updatePolicy(r, u) {
    let m = await this.api.put(`/policies/${r}`, u);
    return m.data;
  }
  async updatePolicyStatus(r, u) {
    let m = await this.api.put(`/policies/${r}/status`, u);
    return m.data;
  }
  async updatePolicyTags(r, u) {
    let m = await this.api.put(`/policies/${r}/tags`, u);
    return m.data;
  }
  async createPolicyEndorsement(r, u) {
    let m = await this.api.post(`/policies/${r}/endorsements`, u);
    return m.data;
  }
  async deletePolicy(r) {
    let u = await this.api.delete(`/policies/${r}`);
    return u.data;
  }
  async searchTasks(r = {}) {
    let u = await this.api.get('/tasks', { params: r });
    return u.data;
  }
  async getTask(r) {
    let u = await this.api.get(`/tasks/${r}`);
    return u.data;
  }
  async createTask(r) {
    let u = await this.api.post('/tasks', r);
    return u.data;
  }
  async updateTask(r, u) {
    let m = await this.api.put(`/tasks/${r}`, u);
    return m.data;
  }
  async deleteTask(r) {
    let u = await this.api.delete(`/tasks/${r}`);
    return u.data;
  }
  async completeTask(r) {
    let u = await this.api.put(`/tasks/${r}/complete`);
    return u.data;
  }
  async reopenTask(r, u) {
    let m = await this.api.put(`/tasks/${r}/reopen`, u);
    return m.data;
  }
  async batchDeleteTasks(r) {
    let u = await this.api.post('/tasks/batch-delete', { taskIds: r });
    return u.data;
  }
  async getOpportunity(r) {
    let u = await this.api.get(`/opportunities/${r}`);
    return u.data;
  }
  async createOpportunity(r) {
    let u = await this.api.post('/opportunities', r);
    return u.data;
  }
  async updateOpportunity(r, u) {
    let m = await this.api.put(`/opportunities/${r}`, u);
    return m.data;
  }
  async deleteOpportunity(r) {
    let u = await this.api.delete(`/opportunities/${r}`);
    return u.data;
  }
  async getOpportunityDrivers(r) {
    let u = await this.api.get(`/opportunities/${r}/drivers`);
    return u.data;
  }
  async createOpportunityDriver(r, u) {
    let m = await this.api.post(`/opportunities/${r}/drivers`, u);
    return m.data;
  }
  async updateOpportunityDriver(r, u, m) {
    let v = await this.api.put(`/opportunities/${r}/drivers/${u}`, m);
    return v.data;
  }
  async deleteOpportunityDriver(r, u) {
    let m = await this.api.delete(`/opportunities/${r}/drivers/${u}`);
    return m.data;
  }
  async getOpportunityVehicles(r) {
    let u = await this.api.get(`/opportunities/${r}/vehicles`);
    return u.data;
  }
  async createOpportunityVehicle(r, u) {
    let m = await this.api.post(`/opportunities/${r}/vehicles`, u);
    return m.data;
  }
  async updateOpportunityVehicle(r, u, m) {
    let v = await this.api.put(`/opportunities/${r}/vehicles/${u}`, m);
    return v.data;
  }
  async deleteOpportunityVehicle(r, u) {
    let m = await this.api.delete(`/opportunities/${r}/vehicles/${u}`);
    return m.data;
  }
  async searchServiceTickets(r = {}) {
    let u = await this.api.get('/service-tickets', { params: r });
    return u.data;
  }
  async createServiceTicket(r) {
    let u = await this.api.post('/service-tickets', r);
    return u.data;
  }
  async updateServiceTicket(r, u) {
    let m = await this.api.put(`/service-tickets/${r}`, u);
    return m.data;
  }
  async completeServiceTicket(r, u) {
    let m = await this.api.put(`/service-tickets/${r}/complete`, u);
    return m.data;
  }
  async batchCreateContacts(r) {
    let u = await this.api.post('/contacts/batch', r);
    return u.data;
  }
  async getCarriers() {
    let r = await this.api.get('/carriers');
    return r.data;
  }
  async getProductLines() {
    let r = await this.api.get('/product-lines');
    return r.data;
  }
  async getProductCategories() {
    let r = await this.api.get('/product-categories');
    return r.data;
  }
  async getEmployees() {
    let r = await this.api.get('/employees');
    return r.data;
  }
  async getLeadSources() {
    let r = await this.api.get('/lead-sources');
    return r.data;
  }
  async getLeadSourceCategories() {
    let r = await this.api.get('/lead-source-categories');
    return r.data;
  }
  async getLocations() {
    let r = await this.api.get('/locations');
    return r.data;
  }
  async getLossReasons() {
    let r = await this.api.get('/loss-reasons');
    return r.data;
  }
  async getCustomFields() {
    let r = await this.api.get('/custom-fields');
    return r.data;
  }
  async getPipelines() {
    let r = await this.api.get('/pipelines');
    return r.data;
  }
  async getPipelineStages(r) {
    let u = await this.api.get(`/pipelines/${r}/stages`);
    return u.data;
  }
  async getServiceCategories() {
    let r = await this.api.get('/service-categories');
    return r.data;
  }
  async getServicePriorities() {
    let r = await this.api.get('/service-priorities');
    return r.data;
  }
  async getServiceResolutions() {
    let r = await this.api.get('/service-resolutions');
    return r.data;
  }
  async getAssignGroups() {
    let r = await this.api.get('/assign-groups');
    return r.data;
  }
  async getCsrs() {
    let r = await this.api.get('/csrs');
    return r.data;
  }
  async getBusinessClassifications(r) {
    let u = await this.api.get('/business-classifications', { params: r });
    return u.data;
  }
  async getLifeProfessionals() {
    let r = await this.api.get('/life-professionals');
    return r.data;
  }
  async searchEmailThreads(r = {}) {
    let u = await this.api.get('/email-threads', { params: r });
    return u.data;
  }
  async getEmailThread(r) {
    let u = await this.api.get(`/email-threads/${r}`);
    return u.data;
  }
  async deleteEmailThread(r) {
    let u = await this.api.delete(`/email-threads/${r}`);
    return u.data;
  }
  async markEmailThreadUnread(r) {
    let u = await this.api.put(`/email-threads/${r}/unread`);
    return u.data;
  }
  async searchSmsThreads(r = {}) {
    let u = await this.api.get('/text-threads', { params: r });
    return u.data;
  }
  async deleteSmsThread(r) {
    let u = await this.api.delete(`/text-threads/${r}`);
    return u.data;
  }
  async updateProfile(r) {
    let u = await this.api.put('/profile', r);
    return u.data;
  }
}
let Bc = Ws.create(Ic, {
  name: 'Search Customers',
  key: 'search_customers',
  description: `Search and list customers in AgencyZoom. Filter by search term, customer type, date range, and paginate through results. Returns a summary list of matching customers with basic contact information.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    object({
      search: schemas_string()
        .optional()
        .describe('Search term to filter customers by name, email, phone, or company'),
      type: schemas_enum(['personal', 'commercial'])
        .optional()
        .describe('Filter by customer type'),
      fromDate: schemas_string()
        .optional()
        .describe(
          'Filter customers created on or after this date (ISO 8601 format, e.g. "2024-01-01")'
        ),
      toDate: schemas_string()
        .optional()
        .describe(
          'Filter customers created on or before this date (ISO 8601 format, e.g. "2024-12-31")'
        ),
      offset: schemas_number().optional().describe('Number of records to skip for pagination'),
      limit: schemas_number().optional().describe('Maximum number of records to return')
    })
  )
  .output(
    object({
      customers: array(
        object({
          customerId: schemas_string().describe('Unique identifier for the customer'),
          firstName: schemas_string().describe('Customer first name'),
          lastName: schemas_string().describe('Customer last name'),
          companyName: schemas_string()
            .optional()
            .describe('Company name for commercial customers'),
          email: schemas_string().optional().describe('Customer primary email address'),
          phone: schemas_string().optional().describe('Customer primary phone number'),
          type: schemas_string().optional().describe('Customer type: personal or commercial'),
          createdAt: schemas_string()
            .optional()
            .describe('Date the customer record was created')
        })
      ).describe('Array of matching customer records'),
      total: schemas_number().describe(
        'Total number of customers matching the search criteria'
      )
    })
  )
  .handleInvocation(async r => {
    let u = new Client({
      token: r.auth.token,
      apiKey: r.auth.apiKey,
      apiSecret: r.auth.apiSecret
    });
    let m = {};
    if (r.input.search !== undefined) m.search = r.input.search;
    if (r.input.type !== undefined) m.type = r.input.type;
    if (r.input.fromDate !== undefined) m.fromDate = r.input.fromDate;
    if (r.input.toDate !== undefined) m.toDate = r.input.toDate;
    if (r.input.offset !== undefined) m.offset = r.input.offset;
    if (r.input.limit !== undefined) m.limit = r.input.limit;
    let v = await u.searchCustomers(m);
    let b = (v.customers || v.data || v || []).map(r => ({
      customerId: r.customerId || r.id || '',
      firstName: r.firstName || '',
      lastName: r.lastName || '',
      companyName: r.companyName,
      email: r.email,
      phone: r.phone,
      type: r.type,
      createdAt: r.createdAt
    }));
    let x = v.total ?? v.totalCount ?? b.length;
    return {
      output: { customers: b, total: x },
      message: `Found **${x}** customer(s)${r.input.search ? ` matching "${r.input.search}"` : ''}.${b.length > 0 ? ` Showing ${b.length} result(s).` : ''}`
    };
  })
  .build();
let Vc = Ws.create(Ic, {
  name: 'Get Customer',
  key: 'get_customer',
  description: `Retrieve detailed information about a specific customer by ID. Optionally include the customer's policies and tasks in a single request. Returns the full customer record with all available fields.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    object({
      customerId: schemas_string().describe('Unique identifier of the customer to retrieve'),
      includePolicies: schemas_boolean()
        .optional()
        .describe("Whether to include the customer's policies in the response"),
      includeTasks: schemas_boolean()
        .optional()
        .describe("Whether to include the customer's tasks in the response")
    })
  )
  .output(
    object({
      customer: record(schemas_string(), any()).describe(
        'Full customer record with all available fields'
      ),
      policies: array(record(schemas_string(), any()))
        .optional()
        .describe(
          'Array of policies associated with the customer (included when includePolicies is true)'
        ),
      tasks: array(record(schemas_string(), any()))
        .optional()
        .describe(
          'Array of tasks associated with the customer (included when includeTasks is true)'
        )
    })
  )
  .handleInvocation(async r => {
    let u = new Client({
      token: r.auth.token,
      apiKey: r.auth.apiKey,
      apiSecret: r.auth.apiSecret
    });
    let m = await u.getCustomer(r.input.customerId);
    let v;
    let b;
    let x = [];
    if (r.input.includePolicies) {
      let m = await u.getCustomerPolicies(r.input.customerId);
      let b = m.policies || m.data || m || [];
      v = Array.isArray(b) ? b : [];
      x.push(`${v.length} policy/policies`);
    }
    if (r.input.includeTasks) {
      let m = await u.getCustomerTasks(r.input.customerId);
      let v = m.tasks || m.data || m || [];
      b = Array.isArray(v) ? v : [];
      x.push(`${b.length} task(s)`);
    }
    let w = `${m.firstName || ''} ${m.lastName || ''}`.trim() || r.input.customerId;
    let $ = x.length > 0 ? ` Including ${x.join(' and ')}.` : '';
    return {
      output: { customer: m, policies: v, tasks: b },
      message: `Retrieved customer **${w}**.${$}`
    };
  })
  .build();
let Mc = Ws.create(Ic, {
  name: 'Create Customer',
  key: 'create_customer',
  description: `Create a new personal or commercial customer record in AgencyZoom. Provide contact details, address, business information (for commercial customers), tags, and custom fields. Returns the newly created customer record.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    object({
      firstName: schemas_string().describe('Customer first name'),
      lastName: schemas_string().describe('Customer last name'),
      email: schemas_string().optional().describe('Customer primary email address'),
      phone: schemas_string().optional().describe('Customer primary phone number'),
      address: object({
        street: schemas_string().optional().describe('Street address line'),
        city: schemas_string().optional().describe('City name'),
        state: schemas_string().optional().describe('State or province code'),
        zip: schemas_string().optional().describe('ZIP or postal code'),
        country: schemas_string().optional().describe('Country name or code')
      })
        .optional()
        .describe('Customer mailing address'),
      type: schemas_enum(['personal', 'commercial'])
        .optional()
        .describe('Customer type (defaults to personal if not specified)'),
      companyName: schemas_string()
        .optional()
        .describe('Company name (typically used for commercial customers)'),
      fein: schemas_string()
        .optional()
        .describe('Federal Employer Identification Number for commercial customers'),
      businessEntity: schemas_string()
        .optional()
        .describe('Business entity type (e.g. LLC, Corporation, Partnership)'),
      classification: schemas_string()
        .optional()
        .describe('Business classification or industry code'),
      employeeCount: schemas_number()
        .optional()
        .describe('Number of employees for commercial customers'),
      annualRevenue: schemas_number()
        .optional()
        .describe('Annual revenue in dollars for commercial customers'),
      payroll: schemas_number()
        .optional()
        .describe('Annual payroll amount in dollars for commercial customers'),
      tags: array(schemas_string())
        .optional()
        .describe('Array of tag names to assign to the customer'),
      customFields: record(schemas_string(), any())
        .optional()
        .describe('Key-value pairs of custom field names and their values')
    })
  )
  .output(
    object({
      customer: record(schemas_string(), any()).describe(
        'The newly created customer record with all fields'
      )
    })
  )
  .handleInvocation(async r => {
    let u = new Client({
      token: r.auth.token,
      apiKey: r.auth.apiKey,
      apiSecret: r.auth.apiSecret
    });
    let m = { firstName: r.input.firstName, lastName: r.input.lastName };
    if (r.input.email !== undefined) m.email = r.input.email;
    if (r.input.phone !== undefined) m.phone = r.input.phone;
    if (r.input.address !== undefined) m.address = r.input.address;
    if (r.input.type !== undefined) m.type = r.input.type;
    if (r.input.companyName !== undefined) m.companyName = r.input.companyName;
    if (r.input.fein !== undefined) m.fein = r.input.fein;
    if (r.input.businessEntity !== undefined) m.businessEntity = r.input.businessEntity;
    if (r.input.classification !== undefined) m.classification = r.input.classification;
    if (r.input.employeeCount !== undefined) m.employeeCount = r.input.employeeCount;
    if (r.input.annualRevenue !== undefined) m.annualRevenue = r.input.annualRevenue;
    if (r.input.payroll !== undefined) m.payroll = r.input.payroll;
    if (r.input.tags !== undefined) m.tags = r.input.tags;
    if (r.input.customFields !== undefined) m.customFields = r.input.customFields;
    let v = await u.createCustomer(m);
    let b = `${v.firstName || r.input.firstName} ${v.lastName || r.input.lastName}`.trim();
    let x = v.customerId || v.id || '';
    return {
      output: { customer: v },
      message: `Created ${r.input.type || 'personal'} customer **${b}**${x ? ` (ID: ${x})` : ''}.`
    };
  })
  .build();
let Jc = Ws.create(Ic, {
  name: 'Update Customer',
  key: 'update_customer',
  description: `Update an existing customer's details or tags in AgencyZoom. Provide only the fields you want to change. If tags are provided, the customer's tags will be replaced via a separate tags endpoint. Returns the updated customer record.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    object({
      customerId: schemas_string().describe('Unique identifier of the customer to update'),
      firstName: schemas_string().optional().describe('Updated first name'),
      lastName: schemas_string().optional().describe('Updated last name'),
      email: schemas_string().optional().describe('Updated primary email address'),
      phone: schemas_string().optional().describe('Updated primary phone number'),
      address: object({
        street: schemas_string().optional().describe('Street address line'),
        city: schemas_string().optional().describe('City name'),
        state: schemas_string().optional().describe('State or province code'),
        zip: schemas_string().optional().describe('ZIP or postal code'),
        country: schemas_string().optional().describe('Country name or code')
      })
        .optional()
        .describe('Updated mailing address'),
      companyName: schemas_string().optional().describe('Updated company name'),
      fein: schemas_string()
        .optional()
        .describe('Updated Federal Employer Identification Number'),
      tags: array(schemas_string())
        .optional()
        .describe('Array of tag names to set on the customer (replaces existing tags)'),
      customFields: record(schemas_string(), any())
        .optional()
        .describe('Key-value pairs of custom field names and their updated values')
    })
  )
  .output(
    object({
      customer: record(schemas_string(), any()).describe(
        'The updated customer record with all fields'
      )
    })
  )
  .handleInvocation(async r => {
    let u = new Client({
      token: r.auth.token,
      apiKey: r.auth.apiKey,
      apiSecret: r.auth.apiSecret
    });
    let m = {};
    if (r.input.firstName !== undefined) m.firstName = r.input.firstName;
    if (r.input.lastName !== undefined) m.lastName = r.input.lastName;
    if (r.input.email !== undefined) m.email = r.input.email;
    if (r.input.phone !== undefined) m.phone = r.input.phone;
    if (r.input.address !== undefined) m.address = r.input.address;
    if (r.input.companyName !== undefined) m.companyName = r.input.companyName;
    if (r.input.fein !== undefined) m.fein = r.input.fein;
    if (r.input.customFields !== undefined) m.customFields = r.input.customFields;
    let v;
    let b = [];
    if (Object.keys(m).length > 0) {
      v = await u.updateCustomer(r.input.customerId, m);
      b.push('details');
    }
    if (r.input.tags !== undefined) {
      await u.updateCustomerTags(r.input.customerId, { tags: r.input.tags });
      b.push('tags');
    }
    if (!v) {
      v = await u.getCustomer(r.input.customerId);
    }
    let x = `${v.firstName || ''} ${v.lastName || ''}`.trim() || r.input.customerId;
    return {
      output: { customer: v },
      message: `Updated ${b.join(' and ')} for customer **${x}**.`
    };
  })
  .build();
let Kc = Ws.create(Ic, {
  name: 'Delete Customer',
  key: 'delete_customer',
  description: `Permanently delete a customer record from AgencyZoom. This action is irreversible and will remove the customer and all associated data. Use with caution.`,
  constraints: [
    'This action is irreversible. The customer and all associated data will be permanently deleted.'
  ],
  tags: { destructive: true, readOnly: false }
})
  .input(
    object({
      customerId: schemas_string().describe('Unique identifier of the customer to delete')
    })
  )
  .output(
    object({
      success: schemas_boolean().describe('Whether the customer was successfully deleted')
    })
  )
  .handleInvocation(async r => {
    let u = new Client({
      token: r.auth.token,
      apiKey: r.auth.apiKey,
      apiSecret: r.auth.apiSecret
    });
    await u.deleteCustomer(r.input.customerId);
    return {
      output: { success: true },
      message: `Successfully deleted customer **${r.input.customerId}**.`
    };
  })
  .build();
let Wc = Ws.create(Ic, {
  name: 'Add Customer Note',
  key: 'add_customer_note',
  description: `Add a note to an existing customer record in AgencyZoom. Notes are useful for recording interactions, follow-up reminders, or any relevant information about the customer. Returns the newly created note.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    object({
      customerId: schemas_string().describe(
        'Unique identifier of the customer to add a note to'
      ),
      note: schemas_string().describe('The note text content to add to the customer record')
    })
  )
  .output(
    object({
      note: record(schemas_string(), any()).describe(
        'The newly created note record with all fields'
      )
    })
  )
  .handleInvocation(async r => {
    let u = new Client({
      token: r.auth.token,
      apiKey: r.auth.apiKey,
      apiSecret: r.auth.apiSecret
    });
    let m = await u.addCustomerNote(r.input.customerId, { note: r.input.note });
    let v = m.noteId || m.id || '';
    let b = r.input.note.length > 80 ? r.input.note.substring(0, 80) + '...' : r.input.note;
    return {
      output: { note: m },
      message: `Added note to customer **${r.input.customerId}**${v ? ` (note ID: ${v})` : ''}: "${b}"`
    };
  })
  .build();
let Gc = Ws.create(Ic, {
  name: 'Search Service Tickets',
  key: 'search_service_tickets',
  description: `Search and list service tickets in AgencyZoom. Filter by status, category, priority, resolution, CSR, customer, date range, carrier, or policy type. Supports pagination with offset and limit.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    object({
      status: schemas_string().optional().describe('Filter by ticket status'),
      category: schemas_string().optional().describe('Filter by service category'),
      priority: schemas_string().optional().describe('Filter by ticket priority'),
      resolution: schemas_string().optional().describe('Filter by ticket resolution'),
      csrId: schemas_string()
        .optional()
        .describe('Filter by CSR (customer service representative) ID'),
      customerId: schemas_string().optional().describe('Filter by customer ID'),
      fromDate: schemas_string()
        .optional()
        .describe('Filter tickets created on or after this date (ISO 8601 format)'),
      toDate: schemas_string()
        .optional()
        .describe('Filter tickets created on or before this date (ISO 8601 format)'),
      carrier: schemas_string().optional().describe('Filter by carrier name or ID'),
      policyType: schemas_string().optional().describe('Filter by policy type'),
      offset: schemas_number().optional().describe('Number of records to skip for pagination'),
      limit: schemas_number().optional().describe('Maximum number of records to return')
    })
  )
  .output(
    object({
      tickets: array(
        object({
          ticketId: schemas_string().describe('Unique identifier of the service ticket'),
          customerId: schemas_string().describe('ID of the associated customer'),
          csrId: schemas_string().optional().describe('ID of the assigned CSR'),
          category: schemas_string().optional().describe('Service ticket category'),
          priority: schemas_string().optional().describe('Service ticket priority level'),
          status: schemas_string().optional().describe('Current status of the ticket'),
          resolution: schemas_string().optional().describe('Resolution of the ticket'),
          createdAt: schemas_string()
            .optional()
            .describe('Timestamp when the ticket was created')
        })
      ).describe('Array of service tickets matching the search criteria'),
      total: schemas_number().describe('Total number of tickets matching the search criteria')
    })
  )
  .handleInvocation(async r => {
    let u = new Client({
      token: r.auth.token,
      apiKey: r.auth.apiKey,
      apiSecret: r.auth.apiSecret
    });
    let m = {};
    if (r.input.status) m.status = r.input.status;
    if (r.input.category) m.category = r.input.category;
    if (r.input.priority) m.priority = r.input.priority;
    if (r.input.resolution) m.resolution = r.input.resolution;
    if (r.input.csrId) m.csrId = r.input.csrId;
    if (r.input.customerId) m.customerId = r.input.customerId;
    if (r.input.fromDate) m.fromDate = r.input.fromDate;
    if (r.input.toDate) m.toDate = r.input.toDate;
    if (r.input.carrier) m.carrier = r.input.carrier;
    if (r.input.policyType) m.policyType = r.input.policyType;
    if (r.input.offset !== undefined) m.offset = r.input.offset;
    if (r.input.limit !== undefined) m.limit = r.input.limit;
    let v = await u.searchServiceTickets(m);
    let b = Array.isArray(v) ? v : (v?.data ?? v?.items ?? []);
    let x = v?.total ?? v?.count ?? b.length;
    let w = b.map(r => ({
      ticketId: r.ticketId ?? r.id ?? '',
      customerId: r.customerId ?? '',
      csrId: r.csrId,
      category: r.category,
      priority: r.priority,
      status: r.status,
      resolution: r.resolution,
      createdAt: r.createdAt ?? r.created
    }));
    return {
      output: { tickets: w, total: x },
      message: `Found **${x}** service ticket(s).${w.length < x ? ` Showing ${w.length} result(s).` : ''}`
    };
  })
  .build();
let Hc = Ws.create(Ic, {
  name: 'Create Service Ticket',
  key: 'create_service_ticket',
  description: `Create a new service ticket in AgencyZoom. A service ticket tracks a customer service request or issue. Requires a customer ID; optionally assign a CSR, set category, priority, pipeline stage, description, and tags.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    object({
      customerId: schemas_string().describe(
        'ID of the customer to create the service ticket for'
      ),
      csrId: schemas_string()
        .optional()
        .describe('ID of the CSR (customer service representative) to assign'),
      category: schemas_string()
        .optional()
        .describe(
          'Service ticket category. Use list-reference-data with dataType "service_categories" to get valid values.'
        ),
      priority: schemas_string()
        .optional()
        .describe(
          'Service ticket priority level. Use list-reference-data with dataType "service_priorities" to get valid values.'
        ),
      pipelineId: schemas_string()
        .optional()
        .describe(
          'Pipeline ID to associate the ticket with. Use list-reference-data with dataType "pipelines" to get valid values.'
        ),
      stageId: schemas_string()
        .optional()
        .describe(
          'Pipeline stage ID. Use list-reference-data with dataType "pipeline_stages" and a pipelineId to get valid values.'
        ),
      description: schemas_string()
        .optional()
        .describe('Description or details of the service ticket'),
      tags: array(schemas_string())
        .optional()
        .describe('Array of tags to attach to the service ticket')
    })
  )
  .output(
    object({
      ticket: record(schemas_string(), any()).describe('The created service ticket data')
    })
  )
  .handleInvocation(async r => {
    let u = new Client({
      token: r.auth.token,
      apiKey: r.auth.apiKey,
      apiSecret: r.auth.apiSecret
    });
    let m = { customerId: r.input.customerId };
    if (r.input.csrId) m.csrId = r.input.csrId;
    if (r.input.category) m.category = r.input.category;
    if (r.input.priority) m.priority = r.input.priority;
    if (r.input.pipelineId) m.pipelineId = r.input.pipelineId;
    if (r.input.stageId) m.stageId = r.input.stageId;
    if (r.input.description) m.description = r.input.description;
    if (r.input.tags) m.tags = r.input.tags;
    let v = await u.createServiceTicket(m);
    let b = v?.ticketId ?? v?.id ?? 'unknown';
    return {
      output: { ticket: v },
      message: `Successfully created service ticket **${b}** for customer **${r.input.customerId}**.`
    };
  })
  .build();
let Xc = Ws.create(Ic, {
  name: 'Update Service Ticket',
  key: 'update_service_ticket',
  description: `Update or complete an existing service ticket in AgencyZoom. Use action "update" to modify ticket fields like CSR assignment, category, priority, pipeline stage, or description. Use action "complete" to mark the ticket as completed with an optional resolution.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    object({
      ticketId: schemas_string().describe('ID of the service ticket to update or complete'),
      action: schemas_enum(['update', 'complete']).describe(
        'Action to perform: "update" to modify ticket fields, "complete" to mark the ticket as completed'
      ),
      csrId: schemas_string().optional().describe('ID of the CSR to reassign the ticket to'),
      category: schemas_string().optional().describe('Updated service ticket category'),
      priority: schemas_string().optional().describe('Updated priority level'),
      pipelineId: schemas_string().optional().describe('Updated pipeline ID'),
      stageId: schemas_string().optional().describe('Updated pipeline stage ID'),
      resolution: schemas_string()
        .optional()
        .describe('Resolution for the ticket (typically used with action "complete")'),
      description: schemas_string().optional().describe('Updated description or details')
    })
  )
  .output(
    object({
      ticket: record(schemas_string(), any()).describe('The updated service ticket data')
    })
  )
  .handleInvocation(async r => {
    let u = new Client({
      token: r.auth.token,
      apiKey: r.auth.apiKey,
      apiSecret: r.auth.apiSecret
    });
    let m = {};
    if (r.input.csrId) m.csrId = r.input.csrId;
    if (r.input.category) m.category = r.input.category;
    if (r.input.priority) m.priority = r.input.priority;
    if (r.input.pipelineId) m.pipelineId = r.input.pipelineId;
    if (r.input.stageId) m.stageId = r.input.stageId;
    if (r.input.resolution) m.resolution = r.input.resolution;
    if (r.input.description) m.description = r.input.description;
    let v;
    if (r.input.action === 'complete') {
      v = await u.completeServiceTicket(r.input.ticketId, m);
    } else {
      v = await u.updateServiceTicket(r.input.ticketId, m);
    }
    let b = r.input.action === 'complete' ? 'Completed' : 'Updated';
    return {
      output: { ticket: v },
      message: `${b} service ticket **${r.input.ticketId}** successfully.`
    };
  })
  .build();
let Yc = Ws.create(Ic, {
  name: 'Batch Create Contacts',
  key: 'batch_create_contacts',
  description: `Create up to 5 contacts associated with customers in AgencyZoom. Each contact requires a customer ID, first name, and last name. Optionally include email, phone, birthday, and address fields.`,
  constraints: ['Maximum of 5 contacts per request'],
  tags: { destructive: false, readOnly: false }
})
  .input(
    object({
      contacts: array(
        object({
          customerId: schemas_string().describe(
            'ID of the customer to associate the contact with'
          ),
          firstName: schemas_string().describe('First name of the contact'),
          lastName: schemas_string().describe('Last name of the contact'),
          email: schemas_string().optional().describe('Email address of the contact'),
          phone: schemas_string().optional().describe('Phone number of the contact'),
          birthday: schemas_string()
            .optional()
            .describe('Birthday of the contact (ISO 8601 date format, e.g. "1990-01-15")'),
          address: object({
            street: schemas_string().optional().describe('Street address'),
            city: schemas_string().optional().describe('City'),
            state: schemas_string().optional().describe('State or province'),
            zip: schemas_string().optional().describe('ZIP or postal code')
          })
            .optional()
            .describe('Mailing address of the contact')
        })
      )
        .min(1)
        .max(5)
        .describe('Array of contacts to create (1 to 5 contacts)')
    })
  )
  .output(
    object({
      contacts: array(record(schemas_string(), any())).describe(
        'Array of created contact records'
      )
    })
  )
  .handleInvocation(async r => {
    let u = new Client({
      token: r.auth.token,
      apiKey: r.auth.apiKey,
      apiSecret: r.auth.apiSecret
    });
    let m = r.input.contacts.map(r => {
      let u = { customerId: r.customerId, firstName: r.firstName, lastName: r.lastName };
      if (r.email) u.email = r.email;
      if (r.phone) u.phone = r.phone;
      if (r.birthday) u.birthday = r.birthday;
      if (r.address) u.address = r.address;
      return u;
    });
    let v = await u.batchCreateContacts(m);
    let b = Array.isArray(v) ? v : (v?.data ?? v?.contacts ?? [v]);
    return {
      output: { contacts: b },
      message: `Successfully created **${b.length}** contact(s).`
    };
  })
  .build();
let Qc = Ws.create(Ic, {
  name: 'List Reference Data',
  key: 'list_reference_data',
  description: `Retrieve configuration and reference data such as carriers, product lines, employees, pipelines, lead sources, and more. Use this to look up valid IDs and values for use in other tools.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    object({
      dataType: schemas_enum([
        'carriers',
        'product_lines',
        'product_categories',
        'employees',
        'lead_sources',
        'lead_source_categories',
        'locations',
        'loss_reasons',
        'custom_fields',
        'pipelines',
        'pipeline_stages',
        'service_categories',
        'service_priorities',
        'service_resolutions',
        'assign_groups',
        'csrs',
        'business_classifications',
        'life_professionals'
      ]).describe(
        'Type of reference data to retrieve. Determines which API endpoint is called.'
      ),
      pipelineId: schemas_string()
        .optional()
        .describe(
          'Pipeline ID, required when dataType is "pipeline_stages" to fetch stages for a specific pipeline'
        ),
      searchQuery: schemas_string()
        .optional()
        .describe(
          'Search query string, used when dataType is "business_classifications" to filter results'
        )
    })
  )
  .output(
    object({
      items: array(any()).describe('Array of reference data items returned from the API')
    })
  )
  .handleInvocation(async r => {
    let u = new Client({
      token: r.auth.token,
      apiKey: r.auth.apiKey,
      apiSecret: r.auth.apiSecret
    });
    let m;
    let v = r.input.dataType.replace(/_/g, ' ');
    switch (r.input.dataType) {
      case 'carriers':
        m = await u.getCarriers();
        break;
      case 'product_lines':
        m = await u.getProductLines();
        break;
      case 'product_categories':
        m = await u.getProductCategories();
        break;
      case 'employees':
        m = await u.getEmployees();
        break;
      case 'lead_sources':
        m = await u.getLeadSources();
        break;
      case 'lead_source_categories':
        m = await u.getLeadSourceCategories();
        break;
      case 'locations':
        m = await u.getLocations();
        break;
      case 'loss_reasons':
        m = await u.getLossReasons();
        break;
      case 'custom_fields':
        m = await u.getCustomFields();
        break;
      case 'pipelines':
        m = await u.getPipelines();
        break;
      case 'pipeline_stages': {
        if (!r.input.pipelineId) {
          throw new Error('pipelineId is required when dataType is "pipeline_stages"');
        }
        m = await u.getPipelineStages(r.input.pipelineId);
        break;
      }
      case 'service_categories':
        m = await u.getServiceCategories();
        break;
      case 'service_priorities':
        m = await u.getServicePriorities();
        break;
      case 'service_resolutions':
        m = await u.getServiceResolutions();
        break;
      case 'assign_groups':
        m = await u.getAssignGroups();
        break;
      case 'csrs':
        m = await u.getCsrs();
        break;
      case 'business_classifications': {
        let v = {};
        if (r.input.searchQuery) v.search = r.input.searchQuery;
        m = await u.getBusinessClassifications(v);
        break;
      }
      case 'life_professionals':
        m = await u.getLifeProfessionals();
        break;
      default:
        throw new Error(`Unsupported dataType: ${r.input.dataType}`);
    }
    let b = Array.isArray(m) ? m : (m?.data ?? m?.items ?? [m]);
    return { output: { items: b }, message: `Retrieved **${b.length}** ${v} item(s).` };
  })
  .build();
let eu = Ws.create(Ic, {
  name: 'Search Leads',
  key: 'search_leads',
  description: `Search and list leads in AgencyZoom with flexible filtering options. Filter by status, producer, lead source, pipeline, stage, and date range. Supports pagination with offset and limit.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    object({
      search: schemas_string()
        .optional()
        .describe('Free-text search query to match against lead name, email, phone, etc.'),
      status: schemas_enum(['new', 'contacted', 'quoted', 'won', 'lost', 'x-dated'])
        .optional()
        .describe('Filter leads by their current status'),
      producerId: schemas_string()
        .optional()
        .describe('Filter leads assigned to a specific producer by their ID'),
      leadSourceId: schemas_string()
        .optional()
        .describe('Filter leads by their lead source ID'),
      pipelineId: schemas_string()
        .optional()
        .describe('Filter leads belonging to a specific pipeline by ID'),
      stageId: schemas_string()
        .optional()
        .describe('Filter leads at a specific pipeline stage by ID'),
      fromDate: schemas_string()
        .optional()
        .describe(
          'Start date for filtering leads by creation date (ISO 8601 format, e.g. "2024-01-01")'
        ),
      toDate: schemas_string()
        .optional()
        .describe(
          'End date for filtering leads by creation date (ISO 8601 format, e.g. "2024-12-31")'
        ),
      offset: schemas_number()
        .optional()
        .describe('Number of records to skip for pagination (default 0)'),
      limit: schemas_number()
        .optional()
        .describe('Maximum number of leads to return (default varies by API)')
    })
  )
  .output(
    object({
      leads: array(
        object({
          leadId: schemas_string().describe('Unique identifier of the lead'),
          firstName: schemas_string().optional().describe('First name of the lead'),
          lastName: schemas_string().optional().describe('Last name of the lead'),
          email: schemas_string().optional().describe('Email address of the lead'),
          phone: schemas_string().optional().describe('Phone number of the lead'),
          status: schemas_string().optional().describe('Current status of the lead'),
          producer: any().optional().describe('Producer (agent) assigned to the lead'),
          leadSource: any().optional().describe('Source through which the lead was acquired'),
          createdAt: schemas_string()
            .optional()
            .describe('ISO 8601 timestamp when the lead was created')
        })
      ).describe('Array of leads matching the search criteria'),
      total: schemas_number().describe('Total number of leads matching the search criteria')
    })
  )
  .handleInvocation(async r => {
    let u = new Client({
      token: r.auth.token,
      apiKey: r.auth.apiKey,
      apiSecret: r.auth.apiSecret
    });
    let m = {};
    if (r.input.search !== undefined) m.search = r.input.search;
    if (r.input.status !== undefined) m.status = r.input.status;
    if (r.input.producerId !== undefined) m.producerId = r.input.producerId;
    if (r.input.leadSourceId !== undefined) m.leadSourceId = r.input.leadSourceId;
    if (r.input.pipelineId !== undefined) m.pipelineId = r.input.pipelineId;
    if (r.input.stageId !== undefined) m.stageId = r.input.stageId;
    if (r.input.fromDate !== undefined) m.fromDate = r.input.fromDate;
    if (r.input.toDate !== undefined) m.toDate = r.input.toDate;
    if (r.input.offset !== undefined) m.offset = r.input.offset;
    if (r.input.limit !== undefined) m.limit = r.input.limit;
    let v = await u.searchLeads(m);
    let b = Array.isArray(v.data) ? v.data : Array.isArray(v) ? v : [];
    let x = v.total ?? v.count ?? b.length;
    let w = b.map(r => ({
      leadId: r.leadId ?? r.id ?? '',
      firstName: r.firstName,
      lastName: r.lastName,
      email: r.email,
      phone: r.phone,
      status: r.status,
      producer: r.producer,
      leadSource: r.leadSource,
      createdAt: r.createdAt
    }));
    return {
      output: { leads: w, total: x },
      message: `Found **${x}** lead(s).${w.length < x ? ` Showing ${w.length} results.` : ''}`
    };
  })
  .build();
let tu = Ws.create(Ic, {
  name: 'Get Lead',
  key: 'get_lead',
  description: `Get detailed information about a specific lead by ID, including its opportunities and quotes. Returns full lead details such as contact info, status, pipeline position, custom fields, tags, and associated opportunities and quotes.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    object({ leadId: schemas_string().describe('Unique identifier of the lead to retrieve') })
  )
  .output(
    object({
      leadId: schemas_string().describe('Unique identifier of the lead'),
      firstName: schemas_string().optional().describe('First name of the lead'),
      lastName: schemas_string().optional().describe('Last name of the lead'),
      email: schemas_string().optional().describe('Email address of the lead'),
      phone: schemas_string().optional().describe('Phone number of the lead'),
      status: schemas_string().optional().describe('Current status of the lead'),
      producer: any().optional().describe('Producer (agent) assigned to the lead'),
      leadSource: any().optional().describe('Source through which the lead was acquired'),
      pipelineId: schemas_string()
        .optional()
        .describe('ID of the pipeline the lead belongs to'),
      stageId: schemas_string().optional().describe('ID of the current pipeline stage'),
      customFields: record(schemas_string(), any())
        .optional()
        .describe('Custom fields associated with the lead'),
      tags: array(schemas_string()).optional().describe('Tags applied to the lead'),
      createdAt: schemas_string()
        .optional()
        .describe('ISO 8601 timestamp when the lead was created'),
      updatedAt: schemas_string()
        .optional()
        .describe('ISO 8601 timestamp when the lead was last updated'),
      opportunities: array(record(schemas_string(), any())).describe(
        'Opportunities associated with this lead'
      ),
      quotes: array(record(schemas_string(), any())).describe(
        'Quotes associated with this lead'
      )
    })
  )
  .handleInvocation(async r => {
    let u = new Client({
      token: r.auth.token,
      apiKey: r.auth.apiKey,
      apiSecret: r.auth.apiSecret
    });
    let [m, v, b] = await Promise.all([
      u.getLead(r.input.leadId),
      u.getLeadOpportunities(r.input.leadId),
      u.getLeadQuotes(r.input.leadId)
    ]);
    let x = Array.isArray(v.data) ? v.data : Array.isArray(v) ? v : [];
    let w = Array.isArray(b.data) ? b.data : Array.isArray(b) ? b : [];
    let $ = m.data ?? m;
    return {
      output: {
        leadId: $.leadId ?? $.id ?? r.input.leadId,
        firstName: $.firstName,
        lastName: $.lastName,
        email: $.email,
        phone: $.phone,
        status: $.status,
        producer: $.producer,
        leadSource: $.leadSource,
        pipelineId: $.pipelineId,
        stageId: $.stageId,
        customFields: $.customFields,
        tags: $.tags,
        createdAt: $.createdAt,
        updatedAt: $.updatedAt,
        opportunities: x,
        quotes: w
      },
      message: `Retrieved lead **${$.firstName ?? ''} ${$.lastName ?? ''}** (${r.input.leadId}) with **${x.length}** opportunity(ies) and **${w.length}** quote(s).`
    };
  })
  .build();
let nu = Ws.create(Ic, {
  name: 'Create Lead',
  key: 'create_lead',
  description: `Create a new personal or commercial (business) lead in AgencyZoom. Personal leads require first and last name. Business leads additionally support company-specific fields like company name, FEIN, business entity type, classification, employee count, annual revenue, and payroll.`,
  instructions: [
    'Set type to "personal" for individual leads or "business" for commercial leads.',
    'Business-specific fields (companyName, fein, businessEntity, etc.) are only used when type is "business".',
    'Optionally assign the lead to a producer, pipeline, stage, or lead source.'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    object({
      type: schemas_enum(['personal', 'business']).describe(
        'Type of lead to create: "personal" for individual or "business" for commercial'
      ),
      firstName: schemas_string().describe('First name of the lead contact'),
      lastName: schemas_string().describe('Last name of the lead contact'),
      email: schemas_string().optional().describe('Email address of the lead'),
      phone: schemas_string().optional().describe('Phone number of the lead'),
      agentId: schemas_string()
        .optional()
        .describe('ID of the agent/producer to assign the lead to'),
      pipelineId: schemas_string()
        .optional()
        .describe('ID of the pipeline to place the lead in'),
      stageId: schemas_string()
        .optional()
        .describe('ID of the pipeline stage to place the lead at'),
      leadSourceId: schemas_string().optional().describe('ID of the lead source'),
      tags: array(schemas_string()).optional().describe('Tags to apply to the lead'),
      customFields: record(schemas_string(), any())
        .optional()
        .describe('Custom field key-value pairs to set on the lead'),
      notes: schemas_string().optional().describe('Initial note to add to the lead'),
      companyName: schemas_string().optional().describe('Company name (business leads only)'),
      fein: schemas_string()
        .optional()
        .describe('Federal Employer Identification Number (business leads only)'),
      businessEntity: schemas_string()
        .optional()
        .describe('Business entity type, e.g. LLC, Corporation (business leads only)'),
      classification: schemas_string()
        .optional()
        .describe('Business classification or industry (business leads only)'),
      employeeCount: schemas_number()
        .optional()
        .describe('Number of employees (business leads only)'),
      annualRevenue: schemas_number()
        .optional()
        .describe('Annual revenue in dollars (business leads only)'),
      payroll: schemas_number()
        .optional()
        .describe('Annual payroll in dollars (business leads only)')
    })
  )
  .output(
    object({
      lead: record(schemas_string(), any()).describe(
        'The created lead data returned by AgencyZoom'
      )
    })
  )
  .handleInvocation(async r => {
    let u = new Client({
      token: r.auth.token,
      apiKey: r.auth.apiKey,
      apiSecret: r.auth.apiSecret
    });
    let m = { firstName: r.input.firstName, lastName: r.input.lastName };
    if (r.input.email !== undefined) m.email = r.input.email;
    if (r.input.phone !== undefined) m.phone = r.input.phone;
    if (r.input.agentId !== undefined) m.agentId = r.input.agentId;
    if (r.input.pipelineId !== undefined) m.pipelineId = r.input.pipelineId;
    if (r.input.stageId !== undefined) m.stageId = r.input.stageId;
    if (r.input.leadSourceId !== undefined) m.leadSourceId = r.input.leadSourceId;
    if (r.input.tags !== undefined) m.tags = r.input.tags;
    if (r.input.customFields !== undefined) m.customFields = r.input.customFields;
    if (r.input.notes !== undefined) m.notes = r.input.notes;
    if (r.input.type === 'business') {
      if (r.input.companyName !== undefined) m.companyName = r.input.companyName;
      if (r.input.fein !== undefined) m.fein = r.input.fein;
      if (r.input.businessEntity !== undefined) m.businessEntity = r.input.businessEntity;
      if (r.input.classification !== undefined) m.classification = r.input.classification;
      if (r.input.employeeCount !== undefined) m.employeeCount = r.input.employeeCount;
      if (r.input.annualRevenue !== undefined) m.annualRevenue = r.input.annualRevenue;
      if (r.input.payroll !== undefined) m.payroll = r.input.payroll;
    }
    let v =
      r.input.type === 'business' ? await u.createBusinessLead(m) : await u.createLead(m);
    let b = v.data ?? v;
    return {
      output: { lead: b },
      message: `Created ${r.input.type} lead **${r.input.firstName} ${r.input.lastName}**${(b.leadId ?? b.id) ? ` (ID: ${b.leadId ?? b.id})` : ''}.`
    };
  })
  .build();
let iu = Ws.create(Ic, {
  name: 'Update Lead',
  key: 'update_lead',
  description: `Update a lead's details, change its status, or mark it as sold. Use action "update" to modify lead fields, "change_status" to transition the lead to a new status, or "mark_sold" to record a sale with carrier, product line, premium, and policy details.`,
  instructions: [
    'For action "update": provide any combination of fields to update (firstName, lastName, email, phone, agentId, pipelineId, stageId, leadSourceId, tags, customFields).',
    'For action "change_status": provide the new status value.',
    'For action "mark_sold": provide sale details like carrier, productLine, premium, items, effectiveDate, and expiryDate.'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    object({
      leadId: schemas_string().describe('Unique identifier of the lead to update'),
      action: schemas_enum(['update', 'change_status', 'mark_sold']).describe(
        'Operation to perform: "update" fields, "change_status", or "mark_sold"'
      ),
      firstName: schemas_string()
        .optional()
        .describe('Updated first name (for "update" action)'),
      lastName: schemas_string()
        .optional()
        .describe('Updated last name (for "update" action)'),
      email: schemas_string()
        .optional()
        .describe('Updated email address (for "update" action)'),
      phone: schemas_string()
        .optional()
        .describe('Updated phone number (for "update" action)'),
      agentId: schemas_string()
        .optional()
        .describe('Updated agent/producer ID (for "update" action)'),
      pipelineId: schemas_string()
        .optional()
        .describe('Updated pipeline ID (for "update" action)'),
      stageId: schemas_string()
        .optional()
        .describe('Updated pipeline stage ID (for "update" action)'),
      leadSourceId: schemas_string()
        .optional()
        .describe('Updated lead source ID (for "update" action)'),
      tags: array(schemas_string()).optional().describe('Updated tags (for "update" action)'),
      customFields: record(schemas_string(), any())
        .optional()
        .describe('Updated custom fields (for "update" action)'),
      status: schemas_enum(['new', 'contacted', 'quoted', 'won', 'lost', 'x-dated'])
        .optional()
        .describe('New status for the lead (for "change_status" action)'),
      carrier: schemas_string().optional().describe('Carrier name (for "mark_sold" action)'),
      productLine: schemas_string()
        .optional()
        .describe('Product line (for "mark_sold" action)'),
      premium: schemas_number()
        .optional()
        .describe('Premium amount in dollars (for "mark_sold" action)'),
      items: schemas_number()
        .optional()
        .describe('Number of policy items (for "mark_sold" action)'),
      effectiveDate: schemas_string()
        .optional()
        .describe('Policy effective date in ISO 8601 format (for "mark_sold" action)'),
      expiryDate: schemas_string()
        .optional()
        .describe('Policy expiry date in ISO 8601 format (for "mark_sold" action)')
    })
  )
  .output(
    object({
      lead: record(schemas_string(), any()).describe(
        'The updated lead data returned by AgencyZoom'
      )
    })
  )
  .handleInvocation(async r => {
    let u = new Client({
      token: r.auth.token,
      apiKey: r.auth.apiKey,
      apiSecret: r.auth.apiSecret
    });
    let m;
    switch (r.input.action) {
      case 'update': {
        let v = {};
        if (r.input.firstName !== undefined) v.firstName = r.input.firstName;
        if (r.input.lastName !== undefined) v.lastName = r.input.lastName;
        if (r.input.email !== undefined) v.email = r.input.email;
        if (r.input.phone !== undefined) v.phone = r.input.phone;
        if (r.input.agentId !== undefined) v.agentId = r.input.agentId;
        if (r.input.pipelineId !== undefined) v.pipelineId = r.input.pipelineId;
        if (r.input.stageId !== undefined) v.stageId = r.input.stageId;
        if (r.input.leadSourceId !== undefined) v.leadSourceId = r.input.leadSourceId;
        if (r.input.tags !== undefined) v.tags = r.input.tags;
        if (r.input.customFields !== undefined) v.customFields = r.input.customFields;
        m = await u.updateLead(r.input.leadId, v);
        let b = m.data ?? m;
        return { output: { lead: b }, message: `Updated lead **${r.input.leadId}** fields.` };
      }
      case 'change_status': {
        if (!r.input.status) {
          throw new Error('status is required for "change_status" action');
        }
        m = await u.changeLeadStatus(r.input.leadId, { status: r.input.status });
        let v = m.data ?? m;
        return {
          output: { lead: v },
          message: `Changed lead **${r.input.leadId}** status to **${r.input.status}**.`
        };
      }
      case 'mark_sold': {
        let v = {};
        if (r.input.carrier !== undefined) v.carrier = r.input.carrier;
        if (r.input.productLine !== undefined) v.productLine = r.input.productLine;
        if (r.input.premium !== undefined) v.premium = r.input.premium;
        if (r.input.items !== undefined) v.items = r.input.items;
        if (r.input.effectiveDate !== undefined) v.effectiveDate = r.input.effectiveDate;
        if (r.input.expiryDate !== undefined) v.expiryDate = r.input.expiryDate;
        m = await u.markLeadSold(r.input.leadId, v);
        let b = m.data ?? m;
        return {
          output: { lead: b },
          message: `Marked lead **${r.input.leadId}** as sold.${r.input.carrier ? ` Carrier: **${r.input.carrier}**.` : ''}${r.input.premium ? ` Premium: **$${r.input.premium}**.` : ''}`
        };
      }
    }
  })
  .build();
let au = Ws.create(Ic, {
  name: 'Delete Lead',
  key: 'delete_lead',
  description: `Permanently delete a lead from AgencyZoom by its ID. This action is irreversible and will remove the lead along with all associated data.`,
  constraints: [
    'This action is permanent and cannot be undone.',
    'All associated opportunities, quotes, notes, and files will also be removed.'
  ],
  tags: { destructive: true, readOnly: false }
})
  .input(
    object({ leadId: schemas_string().describe('Unique identifier of the lead to delete') })
  )
  .output(
    object({
      success: schemas_boolean().describe('Whether the lead was successfully deleted')
    })
  )
  .handleInvocation(async r => {
    let u = new Client({
      token: r.auth.token,
      apiKey: r.auth.apiKey,
      apiSecret: r.auth.apiSecret
    });
    await u.deleteLead(r.input.leadId);
    return { output: { success: true }, message: `Deleted lead **${r.input.leadId}**.` };
  })
  .build();
let ou = Ws.create(Ic, {
  name: 'Manage Lead Opportunity',
  key: 'manage_lead_opportunity',
  description: `Add, update, or delete an opportunity on a lead. Opportunities track potential insurance products and premiums associated with a lead. Use "create" to add a new opportunity, "update" to modify an existing one, or "delete" to remove one.`,
  instructions: [
    'For "create": provide the lead ID and opportunity details (carrier, productLine, premium, items).',
    'For "update": provide both leadId and opportunityId along with the fields to update.',
    'For "delete": provide both leadId and opportunityId.'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    object({
      leadId: schemas_string().describe('Unique identifier of the lead'),
      action: schemas_enum(['create', 'update', 'delete']).describe(
        'Operation to perform on the opportunity'
      ),
      opportunityId: schemas_string()
        .optional()
        .describe('Unique identifier of the opportunity (required for "update" and "delete")'),
      carrier: schemas_string().optional().describe('Insurance carrier name'),
      productLine: schemas_string().optional().describe('Product line or type of insurance'),
      premium: schemas_number().optional().describe('Premium amount in dollars'),
      items: schemas_number().optional().describe('Number of policy items')
    })
  )
  .output(
    object({
      opportunity: record(schemas_string(), any())
        .optional()
        .describe('The opportunity data returned by AgencyZoom (for "create" and "update")'),
      success: schemas_boolean()
        .optional()
        .describe('Whether the operation was successful (for "delete")')
    })
  )
  .handleInvocation(async r => {
    let u = new Client({
      token: r.auth.token,
      apiKey: r.auth.apiKey,
      apiSecret: r.auth.apiSecret
    });
    switch (r.input.action) {
      case 'create': {
        let m = {};
        if (r.input.carrier !== undefined) m.carrier = r.input.carrier;
        if (r.input.productLine !== undefined) m.productLine = r.input.productLine;
        if (r.input.premium !== undefined) m.premium = r.input.premium;
        if (r.input.items !== undefined) m.items = r.input.items;
        let v = await u.addLeadOpportunity(r.input.leadId, m);
        let b = v.data ?? v;
        return {
          output: { opportunity: b },
          message: `Created opportunity on lead **${r.input.leadId}**.${r.input.carrier ? ` Carrier: **${r.input.carrier}**.` : ''}`
        };
      }
      case 'update': {
        if (!r.input.opportunityId) {
          throw new Error('opportunityId is required for "update" action');
        }
        let m = {};
        if (r.input.carrier !== undefined) m.carrier = r.input.carrier;
        if (r.input.productLine !== undefined) m.productLine = r.input.productLine;
        if (r.input.premium !== undefined) m.premium = r.input.premium;
        if (r.input.items !== undefined) m.items = r.input.items;
        let v = await u.updateLeadOpportunity(r.input.leadId, r.input.opportunityId, m);
        let b = v.data ?? v;
        return {
          output: { opportunity: b },
          message: `Updated opportunity **${r.input.opportunityId}** on lead **${r.input.leadId}**.`
        };
      }
      case 'delete': {
        if (!r.input.opportunityId) {
          throw new Error('opportunityId is required for "delete" action');
        }
        await u.deleteLeadOpportunity(r.input.leadId, r.input.opportunityId);
        return {
          output: { success: true },
          message: `Deleted opportunity **${r.input.opportunityId}** from lead **${r.input.leadId}**.`
        };
      }
    }
  })
  .build();
let su = Ws.create(Ic, {
  name: 'Manage Lead Quote',
  key: 'manage_lead_quote',
  description: `Add, update, or delete a quote on a lead. Quotes represent insurance pricing proposals from carriers for a lead. Use "create" to add a new quote, "update" to modify an existing one, or "delete" to remove one.`,
  instructions: [
    'For "create": provide the lead ID and quote details (carrier, productLine, premium, items).',
    'For "update": provide both leadId and quoteId along with the fields to update.',
    'For "delete": provide both leadId and quoteId.'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    object({
      leadId: schemas_string().describe('Unique identifier of the lead'),
      action: schemas_enum(['create', 'update', 'delete']).describe(
        'Operation to perform on the quote'
      ),
      quoteId: schemas_string()
        .optional()
        .describe('Unique identifier of the quote (required for "update" and "delete")'),
      carrier: schemas_string().optional().describe('Insurance carrier name'),
      productLine: schemas_string().optional().describe('Product line or type of insurance'),
      premium: schemas_number().optional().describe('Quoted premium amount in dollars'),
      items: schemas_number().optional().describe('Number of policy items in the quote')
    })
  )
  .output(
    object({
      quote: record(schemas_string(), any())
        .optional()
        .describe('The quote data returned by AgencyZoom (for "create" and "update")'),
      success: schemas_boolean()
        .optional()
        .describe('Whether the operation was successful (for "delete")')
    })
  )
  .handleInvocation(async r => {
    let u = new Client({
      token: r.auth.token,
      apiKey: r.auth.apiKey,
      apiSecret: r.auth.apiSecret
    });
    switch (r.input.action) {
      case 'create': {
        let m = {};
        if (r.input.carrier !== undefined) m.carrier = r.input.carrier;
        if (r.input.productLine !== undefined) m.productLine = r.input.productLine;
        if (r.input.premium !== undefined) m.premium = r.input.premium;
        if (r.input.items !== undefined) m.items = r.input.items;
        let v = await u.addLeadQuote(r.input.leadId, m);
        let b = v.data ?? v;
        return {
          output: { quote: b },
          message: `Created quote on lead **${r.input.leadId}**.${r.input.carrier ? ` Carrier: **${r.input.carrier}**.` : ''}`
        };
      }
      case 'update': {
        if (!r.input.quoteId) {
          throw new Error('quoteId is required for "update" action');
        }
        let m = {};
        if (r.input.carrier !== undefined) m.carrier = r.input.carrier;
        if (r.input.productLine !== undefined) m.productLine = r.input.productLine;
        if (r.input.premium !== undefined) m.premium = r.input.premium;
        if (r.input.items !== undefined) m.items = r.input.items;
        let v = await u.updateLeadQuote(r.input.leadId, r.input.quoteId, m);
        let b = v.data ?? v;
        return {
          output: { quote: b },
          message: `Updated quote **${r.input.quoteId}** on lead **${r.input.leadId}**.`
        };
      }
      case 'delete': {
        if (!r.input.quoteId) {
          throw new Error('quoteId is required for "delete" action');
        }
        await u.deleteLeadQuote(r.input.leadId, r.input.quoteId);
        return {
          output: { success: true },
          message: `Deleted quote **${r.input.quoteId}** from lead **${r.input.leadId}**.`
        };
      }
    }
  })
  .build();
let cu = Ws.create(Ic, {
  name: 'Add Lead Note',
  key: 'add_lead_note',
  description: `Add a note to an existing lead in AgencyZoom. Notes are used to record interactions, observations, and other relevant information about a lead.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    object({
      leadId: schemas_string().describe('Unique identifier of the lead to add the note to'),
      note: schemas_string().describe('The note text content to add to the lead')
    })
  )
  .output(
    object({
      note: record(schemas_string(), any()).describe(
        'The created note data returned by AgencyZoom'
      )
    })
  )
  .handleInvocation(async r => {
    let u = new Client({
      token: r.auth.token,
      apiKey: r.auth.apiKey,
      apiSecret: r.auth.apiSecret
    });
    let m = await u.addLeadNote(r.input.leadId, { note: r.input.note });
    let v = m.data ?? m;
    let b = r.input.note.length > 100 ? r.input.note.substring(0, 100) + '...' : r.input.note;
    return {
      output: { note: v },
      message: `Added note to lead **${r.input.leadId}**: "${b}"`
    };
  })
  .build();
let uu = Ws.create(Ic, {
  name: 'Search Tasks',
  key: 'search_tasks',
  description: `Search and list tasks in AgencyZoom. Filter by status, type, assignee, date range, or associated lead/customer. Returns paginated results with task details.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    object({
      search: schemas_string()
        .optional()
        .describe('Search query to filter tasks by title or content'),
      status: schemas_enum(['open', 'completed']).optional().describe('Filter by task status'),
      type: schemas_enum(['to-do', 'email', 'call', 'meeting'])
        .optional()
        .describe('Filter by task type'),
      assigneeId: schemas_string().optional().describe('Filter tasks by assignee ID'),
      fromDate: schemas_string()
        .optional()
        .describe('Start date for filtering tasks (ISO date string, e.g. "2024-01-01")'),
      toDate: schemas_string()
        .optional()
        .describe('End date for filtering tasks (ISO date string, e.g. "2024-12-31")'),
      leadId: schemas_string()
        .optional()
        .describe('Filter tasks associated with a specific lead'),
      customerId: schemas_string()
        .optional()
        .describe('Filter tasks associated with a specific customer'),
      offset: schemas_number().optional().describe('Number of records to skip for pagination'),
      limit: schemas_number().optional().describe('Maximum number of tasks to return')
    })
  )
  .output(
    object({
      tasks: array(
        object({
          taskId: schemas_string().describe('Unique task identifier'),
          title: schemas_string().describe('Task title'),
          type: schemas_string().describe('Task type (to-do, email, call, meeting)'),
          status: schemas_string().describe('Task status (open, completed)'),
          assignee: any().optional().describe('Assignee information'),
          dueDate: schemas_string().optional().describe('Task due date'),
          leadId: schemas_string().optional().describe('Associated lead ID'),
          customerId: schemas_string().optional().describe('Associated customer ID'),
          createdAt: schemas_string().optional().describe('Task creation timestamp')
        })
      ).describe('Array of matching tasks'),
      total: schemas_number().describe('Total number of tasks matching the query')
    })
  )
  .handleInvocation(async r => {
    let u = new Client({
      token: r.auth.token,
      apiKey: r.auth.apiKey,
      apiSecret: r.auth.apiSecret
    });
    let m = {};
    if (r.input.search !== undefined) m.search = r.input.search;
    if (r.input.status !== undefined) m.status = r.input.status;
    if (r.input.type !== undefined) m.type = r.input.type;
    if (r.input.assigneeId !== undefined) m.assigneeId = r.input.assigneeId;
    if (r.input.fromDate !== undefined) m.fromDate = r.input.fromDate;
    if (r.input.toDate !== undefined) m.toDate = r.input.toDate;
    if (r.input.leadId !== undefined) m.leadId = r.input.leadId;
    if (r.input.customerId !== undefined) m.customerId = r.input.customerId;
    if (r.input.offset !== undefined) m.offset = r.input.offset;
    if (r.input.limit !== undefined) m.limit = r.input.limit;
    let v = await u.searchTasks(m);
    let b = Array.isArray(v) ? v : (v.data ?? v.tasks ?? v.items ?? []);
    let x = typeof v.total === 'number' ? v.total : b.length;
    let w = b.map(r => ({
      taskId: r.taskId ?? r.id ?? '',
      title: r.title ?? r.name ?? '',
      type: r.type ?? '',
      status: r.status ?? '',
      assignee: r.assignee ?? r.assignedTo ?? undefined,
      dueDate: r.dueDate ?? r.due_date ?? undefined,
      leadId: r.leadId ?? r.lead_id ?? undefined,
      customerId: r.customerId ?? r.customer_id ?? undefined,
      createdAt: r.createdAt ?? r.created_at ?? undefined
    }));
    return {
      output: { tasks: w, total: x },
      message: `Found **${x}** task(s).${w.length < x ? ` Showing ${w.length}.` : ''}`
    };
  })
  .build();
let lu = Ws.create(Ic, {
  name: 'Create Task',
  key: 'create_task',
  description: `Create a new task in AgencyZoom. Supports to-do, email, call, and meeting task types. Optionally assign to a user, set due date/time, and link to a lead or customer.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    object({
      title: schemas_string().describe('Title of the task'),
      type: schemas_enum(['to-do', 'email', 'call', 'meeting']).describe(
        'Type of task to create'
      ),
      assigneeId: schemas_string().optional().describe('ID of the user to assign the task to'),
      dueDate: schemas_string()
        .optional()
        .describe('Due date for the task (ISO date string, e.g. "2024-06-15")'),
      dueTime: schemas_string().optional().describe('Due time for the task (e.g. "14:00")'),
      duration: schemas_number().optional().describe('Duration of the task in minutes'),
      notes: schemas_string()
        .optional()
        .describe('Additional notes or description for the task'),
      leadId: schemas_string()
        .optional()
        .describe('ID of the lead to associate with this task'),
      customerId: schemas_string()
        .optional()
        .describe('ID of the customer to associate with this task'),
      invitees: array(schemas_string())
        .optional()
        .describe('Array of email addresses to invite (for meeting tasks)')
    })
  )
  .output(object({ task: record(schemas_string(), any()).describe('The created task data') }))
  .handleInvocation(async r => {
    let u = new Client({
      token: r.auth.token,
      apiKey: r.auth.apiKey,
      apiSecret: r.auth.apiSecret
    });
    let m = { title: r.input.title, type: r.input.type };
    if (r.input.assigneeId !== undefined) m.assigneeId = r.input.assigneeId;
    if (r.input.dueDate !== undefined) m.dueDate = r.input.dueDate;
    if (r.input.dueTime !== undefined) m.dueTime = r.input.dueTime;
    if (r.input.duration !== undefined) m.duration = r.input.duration;
    if (r.input.notes !== undefined) m.notes = r.input.notes;
    if (r.input.leadId !== undefined) m.leadId = r.input.leadId;
    if (r.input.customerId !== undefined) m.customerId = r.input.customerId;
    if (r.input.invitees !== undefined) m.invitees = r.input.invitees;
    let v = await u.createTask(m);
    return {
      output: { task: v },
      message: `Created **${r.input.type}** task: **${r.input.title}**.`
    };
  })
  .build();
let pu = Ws.create(Ic, {
  name: 'Update Task',
  key: 'update_task',
  description: `Update, complete, or reopen a task in AgencyZoom. Use "update" to modify task fields, "complete" to mark a task as done, or "reopen" to reopen a completed task with an optional comment.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    object({
      taskId: schemas_string().describe('ID of the task to update, complete, or reopen'),
      action: schemas_enum(['update', 'complete', 'reopen']).describe(
        'Action to perform on the task'
      ),
      title: schemas_string()
        .optional()
        .describe('New title for the task (for "update" action)'),
      type: schemas_enum(['to-do', 'email', 'call', 'meeting'])
        .optional()
        .describe('New task type (for "update" action)'),
      assigneeId: schemas_string()
        .optional()
        .describe('New assignee ID (for "update" action)'),
      dueDate: schemas_string()
        .optional()
        .describe('New due date (for "update" action, ISO date string)'),
      dueTime: schemas_string()
        .optional()
        .describe('New due time (for "update" action, e.g. "14:00")'),
      duration: schemas_number()
        .optional()
        .describe('New duration in minutes (for "update" action)'),
      notes: schemas_string()
        .optional()
        .describe('New notes for the task (for "update" action)'),
      comment: schemas_string()
        .optional()
        .describe('Comment when reopening a task (for "reopen" action)')
    })
  )
  .output(
    object({
      task: record(schemas_string(), any())
        .optional()
        .describe('Updated task data (for "update" and "reopen" actions)'),
      success: schemas_boolean()
        .optional()
        .describe('Whether the operation succeeded (for "complete" action)')
    })
  )
  .handleInvocation(async r => {
    let u = new Client({
      token: r.auth.token,
      apiKey: r.auth.apiKey,
      apiSecret: r.auth.apiSecret
    });
    switch (r.input.action) {
      case 'update': {
        let m = {};
        if (r.input.title !== undefined) m.title = r.input.title;
        if (r.input.type !== undefined) m.type = r.input.type;
        if (r.input.assigneeId !== undefined) m.assigneeId = r.input.assigneeId;
        if (r.input.dueDate !== undefined) m.dueDate = r.input.dueDate;
        if (r.input.dueTime !== undefined) m.dueTime = r.input.dueTime;
        if (r.input.duration !== undefined) m.duration = r.input.duration;
        if (r.input.notes !== undefined) m.notes = r.input.notes;
        let v = await u.updateTask(r.input.taskId, m);
        return { output: { task: v }, message: `Updated task **${r.input.taskId}**.` };
      }
      case 'complete': {
        await u.completeTask(r.input.taskId);
        return {
          output: { success: true },
          message: `Marked task **${r.input.taskId}** as complete.`
        };
      }
      case 'reopen': {
        let m = {};
        if (r.input.comment !== undefined) m.comment = r.input.comment;
        let v = await u.reopenTask(r.input.taskId, m);
        return { output: { task: v }, message: `Reopened task **${r.input.taskId}**.` };
      }
    }
  })
  .build();
let du = Ws.create(Ic, {
  name: 'Delete Task',
  key: 'delete_task',
  description: `Delete one or more tasks from AgencyZoom. Provide a single task ID or multiple IDs to batch-delete tasks. This action is permanent and cannot be undone.`,
  tags: { destructive: true, readOnly: false }
})
  .input(
    object({
      taskIds: array(schemas_string())
        .min(1)
        .describe('Array of one or more task IDs to delete')
    })
  )
  .output(
    object({ success: schemas_boolean().describe('Whether the deletion was successful') })
  )
  .handleInvocation(async r => {
    let u = new Client({
      token: r.auth.token,
      apiKey: r.auth.apiKey,
      apiSecret: r.auth.apiSecret
    });
    if (r.input.taskIds.length === 1) {
      await u.deleteTask(r.input.taskIds[0]);
    } else {
      await u.batchDeleteTasks(r.input.taskIds);
    }
    return {
      output: { success: true },
      message: `Deleted **${r.input.taskIds.length}** task(s).`
    };
  })
  .build();
let mu = Ws.create(Ic, {
  name: 'Create Policy',
  key: 'create_policy',
  description: `Create a new insurance policy in AgencyZoom. Associate it with a customer, set carrier and product line details, premium amounts, effective/expiry dates, and assign agents or CSRs.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    object({
      customerId: schemas_string().describe('ID of the customer this policy belongs to'),
      carrier: schemas_string().describe('Insurance carrier name or ID'),
      productLine: schemas_string().describe(
        'Product line name or ID (e.g. "Auto", "Home", "Life")'
      ),
      premium: schemas_number().optional().describe('Policy premium amount in cents'),
      items: schemas_number()
        .optional()
        .describe('Number of items or units covered by the policy'),
      effectiveDate: schemas_string()
        .optional()
        .describe('Policy effective date (ISO date string, e.g. "2024-01-01")'),
      expiryDate: schemas_string()
        .optional()
        .describe('Policy expiry date (ISO date string, e.g. "2025-01-01")'),
      agentId: schemas_string().optional().describe('ID of the agent assigned to this policy'),
      csrId: schemas_string().optional().describe('ID of the CSR assigned to this policy'),
      locationId: schemas_string()
        .optional()
        .describe('ID of the agency location for this policy'),
      category: schemas_string().optional().describe('Policy category'),
      tags: array(schemas_string()).optional().describe('Array of tags to apply to the policy')
    })
  )
  .output(
    object({ policy: record(schemas_string(), any()).describe('The created policy data') })
  )
  .handleInvocation(async r => {
    let u = new Client({
      token: r.auth.token,
      apiKey: r.auth.apiKey,
      apiSecret: r.auth.apiSecret
    });
    let m = {
      customerId: r.input.customerId,
      carrier: r.input.carrier,
      productLine: r.input.productLine
    };
    if (r.input.premium !== undefined) m.premium = r.input.premium;
    if (r.input.items !== undefined) m.items = r.input.items;
    if (r.input.effectiveDate !== undefined) m.effectiveDate = r.input.effectiveDate;
    if (r.input.expiryDate !== undefined) m.expiryDate = r.input.expiryDate;
    if (r.input.agentId !== undefined) m.agentId = r.input.agentId;
    if (r.input.csrId !== undefined) m.csrId = r.input.csrId;
    if (r.input.locationId !== undefined) m.locationId = r.input.locationId;
    if (r.input.category !== undefined) m.category = r.input.category;
    if (r.input.tags !== undefined) m.tags = r.input.tags;
    let v = await u.createPolicy(m);
    return {
      output: { policy: v },
      message: `Created policy for customer **${r.input.customerId}** with carrier **${r.input.carrier}** and product line **${r.input.productLine}**.`
    };
  })
  .build();
let fu = Ws.create(Ic, {
  name: 'Update Policy',
  key: 'update_policy',
  description: `Update an insurance policy in AgencyZoom. Supports updating policy details, changing policy status (active, cancelled, renewed, etc.), updating tags, or creating an endorsement with a premium change.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    object({
      policyId: schemas_string().describe('ID of the policy to update'),
      action: schemas_enum([
        'update',
        'change_status',
        'update_tags',
        'add_endorsement'
      ]).describe('Action to perform on the policy'),
      carrier: schemas_string()
        .optional()
        .describe('New carrier name or ID (for "update" action)'),
      productLine: schemas_string()
        .optional()
        .describe('New product line name or ID (for "update" action)'),
      premium: schemas_number()
        .optional()
        .describe('New premium amount in cents (for "update" action)'),
      effectiveDate: schemas_string()
        .optional()
        .describe('New effective date (for "update" action, ISO date string)'),
      expiryDate: schemas_string()
        .optional()
        .describe('New expiry date (for "update" action, ISO date string)'),
      agentId: schemas_string().optional().describe('New agent ID (for "update" action)'),
      csrId: schemas_string().optional().describe('New CSR ID (for "update" action)'),
      status: schemas_enum(['active', 'cancelled', 'renewed', 'reinstated', 'rewritten'])
        .optional()
        .describe('New policy status (for "change_status" action)'),
      tags: array(schemas_string())
        .optional()
        .describe('Array of tags to set on the policy (for "update_tags" action)'),
      endorsementPremiumChange: schemas_number()
        .optional()
        .describe(
          'Premium change amount in cents for the endorsement (for "add_endorsement" action)'
        )
    })
  )
  .output(
    object({
      policy: record(schemas_string(), any()).optional().describe('Updated policy data')
    })
  )
  .handleInvocation(async r => {
    let u = new Client({
      token: r.auth.token,
      apiKey: r.auth.apiKey,
      apiSecret: r.auth.apiSecret
    });
    switch (r.input.action) {
      case 'update': {
        let m = {};
        if (r.input.carrier !== undefined) m.carrier = r.input.carrier;
        if (r.input.productLine !== undefined) m.productLine = r.input.productLine;
        if (r.input.premium !== undefined) m.premium = r.input.premium;
        if (r.input.effectiveDate !== undefined) m.effectiveDate = r.input.effectiveDate;
        if (r.input.expiryDate !== undefined) m.expiryDate = r.input.expiryDate;
        if (r.input.agentId !== undefined) m.agentId = r.input.agentId;
        if (r.input.csrId !== undefined) m.csrId = r.input.csrId;
        let v = await u.updatePolicy(r.input.policyId, m);
        return { output: { policy: v }, message: `Updated policy **${r.input.policyId}**.` };
      }
      case 'change_status': {
        if (!r.input.status) {
          throw new Error('status is required for "change_status" action');
        }
        let m = await u.updatePolicyStatus(r.input.policyId, { status: r.input.status });
        return {
          output: { policy: m },
          message: `Changed policy **${r.input.policyId}** status to **${r.input.status}**.`
        };
      }
      case 'update_tags': {
        if (!r.input.tags) {
          throw new Error('tags is required for "update_tags" action');
        }
        let m = await u.updatePolicyTags(r.input.policyId, { tags: r.input.tags });
        return {
          output: { policy: m },
          message: `Updated tags on policy **${r.input.policyId}** (${r.input.tags.length} tag(s)).`
        };
      }
      case 'add_endorsement': {
        let m = {};
        if (r.input.endorsementPremiumChange !== undefined) {
          m.premiumChange = r.input.endorsementPremiumChange;
        }
        let v = await u.createPolicyEndorsement(r.input.policyId, m);
        return {
          output: { policy: v },
          message: `Added endorsement to policy **${r.input.policyId}**.`
        };
      }
    }
  })
  .build();
let gu = Ws.create(Ic, {
  name: 'Delete Policy',
  key: 'delete_policy',
  description: `Delete an insurance policy from AgencyZoom. This action is permanent and cannot be undone.`,
  tags: { destructive: true, readOnly: false }
})
  .input(object({ policyId: schemas_string().describe('ID of the policy to delete') }))
  .output(
    object({
      success: schemas_boolean().describe('Whether the policy was successfully deleted')
    })
  )
  .handleInvocation(async r => {
    let u = new Client({
      token: r.auth.token,
      apiKey: r.auth.apiKey,
      apiSecret: r.auth.apiSecret
    });
    await u.deletePolicy(r.input.policyId);
    return { output: { success: true }, message: `Deleted policy **${r.input.policyId}**.` };
  })
  .build();
let vu = Ws.create(Ic, {
  name: 'Get Opportunity',
  key: 'get_opportunity',
  description: `Get details of an opportunity in AgencyZoom. Optionally include associated drivers and vehicles. Useful for viewing auto insurance opportunity details with driver and vehicle information.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    object({
      opportunityId: schemas_string().describe('ID of the opportunity to retrieve'),
      includeDrivers: schemas_boolean()
        .optional()
        .describe('Whether to include associated drivers in the response'),
      includeVehicles: schemas_boolean()
        .optional()
        .describe('Whether to include associated vehicles in the response')
    })
  )
  .output(
    object({
      opportunity: record(schemas_string(), any()).describe('Opportunity detail data'),
      drivers: array(record(schemas_string(), any()))
        .optional()
        .describe('Array of drivers associated with the opportunity'),
      vehicles: array(record(schemas_string(), any()))
        .optional()
        .describe('Array of vehicles associated with the opportunity')
    })
  )
  .handleInvocation(async r => {
    let u = new Client({
      token: r.auth.token,
      apiKey: r.auth.apiKey,
      apiSecret: r.auth.apiSecret
    });
    let m = await u.getOpportunity(r.input.opportunityId);
    let v;
    let b;
    if (r.input.includeDrivers) {
      let m = await u.getOpportunityDrivers(r.input.opportunityId);
      v = Array.isArray(m) ? m : (m.data ?? m.drivers ?? []);
    }
    if (r.input.includeVehicles) {
      let m = await u.getOpportunityVehicles(r.input.opportunityId);
      b = Array.isArray(m) ? m : (m.data ?? m.vehicles ?? []);
    }
    let x = [`Retrieved opportunity **${r.input.opportunityId}**`];
    if (v) x.push(`with **${v.length}** driver(s)`);
    if (b) x.push(`and **${b.length}** vehicle(s)`);
    return { output: { opportunity: m, drivers: v, vehicles: b }, message: x.join(' ') + '.' };
  })
  .build();
let bu = Ws.create(Ic, {
  name: 'Manage Opportunity',
  key: 'manage_opportunity',
  description: `Create, update, or delete a standalone opportunity in AgencyZoom. Set carrier, product line, premium, items, and property address details for an insurance opportunity.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    object({
      action: schemas_enum(['create', 'update', 'delete']).describe(
        'Action to perform on the opportunity'
      ),
      opportunityId: schemas_string()
        .optional()
        .describe('ID of the opportunity (required for "update" and "delete" actions)'),
      carrier: schemas_string().optional().describe('Carrier name or ID for the opportunity'),
      productLine: schemas_string()
        .optional()
        .describe('Product line name or ID (e.g. "Auto", "Home")'),
      premium: schemas_number().optional().describe('Premium amount in cents'),
      items: schemas_number().optional().describe('Number of items or units'),
      propertyAddress: object({
        street: schemas_string().optional().describe('Street address'),
        city: schemas_string().optional().describe('City name'),
        state: schemas_string().optional().describe('State abbreviation (e.g. "CA", "NY")'),
        zip: schemas_string().optional().describe('ZIP or postal code')
      })
        .optional()
        .describe('Property address details for the opportunity')
    })
  )
  .output(
    object({
      opportunity: record(schemas_string(), any())
        .optional()
        .describe('Opportunity data (for "create" and "update" actions)'),
      success: schemas_boolean()
        .optional()
        .describe('Whether the operation succeeded (for "delete" action)')
    })
  )
  .handleInvocation(async r => {
    let u = new Client({
      token: r.auth.token,
      apiKey: r.auth.apiKey,
      apiSecret: r.auth.apiSecret
    });
    switch (r.input.action) {
      case 'create': {
        let m = {};
        if (r.input.carrier !== undefined) m.carrier = r.input.carrier;
        if (r.input.productLine !== undefined) m.productLine = r.input.productLine;
        if (r.input.premium !== undefined) m.premium = r.input.premium;
        if (r.input.items !== undefined) m.items = r.input.items;
        if (r.input.propertyAddress !== undefined) m.propertyAddress = r.input.propertyAddress;
        let v = await u.createOpportunity(m);
        return {
          output: { opportunity: v },
          message: `Created opportunity${r.input.productLine ? ` for **${r.input.productLine}**` : ''}.`
        };
      }
      case 'update': {
        if (!r.input.opportunityId) {
          throw new Error('opportunityId is required for "update" action');
        }
        let m = {};
        if (r.input.carrier !== undefined) m.carrier = r.input.carrier;
        if (r.input.productLine !== undefined) m.productLine = r.input.productLine;
        if (r.input.premium !== undefined) m.premium = r.input.premium;
        if (r.input.items !== undefined) m.items = r.input.items;
        if (r.input.propertyAddress !== undefined) m.propertyAddress = r.input.propertyAddress;
        let v = await u.updateOpportunity(r.input.opportunityId, m);
        return {
          output: { opportunity: v },
          message: `Updated opportunity **${r.input.opportunityId}**.`
        };
      }
      case 'delete': {
        if (!r.input.opportunityId) {
          throw new Error('opportunityId is required for "delete" action');
        }
        await u.deleteOpportunity(r.input.opportunityId);
        return {
          output: { success: true },
          message: `Deleted opportunity **${r.input.opportunityId}**.`
        };
      }
    }
  })
  .build();
let yu = Ws.create(Ic, {
  name: 'Manage Opportunity Driver',
  key: 'manage_opportunity_driver',
  description: `Add, update, or remove a driver on an opportunity in AgencyZoom. Manage driver details such as name, birthday, gender, marital status, and license number for auto insurance opportunities.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    object({
      opportunityId: schemas_string().describe('ID of the opportunity the driver belongs to'),
      action: schemas_enum(['create', 'update', 'delete']).describe(
        'Action to perform on the driver'
      ),
      driverId: schemas_string()
        .optional()
        .describe('ID of the driver (required for "update" and "delete" actions)'),
      firstName: schemas_string().optional().describe('Driver first name'),
      lastName: schemas_string().optional().describe('Driver last name'),
      birthday: schemas_string()
        .optional()
        .describe('Driver date of birth (ISO date string, e.g. "1990-05-15")'),
      gender: schemas_string().optional().describe('Driver gender'),
      maritalStatus: schemas_string().optional().describe('Driver marital status'),
      licenseNumber: schemas_string().optional().describe('Driver license number')
    })
  )
  .output(
    object({
      driver: record(schemas_string(), any())
        .optional()
        .describe('Driver data (for "create" and "update" actions)'),
      success: schemas_boolean()
        .optional()
        .describe('Whether the operation succeeded (for "delete" action)')
    })
  )
  .handleInvocation(async r => {
    let u = new Client({
      token: r.auth.token,
      apiKey: r.auth.apiKey,
      apiSecret: r.auth.apiSecret
    });
    switch (r.input.action) {
      case 'create': {
        let m = {};
        if (r.input.firstName !== undefined) m.firstName = r.input.firstName;
        if (r.input.lastName !== undefined) m.lastName = r.input.lastName;
        if (r.input.birthday !== undefined) m.birthday = r.input.birthday;
        if (r.input.gender !== undefined) m.gender = r.input.gender;
        if (r.input.maritalStatus !== undefined) m.maritalStatus = r.input.maritalStatus;
        if (r.input.licenseNumber !== undefined) m.licenseNumber = r.input.licenseNumber;
        let v = await u.createOpportunityDriver(r.input.opportunityId, m);
        return {
          output: { driver: v },
          message: `Added driver${r.input.firstName ? ` **${r.input.firstName}${r.input.lastName ? ' ' + r.input.lastName : ''}**` : ''} to opportunity **${r.input.opportunityId}**.`
        };
      }
      case 'update': {
        if (!r.input.driverId) {
          throw new Error('driverId is required for "update" action');
        }
        let m = {};
        if (r.input.firstName !== undefined) m.firstName = r.input.firstName;
        if (r.input.lastName !== undefined) m.lastName = r.input.lastName;
        if (r.input.birthday !== undefined) m.birthday = r.input.birthday;
        if (r.input.gender !== undefined) m.gender = r.input.gender;
        if (r.input.maritalStatus !== undefined) m.maritalStatus = r.input.maritalStatus;
        if (r.input.licenseNumber !== undefined) m.licenseNumber = r.input.licenseNumber;
        let v = await u.updateOpportunityDriver(r.input.opportunityId, r.input.driverId, m);
        return {
          output: { driver: v },
          message: `Updated driver **${r.input.driverId}** on opportunity **${r.input.opportunityId}**.`
        };
      }
      case 'delete': {
        if (!r.input.driverId) {
          throw new Error('driverId is required for "delete" action');
        }
        await u.deleteOpportunityDriver(r.input.opportunityId, r.input.driverId);
        return {
          output: { success: true },
          message: `Removed driver **${r.input.driverId}** from opportunity **${r.input.opportunityId}**.`
        };
      }
    }
  })
  .build();
let xu = Ws.create(Ic, {
  name: 'Manage Opportunity Vehicle',
  key: 'manage_opportunity_vehicle',
  description: `Add, update, or remove a vehicle on an opportunity in AgencyZoom. Manage vehicle details such as VIN, make, model, year, and ownership type for auto insurance opportunities.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    object({
      opportunityId: schemas_string().describe('ID of the opportunity the vehicle belongs to'),
      action: schemas_enum(['create', 'update', 'delete']).describe(
        'Action to perform on the vehicle'
      ),
      vehicleId: schemas_string()
        .optional()
        .describe('ID of the vehicle (required for "update" and "delete" actions)'),
      vin: schemas_string().optional().describe('Vehicle Identification Number (VIN)'),
      make: schemas_string().optional().describe('Vehicle make (e.g. "Toyota", "Ford")'),
      model: schemas_string().optional().describe('Vehicle model (e.g. "Camry", "F-150")'),
      year: schemas_number().optional().describe('Vehicle model year (e.g. 2024)'),
      ownershipType: schemas_string()
        .optional()
        .describe('Vehicle ownership type (e.g. "owned", "leased", "financed")')
    })
  )
  .output(
    object({
      vehicle: record(schemas_string(), any())
        .optional()
        .describe('Vehicle data (for "create" and "update" actions)'),
      success: schemas_boolean()
        .optional()
        .describe('Whether the operation succeeded (for "delete" action)')
    })
  )
  .handleInvocation(async r => {
    let u = new Client({
      token: r.auth.token,
      apiKey: r.auth.apiKey,
      apiSecret: r.auth.apiSecret
    });
    switch (r.input.action) {
      case 'create': {
        let m = {};
        if (r.input.vin !== undefined) m.vin = r.input.vin;
        if (r.input.make !== undefined) m.make = r.input.make;
        if (r.input.model !== undefined) m.model = r.input.model;
        if (r.input.year !== undefined) m.year = r.input.year;
        if (r.input.ownershipType !== undefined) m.ownershipType = r.input.ownershipType;
        let v = await u.createOpportunityVehicle(r.input.opportunityId, m);
        return {
          output: { vehicle: v },
          message: `Added vehicle${r.input.make ? ` **${r.input.year ? r.input.year + ' ' : ''}${r.input.make}${r.input.model ? ' ' + r.input.model : ''}**` : ''} to opportunity **${r.input.opportunityId}**.`
        };
      }
      case 'update': {
        if (!r.input.vehicleId) {
          throw new Error('vehicleId is required for "update" action');
        }
        let m = {};
        if (r.input.vin !== undefined) m.vin = r.input.vin;
        if (r.input.make !== undefined) m.make = r.input.make;
        if (r.input.model !== undefined) m.model = r.input.model;
        if (r.input.year !== undefined) m.year = r.input.year;
        if (r.input.ownershipType !== undefined) m.ownershipType = r.input.ownershipType;
        let v = await u.updateOpportunityVehicle(r.input.opportunityId, r.input.vehicleId, m);
        return {
          output: { vehicle: v },
          message: `Updated vehicle **${r.input.vehicleId}** on opportunity **${r.input.opportunityId}**.`
        };
      }
      case 'delete': {
        if (!r.input.vehicleId) {
          throw new Error('vehicleId is required for "delete" action');
        }
        await u.deleteOpportunityVehicle(r.input.opportunityId, r.input.vehicleId);
        return {
          output: { success: true },
          message: `Removed vehicle **${r.input.vehicleId}** from opportunity **${r.input.opportunityId}**.`
        };
      }
    }
  })
  .build();
let _u = ic
  .create(Ic, {
    name: 'New Lead',
    key: 'new_lead',
    description:
      'Triggers when a new lead is created in AgencyZoom. Polls for recently created leads.'
  })
  .input(
    object({
      leadId: schemas_string().describe('Unique ID of the lead'),
      firstName: schemas_string().optional().describe('First name of the lead'),
      lastName: schemas_string().optional().describe('Last name of the lead'),
      email: schemas_string().optional().describe('Email address of the lead'),
      phone: schemas_string().optional().describe('Phone number of the lead'),
      status: schemas_string().optional().describe('Current status of the lead'),
      leadSource: schemas_string().optional().describe('Source of the lead'),
      producer: schemas_string().optional().describe('Assigned producer'),
      createdAt: schemas_string()
        .optional()
        .describe('ISO timestamp when the lead was created'),
      raw: any().optional().describe('Raw lead data from the API')
    })
  )
  .output(
    object({
      leadId: schemas_string().describe('Unique ID of the lead'),
      firstName: schemas_string().optional().describe('First name of the lead'),
      lastName: schemas_string().optional().describe('Last name of the lead'),
      email: schemas_string().optional().describe('Email address of the lead'),
      phone: schemas_string().optional().describe('Phone number of the lead'),
      status: schemas_string().optional().describe('Current status of the lead'),
      leadSource: schemas_string().optional().describe('Source of the lead'),
      producer: schemas_string().optional().describe('Assigned producer'),
      createdAt: schemas_string()
        .optional()
        .describe('ISO timestamp when the lead was created'),
      raw: any().optional().describe('Full lead data from the API')
    })
  )
  .polling({
    options: { intervalInSeconds: Gs },
    pollEvents: async r => {
      let u = new Client({
        token: r.auth.token,
        apiKey: r.auth.apiKey,
        apiSecret: r.auth.apiSecret
      });
      let m = r.state?.lastPolledAt || new Date(Date.now() - 24 * 60 * 60 * 1e3).toISOString();
      let v = await u.searchLeads({
        fromDate: m,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        limit: 100
      });
      let b = Array.isArray(v) ? v : v?.data || v?.leads || v?.items || [];
      let x = b.map(r => ({
        leadId: r.id || r.leadId || r._id || String(r),
        firstName: r.firstName,
        lastName: r.lastName,
        email: r.email,
        phone: r.phone,
        status: r.status,
        leadSource: r.leadSource?.name || r.leadSourceName || r.leadSource,
        producer: r.agent?.name || r.agentName || r.producer,
        createdAt: r.createdAt || r.dateCreated || r.created,
        raw: r
      }));
      return { inputs: x, updatedState: { lastPolledAt: new Date().toISOString() } };
    },
    handleEvent: async r => ({
      type: 'lead.created',
      id: r.input.leadId,
      output: {
        leadId: r.input.leadId,
        firstName: r.input.firstName,
        lastName: r.input.lastName,
        email: r.input.email,
        phone: r.input.phone,
        status: r.input.status,
        leadSource: r.input.leadSource,
        producer: r.input.producer,
        createdAt: r.input.createdAt,
        raw: r.input.raw
      }
    })
  })
  .build();
let wu = ic
  .create(Ic, {
    name: 'Service Ticket Updated',
    key: 'service_ticket_updated',
    description:
      'Triggers when a service ticket is created or updated in AgencyZoom. Polls for recently modified service tickets.'
  })
  .input(
    object({
      ticketId: schemas_string().describe('Unique ID of the service ticket'),
      customerId: schemas_string().optional().describe('ID of the associated customer'),
      csrId: schemas_string().optional().describe('ID of the assigned CSR'),
      category: schemas_string().optional().describe('Service ticket category'),
      priority: schemas_string().optional().describe('Service ticket priority'),
      status: schemas_string().optional().describe('Current status of the ticket'),
      resolution: schemas_string().optional().describe('Resolution of the ticket'),
      createdAt: schemas_string()
        .optional()
        .describe('ISO timestamp when the ticket was created'),
      updatedAt: schemas_string()
        .optional()
        .describe('ISO timestamp when the ticket was last updated'),
      raw: any().optional().describe('Raw ticket data from the API')
    })
  )
  .output(
    object({
      ticketId: schemas_string().describe('Unique ID of the service ticket'),
      customerId: schemas_string().optional().describe('ID of the associated customer'),
      csrId: schemas_string().optional().describe('ID of the assigned CSR'),
      category: schemas_string().optional().describe('Service ticket category'),
      priority: schemas_string().optional().describe('Service ticket priority'),
      status: schemas_string().optional().describe('Current status of the ticket'),
      resolution: schemas_string().optional().describe('Resolution of the ticket'),
      createdAt: schemas_string()
        .optional()
        .describe('ISO timestamp when the ticket was created'),
      updatedAt: schemas_string()
        .optional()
        .describe('ISO timestamp when the ticket was last updated'),
      raw: any().optional().describe('Full ticket data from the API')
    })
  )
  .polling({
    options: { intervalInSeconds: Gs },
    pollEvents: async r => {
      let u = new Client({
        token: r.auth.token,
        apiKey: r.auth.apiKey,
        apiSecret: r.auth.apiSecret
      });
      let m = r.state?.lastPolledAt || new Date(Date.now() - 24 * 60 * 60 * 1e3).toISOString();
      let v = await u.searchServiceTickets({
        fromDate: m,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
        limit: 100
      });
      let b = Array.isArray(v) ? v : v?.data || v?.tickets || v?.items || [];
      let x = b.map(r => ({
        ticketId: r.id || r.ticketId || r._id || String(r),
        customerId: r.customerId || r.customer?.id,
        csrId: r.csrId || r.csr?.id,
        category: r.category?.name || r.categoryName || r.category,
        priority: r.priority?.name || r.priorityName || r.priority,
        status: r.status,
        resolution: r.resolution?.name || r.resolutionName || r.resolution,
        createdAt: r.createdAt || r.dateCreated || r.created,
        updatedAt: r.updatedAt || r.dateModified || r.modified,
        raw: r
      }));
      return { inputs: x, updatedState: { lastPolledAt: new Date().toISOString() } };
    },
    handleEvent: async r => {
      let u = !r.input.updatedAt || r.input.createdAt === r.input.updatedAt;
      let m = u ? 'service_ticket.created' : 'service_ticket.updated';
      return {
        type: m,
        id: `${r.input.ticketId}-${r.input.updatedAt || r.input.createdAt || Date.now()}`,
        output: {
          ticketId: r.input.ticketId,
          customerId: r.input.customerId,
          csrId: r.input.csrId,
          category: r.input.category,
          priority: r.input.priority,
          status: r.input.status,
          resolution: r.input.resolution,
          createdAt: r.input.createdAt,
          updatedAt: r.input.updatedAt,
          raw: r.input.raw
        }
      };
    }
  })
  .build();
let $u = ic
  .create(Ic, {
    name: 'Inbound Webhook',
    key: 'inbound_webhook',
    description:
      'Receives HTTP POST at the Slates webhook URL. Parses JSON into payload (or stores raw body if not JSON). Configure your provider to POST here when supported.'
  })
  .input(
    object({
      payload: record(schemas_string(), any()).describe(
        'Parsed JSON object from the request body'
      ),
      rawBody: schemas_string().optional().describe('Raw body when JSON parsing failed'),
      contentType: schemas_string().optional().describe('Content-Type header')
    })
  )
  .output(
    object({ payload: record(schemas_string(), any()), rawBody: schemas_string().optional() })
  )
  .webhook({
    handleRequest: async r => {
      let u = r.request.headers.get('content-type') ?? '';
      let m = await r.request.text();
      if (!m || !m.trim()) {
        return { inputs: [{ payload: {}, contentType: u }] };
      }
      try {
        let r = JSON.parse(m);
        let v = r !== null && typeof r === 'object' && !Array.isArray(r) ? r : { _value: r };
        return { inputs: [{ payload: v, contentType: u }] };
      } catch {
        return { inputs: [{ payload: {}, rawBody: m, contentType: u }] };
      }
    },
    handleEvent: async r => ({
      type: 'webhook.inbound',
      id: `inbound-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      output: { payload: r.input.payload, rawBody: r.input.rawBody }
    })
  })
  .build();
let ku = _c.create({
  spec: Ic,
  tools: [
    eu,
    tu,
    nu,
    iu,
    au,
    ou,
    su,
    cu,
    Bc,
    Vc,
    Mc,
    Jc,
    Kc,
    Wc,
    uu,
    lu,
    pu,
    du,
    mu,
    fu,
    gu,
    vu,
    bu,
    yu,
    xu,
    Gc,
    Hc,
    Xc,
    Yc,
    Qc
  ],
  triggers: [$u, _u, wu]
});
var Su = v.M;
export { Su as provider };
//# sourceMappingURL=index.js.map
