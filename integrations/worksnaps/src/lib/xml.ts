import { createApiServiceError } from 'slates';

export type XmlValue = string | number | boolean | null | undefined | XmlObject | XmlValue[];
export type XmlObject = { [key: string]: XmlValue };

export let isXmlObject = (value: unknown): value is XmlObject =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

let invalidXml = () => createApiServiceError('Worksnaps returned an invalid XML response.');

export let parseXml = (xml: string): XmlObject => {
  let cleaned = xml.replace(/^\s*<\?xml[^?]*\?>/, '').trim();
  let parsed = parseElement(cleaned);
  if (parsed.rest.trim()) throw invalidXml();
  return parsed.value;
};

export let parseXmlObject = (xml: string, tag: string): XmlObject => {
  let parsed = parseXml(xml);
  let container = isXmlObject(parsed.reply) ? parsed.reply : parsed;
  let value = container[tag] ?? container[tag.replace(/_/g, '-')];
  if (!isXmlObject(value)) throw invalidXml();
  return value;
};

export let parseXmlList = (xml: string, childTag: string): XmlObject[] => {
  let parsed = parseXml(xml);
  let root = Object.values(parsed)[0];
  if (root === '' || root === null) return [];
  if (!isXmlObject(root)) throw invalidXml();
  let children = root[childTag] ?? root[childTag.replace(/_/g, '-')];
  if (children === undefined) return [];
  let items = Array.isArray(children) ? children : [children];
  if (!items.every(isXmlObject)) throw invalidXml();
  return items;
};

export let buildXml = (rootTag: string, obj: XmlObject): string =>
  `<${rootTag}>${objectToXml(obj)}</${rootTag}>`;

let objectToXml = (obj: XmlObject): string => {
  let parts: string[] = [];
  for (let [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    let values = Array.isArray(value) ? value : [value];
    for (let item of values) {
      if (item === undefined || item === null) continue;
      let content = isXmlObject(item) ? objectToXml(item) : escapeXml(String(item));
      parts.push(`<${key}>${content}</${key}>`);
    }
  }
  return parts.join('');
};

let escapeXml = (str: string): string =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

let unescapeXml = (str: string): string =>
  str.replace(/&(#x[0-9a-f]+|#\d+|apos|quot|gt|lt|amp);/gi, (entity, code: string) => {
    if (code.startsWith('#')) {
      let value =
        code[1]?.toLowerCase() === 'x'
          ? Number.parseInt(code.slice(2), 16)
          : Number(code.slice(1));
      if (value < 0 || value > 0x10ffff || (value >= 0xd800 && value <= 0xdfff)) {
        throw invalidXml();
      }
      return String.fromCodePoint(value);
    }
    return (
      ({ apos: "'", quot: '"', gt: '>', lt: '<', amp: '&' } as Record<string, string>)[code] ??
      entity
    );
  });

interface ParseResult {
  value: XmlObject;
  rest: string;
}

let parseElement = (xml: string): ParseResult => {
  let trimmed = xml.trimStart();
  let open = trimmed.match(/^<([A-Za-z_][\w:.-]*)(\s+(?:[^>"']|"[^"]*"|'[^']*')*)?\s*(\/?)>/);
  if (!open) throw invalidXml();
  let tag = open[1]!;
  let attributes = open[2] ?? '';
  let nil = /\bnil\s*=\s*['"]true['"]/.test(attributes);
  let remaining = trimmed.slice(open[0].length);
  if (open[3] === '/' || attributes.trimEnd().endsWith('/')) {
    return { value: { [tag]: nil ? null : '' }, rest: remaining };
  }

  let children: XmlObject = {};
  let text = '';
  let hasChildren = false;
  while (remaining.length) {
    if (remaining.startsWith(`</${tag}>`)) {
      if (hasChildren && text.trim()) throw invalidXml();
      return {
        value: { [tag]: nil ? null : hasChildren ? children : text.trim() },
        rest: remaining.slice(tag.length + 3)
      };
    }
    if (remaining.startsWith('<!--')) {
      let end = remaining.indexOf('-->');
      if (end < 0) throw invalidXml();
      remaining = remaining.slice(end + 3);
      continue;
    }
    if (remaining.startsWith('<![CDATA[')) {
      let end = remaining.indexOf(']]>');
      if (end < 0) throw invalidXml();
      text += remaining.slice(9, end);
      remaining = remaining.slice(end + 3);
      continue;
    }
    if (remaining.startsWith('<')) {
      let parsed = parseElement(remaining);
      for (let [key, value] of Object.entries(parsed.value)) {
        if (Object.hasOwn(children, key)) {
          let existing = children[key];
          children[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
        } else {
          children[key] = value;
        }
      }
      hasChildren = true;
      remaining = parsed.rest;
    } else {
      let end = remaining.indexOf('<');
      if (end < 0) throw invalidXml();
      text += unescapeXml(remaining.slice(0, end));
      remaining = remaining.slice(end);
    }
  }
  throw invalidXml();
};

export let camelizeKeys = (obj: unknown): unknown => {
  if (Array.isArray(obj)) return obj.map(camelizeKeys);
  if (isXmlObject(obj)) {
    let result: Record<string, unknown> = {};
    for (let [key, value] of Object.entries(obj)) {
      result[key.replace(/[-_]([a-z])/g, (_, letter: string) => letter.toUpperCase())] =
        camelizeKeys(value);
    }
    return result;
  }
  return obj;
};

export let snakeCaseKeys = (obj: unknown): unknown => {
  if (Array.isArray(obj)) return obj.map(snakeCaseKeys);
  if (isXmlObject(obj)) {
    let result: Record<string, unknown> = {};
    for (let [key, value] of Object.entries(obj)) {
      result[key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)] =
        snakeCaseKeys(value);
    }
    return result;
  }
  return obj;
};
