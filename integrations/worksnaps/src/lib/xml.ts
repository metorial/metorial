/**
 * Lightweight XML parser and builder for the Worksnaps API.
 * Worksnaps returns XML responses and expects XML request bodies.
 */

export type XmlObject = {
  [key: string]: string | number | boolean | null | undefined | XmlObject | XmlObject[];
};

/**
 * Parse a simple XML string into a JavaScript object.
 * Handles nested elements and arrays of sibling elements with the same tag name.
 */
export let parseXml = (xml: string): XmlObject => {
  let cleaned = xml.replace(/<\?xml[^?]*\?>/g, '').trim();
  return parseElement(cleaned).value as XmlObject;
};

/**
 * Parse a list of XML elements wrapped in a root element.
 * Returns an array of parsed objects for the specified child tag.
 */
export let parseXmlList = (xml: string, childTag: string): XmlObject[] => {
  let parsed = parseXml(xml);
  let root = Object.values(parsed)[0];
  if (!root || typeof root !== 'object') return [];
  if (Array.isArray(root)) return root;

  let rootObj = root as XmlObject;
  let children = rootObj[childTag];
  if (!children) return [];
  if (Array.isArray(children)) return children as XmlObject[];
  return [children as XmlObject];
};

/**
 * Build an XML string from a JavaScript object.
 */
export let buildXml = (rootTag: string, obj: XmlObject): string => {
  return `<${rootTag}>${objectToXml(obj)}</${rootTag}>`;
};

let objectToXml = (obj: XmlObject): string => {
  let parts: string[] = [];
  for (let [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'object' && !Array.isArray(value)) {
      parts.push(`<${key}>${objectToXml(value as XmlObject)}</${key}>`);
    } else if (Array.isArray(value)) {
      for (let item of value) {
        parts.push(`<${key}>${objectToXml(item)}</${key}>`);
      }
    } else {
      parts.push(`<${key}>${escapeXml(String(value))}</${key}>`);
    }
  }
  return parts.join('');
};

let escapeXml = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

let unescapeXml = (str: string): string => {
  return str
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
};

interface ParseResult {
  value: string | XmlObject;
  rest: string;
}

let parseElement = (xml: string): ParseResult => {
  let trimmed = xml.trim();

  // Match opening tag
  let openMatch = trimmed.match(/^<([a-zA-Z0-9_-]+)([^>]*)>/);
  if (!openMatch) {
    return { value: trimmed, rest: '' };
  }

  let tagName = openMatch[1]!;
  let attrs = openMatch[2]!;
  let afterOpen = trimmed.slice(openMatch[0].length);

  // Check for nil attribute
  if (attrs.includes('nil="true"') || attrs.includes("nil='true'")) {
    let closeTag = `</${tagName}>`;
    let closeIdx = afterOpen.indexOf(closeTag);
    let rest = closeIdx >= 0 ? afterOpen.slice(closeIdx + closeTag.length) : afterOpen;
    return { value: { [tagName]: '' }, rest };
  }

  // Check for self-closing tag
  if (attrs.trimEnd().endsWith('/') || trimmed.match(new RegExp(`^<${tagName}[^>]*/>`))) {
    let selfCloseMatch = trimmed.match(new RegExp(`^<${tagName}[^>]*/>`));
    if (selfCloseMatch) {
      return { value: { [tagName]: '' }, rest: trimmed.slice(selfCloseMatch[0].length) };
    }
  }

  // Find the matching closing tag - handle nested same-name tags
  let closeTag = `</${tagName}>`;
  let depth = 1;
  let pos = 0;
  let content = afterOpen;

  while (depth > 0 && pos < content.length) {
    let nextOpen = content.indexOf(`<${tagName}`, pos);
    let nextClose = content.indexOf(closeTag, pos);

    if (nextClose === -1) break;

    if (nextOpen !== -1 && nextOpen < nextClose) {
      // Check it's actually an opening tag (not a different tag that starts with same name)
      let charAfterName = content[nextOpen + tagName.length + 1];
      if (charAfterName === '>' || charAfterName === ' ' || charAfterName === '/') {
        depth++;
      }
      pos = nextOpen + 1;
    } else {
      depth--;
      if (depth === 0) {
        let innerContent = content.slice(0, nextClose).trim();
        let rest = content.slice(nextClose + closeTag.length);

        // Check if inner content has child elements
        if (innerContent.startsWith('<')) {
          let children = parseChildren(innerContent);
          return { value: { [tagName]: children }, rest };
        } else {
          return { value: { [tagName]: unescapeXml(innerContent) }, rest };
        }
      }
      pos = nextClose + 1;
    }
  }

  return { value: { [tagName]: afterOpen }, rest: '' };
};

let parseChildren = (xml: string): XmlObject => {
  let result: XmlObject = {};
  let remaining = xml.trim();

  while (remaining.length > 0) {
    remaining = remaining.trim();
    if (!remaining.startsWith('<') || remaining.startsWith('</')) break;

    let parsed = parseElement(remaining);
    let obj = parsed.value as XmlObject;

    for (let [key, value] of Object.entries(obj)) {
      if (key in result) {
        let existing = result[key];
        if (Array.isArray(existing)) {
          (existing as XmlObject[]).push(value as XmlObject);
        } else {
          result[key] = [existing as XmlObject, value as XmlObject];
        }
      } else {
        result[key] = value;
      }
    }

    remaining = parsed.rest.trim();
  }

  return result;
};

/**
 * Convert XML-style hyphenated keys to camelCase.
 */
export let toCamelCase = (str: string): string => {
  return str.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
};

/**
 * Convert camelCase keys to XML-style hyphenated keys.
 */
export let toHyphenated = (str: string): string => {
  return str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
};

/**
 * Recursively convert all keys in an object from hyphenated to camelCase.
 */
export let camelizeKeys = (obj: unknown): unknown => {
  if (Array.isArray(obj)) {
    return obj.map(camelizeKeys);
  }
  if (obj !== null && typeof obj === 'object') {
    let result: Record<string, unknown> = {};
    for (let [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[toCamelCase(key)] = camelizeKeys(value);
    }
    return result;
  }
  return obj;
};

/**
 * Recursively convert all keys in an object from camelCase to hyphenated.
 */
export let hyphenateKeys = (obj: unknown): unknown => {
  if (Array.isArray(obj)) {
    return obj.map(hyphenateKeys);
  }
  if (obj !== null && typeof obj === 'object') {
    let result: Record<string, unknown> = {};
    for (let [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[toHyphenated(key)] = hyphenateKeys(value);
    }
    return result;
  }
  return obj;
};
