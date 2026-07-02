/**
 * Convert a Unicode domain name to Punycode.
 * For example: "München.de" -> "xn--mnchen-3ya.de"
 */
let isAscii = (value: string): boolean => {
  for (let i = 0; i < value.length; i++) {
    if (value.charCodeAt(i) > 0x7f) return false;
  }
  return true;
};

export let toPunycode = (domain: string): string => {
  let parts = domain.split('.');
  let encoded = parts.map(label => {
    if (isAscii(label)) {
      return label;
    }
    return `xn--${punycodeEncode(label)}`;
  });
  return encoded.join('.');
};

/**
 * Convert a Punycode domain name back to Unicode.
 * For example: "xn--mnchen-3ya.de" -> "münchen.de"
 */
export let fromPunycode = (domain: string): string => {
  let parts = domain.split('.');
  let decoded = parts.map(label => {
    if (label.startsWith('xn--')) {
      return punycodeDecode(label.slice(4));
    }
    return label;
  });
  return decoded.join('.');
};

/**
 * Extract the domain name from a full URL.
 * For example: "https://www.example.com/path?q=1" -> "www.example.com"
 */
export let extractDomain = (url: string): string => {
  let cleaned = url.trim();

  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(cleaned)) {
    cleaned = `https://${cleaned}`;
  }

  try {
    let parsed = new URL(cleaned);
    return parsed.hostname;
  } catch {
    let match = cleaned.match(/^(?:https?:\/\/)?([^/\s:?#]+)/i);
    return match ? (match[1] ?? cleaned) : cleaned;
  }
};

/**
 * Extract the domain extension (TLD/ccTLD) from a domain name or URL.
 * For example: "www.example.co.uk" -> "co.uk"
 */
export let extractExtension = (input: string): string => {
  let domain = extractDomain(input);

  // Remove trailing dots
  domain = domain.replace(/\.+$/, '');

  let parts = domain.split('.');

  if (parts.length <= 1) {
    return '';
  }

  // Common second-level TLDs that form compound extensions
  let secondLevelTlds = new Set([
    'co',
    'com',
    'net',
    'org',
    'edu',
    'gov',
    'mil',
    'ac',
    'or',
    'ne',
    'go',
    'gob',
    'nic',
    'web',
    'gen',
    'info',
    'biz',
    'nom',
    'int'
  ]);

  let lastPart = parts[parts.length - 1] as string;

  if (parts.length >= 3) {
    let secondToLast = parts[parts.length - 2] as string;
    if (secondLevelTlds.has(secondToLast) && lastPart.length <= 3) {
      return `${secondToLast}.${lastPart}`;
    }
  }

  return lastPart;
};

// Punycode encoding/decoding constants
let BASE = 36;
let TMIN = 1;
let TMAX = 26;
let SKEW = 38;
let DAMP = 700;
let INITIAL_BIAS = 72;
let INITIAL_N = 128;
let DELIMITER = '-';

let adapt = (delta: number, numPoints: number, firstTime: boolean): number => {
  delta = firstTime ? Math.floor(delta / DAMP) : Math.floor(delta / 2);
  delta += Math.floor(delta / numPoints);
  let k = 0;
  while (delta > ((BASE - TMIN) * TMAX) / 2) {
    delta = Math.floor(delta / (BASE - TMIN));
    k += BASE;
  }
  return k + Math.floor(((BASE - TMIN + 1) * delta) / (delta + SKEW));
};

let digitToBasic = (digit: number): number => {
  return digit + 22 + 75 * (digit < 26 ? 1 : 0);
};

let basicToDigit = (codePoint: number): number => {
  if (codePoint - 48 < 10) return codePoint - 22;
  if (codePoint - 65 < 26) return codePoint - 65;
  if (codePoint - 97 < 26) return codePoint - 97;
  return BASE;
};

let punycodeEncode = (input: string): string => {
  let output: string[] = [];
  let inputArray = Array.from(input);
  let n = INITIAL_N;
  let delta = 0;
  let bias = INITIAL_BIAS;

  // Handle basic code points
  let basicChars: string[] = [];
  for (let char of inputArray) {
    if (char.codePointAt(0)! < 128) {
      basicChars.push(char);
    }
  }
  output.push(...basicChars);
  let h = basicChars.length;
  let b = h;

  if (b > 0) {
    output.push(DELIMITER);
  }

  while (h < inputArray.length) {
    let m = Number.POSITIVE_INFINITY;
    for (let char of inputArray) {
      let cp = char.codePointAt(0)!;
      if (cp >= n && cp < m) {
        m = cp;
      }
    }

    delta += (m - n) * (h + 1);
    n = m;

    for (let char of inputArray) {
      let cp = char.codePointAt(0)!;
      if (cp < n) {
        delta++;
      }
      if (cp === n) {
        let q = delta;
        for (let k = BASE; ; k += BASE) {
          let t = k <= bias ? TMIN : k >= bias + TMAX ? TMAX : k - bias;
          if (q < t) break;
          output.push(String.fromCharCode(digitToBasic(t + ((q - t) % (BASE - t)))));
          q = Math.floor((q - t) / (BASE - t));
        }
        output.push(String.fromCharCode(digitToBasic(q)));
        bias = adapt(delta, h + 1, h === b);
        delta = 0;
        h++;
      }
    }

    delta++;
    n++;
  }

  return output.join('');
};

let punycodeDecode = (input: string): string => {
  let output: number[] = [];
  let i = 0;
  let n = INITIAL_N;
  let bias = INITIAL_BIAS;

  let basic = input.lastIndexOf(DELIMITER);
  if (basic < 0) basic = 0;

  for (let j = 0; j < basic; j++) {
    output.push(input.charCodeAt(j));
  }

  let index = basic > 0 ? basic + 1 : 0;

  while (index < input.length) {
    let oldi = i;
    let w = 1;
    for (let k = BASE; ; k += BASE) {
      if (index >= input.length) break;
      let digit = basicToDigit(input.charCodeAt(index++));
      i += digit * w;
      let t = k <= bias ? TMIN : k >= bias + TMAX ? TMAX : k - bias;
      if (digit < t) break;
      w *= BASE - t;
    }
    bias = adapt(i - oldi, output.length + 1, oldi === 0);
    n += Math.floor(i / (output.length + 1));
    i %= output.length + 1;
    output.splice(i, 0, n);
    i++;
  }

  return String.fromCodePoint(...output);
};
