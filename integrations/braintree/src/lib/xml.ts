/**
 * Minimal XML parser for Braintree REST API responses.
 * Braintree returns simple, well-structured XML that doesn't need a full XML parser.
 */

export let parseXml = (xml: string): Record<string, any> => {
  // Remove XML declaration
  xml = xml.replace(/<\?xml[^?]*\?>\s*/g, '').trim();
  return parseElement(xml);
};

let parseElement = (xml: string): any => {
  xml = xml.trim();
  if (!xml) return '';

  // Check if this is a single root element
  let rootMatch = xml.match(/^<([a-zA-Z0-9_-]+)([^>]*)>([\s\S]*)<\/\1>$/);
  if (!rootMatch) {
    // It's a text node
    return decodeXmlEntities(xml);
  }

  let tagName = rootMatch[1] as string;
  let attrs = rootMatch[2] || '';
  let contentStr = (rootMatch[3] || '').trim();
  let isArray = attrs.includes('type="array"');

  if (attrs.includes('nil="true"')) {
    return null;
  }

  // Check if content has child elements
  let children = extractChildren(contentStr);

  if (children.length === 0) {
    // Text content
    let boolType = attrs.includes('type="boolean"');
    let intType = attrs.includes('type="integer"');
    if (boolType) return contentStr === 'true';
    if (intType) return Number.parseInt(contentStr, 10);
    return decodeXmlEntities(contentStr);
  }

  if (isArray) {
    // Array type - collect child elements
    let arr: any[] = [];
    for (let child of children) {
      let childMatch = child.match(/^<([a-zA-Z0-9_-]+)([^>]*)>([\s\S]*)<\/\1>$/);
      if (childMatch) {
        arr.push(parseElement(child));
      }
    }
    return { [tagName]: arr };
  }

  // Object type - build result
  let result: Record<string, any> = {};
  for (let child of children) {
    let childMatch = child.match(/^<([a-zA-Z0-9_-]+)([^>]*)\s*\/?>(?:([\s\S]*)<\/\1>)?$/);
    if (childMatch) {
      let childTag = childMatch[1] as string;
      let childAttrs = childMatch[2] || '';
      let childContent = childMatch[3];
      let key = camelCase(childTag);
      if (childAttrs.includes('nil="true"')) {
        result[key] = null;
      } else if (childContent === undefined) {
        result[key] = null;
      } else {
        let parsed = parseElement(child);
        if (typeof parsed === 'object' && parsed !== null && childTag in parsed) {
          result[key] = parsed[childTag];
        } else {
          result[key] = parsed;
        }
      }
    }
  }

  return { [camelCase(tagName)]: result };
};

let extractChildren = (content: string): string[] => {
  let children: string[] = [];
  let remaining = content.trim();
  let depth = 0;
  let currentTag = '';
  let start = 0;

  while (remaining.length > 0) {
    // Find the next tag
    let tagStart = remaining.indexOf('<', depth === 0 ? 0 : start);
    if (tagStart === -1) break;

    if (depth === 0) {
      // Check for self-closing tag
      let selfClose = remaining.slice(tagStart).match(/^<([a-zA-Z0-9_-]+)([^>]*)\s*\/>/);
      if (selfClose) {
        children.push(selfClose[0]);
        remaining = remaining.slice(tagStart + selfClose[0].length).trim();
        continue;
      }

      let openTag = remaining.slice(tagStart).match(/^<([a-zA-Z0-9_-]+)/);
      if (openTag) {
        currentTag = openTag[1] as string;
        start = tagStart;
        depth = 1;

        // Look for closing tag
        let searchFrom = tagStart + openTag[0].length;
        while (depth > 0 && searchFrom < remaining.length) {
          let nextOpen = remaining.indexOf(`<${currentTag}`, searchFrom);
          let nextClose = remaining.indexOf(`</${currentTag}>`, searchFrom);

          if (nextClose === -1) break;

          if (nextOpen !== -1 && nextOpen < nextClose) {
            // Check it's actually an opening tag (not a substring match)
            let afterTag = remaining[nextOpen + currentTag.length + 1];
            if (afterTag === ' ' || afterTag === '>' || afterTag === '/') {
              depth++;
            }
            searchFrom = nextOpen + currentTag.length + 2;
          } else {
            depth--;
            if (depth === 0) {
              let end = nextClose + `</${currentTag}>`.length;
              children.push(remaining.slice(start, end));
              remaining = remaining.slice(end).trim();
            } else {
              searchFrom = nextClose + `</${currentTag}>`.length;
            }
          }
        }

        if (depth > 0) {
          // Unbalanced tag, skip it
          remaining = remaining.slice(tagStart + 1);
          depth = 0;
        }
      } else {
        remaining = remaining.slice(tagStart + 1);
      }
    }
  }

  return children;
};

let decodeXmlEntities = (str: string): string => {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
};

let camelCase = (str: string): string => {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
};

export let buildXml = (rootTag: string, data: Record<string, any>): string => {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>`;
  xml += objectToXml(rootTag, data);
  return xml;
};

let objectToXml = (tag: string, value: any): string => {
  let xmlTag = kebabCase(tag);
  if (value === null || value === undefined) {
    return `<${xmlTag} nil="true"></${xmlTag}>`;
  }
  if (typeof value === 'boolean') {
    return `<${xmlTag} type="boolean">${value}</${xmlTag}>`;
  }
  if (typeof value === 'number') {
    return `<${xmlTag}>${value}</${xmlTag}>`;
  }
  if (typeof value === 'string') {
    return `<${xmlTag}>${escapeXml(value)}</${xmlTag}>`;
  }
  if (Array.isArray(value)) {
    let items = value
      .map(item => {
        if (typeof item === 'object' && item !== null) {
          return `<item>${Object.entries(item)
            .map(([k, v]) => objectToXml(k, v))
            .join('')}</item>`;
        }
        return `<item>${escapeXml(String(item))}</item>`;
      })
      .join('');
    return `<${xmlTag} type="array">${items}</${xmlTag}>`;
  }
  if (typeof value === 'object') {
    let inner = Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => objectToXml(k, v))
      .join('');
    return `<${xmlTag}>${inner}</${xmlTag}>`;
  }
  return `<${xmlTag}>${escapeXml(String(value))}</${xmlTag}>`;
};

let escapeXml = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

let kebabCase = (str: string): string => {
  return str.replace(/([A-Z])/g, (_, c) => `-${c.toLowerCase()}`);
};
