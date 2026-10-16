import { createApiServiceError } from 'slates';

export interface XmlNode {
  tag: string;
  attributes: Record<string, string>;
  children: XmlNode[];
  text: string;
}

let invalidXml = (): never => {
  throw createApiServiceError('CodeREADr returned malformed XML.', {
    reason: 'invalid_provider_response'
  });
};

let decodeXml = (text: string): string =>
  text.replace(/&([^;\s<&]+);|&/g, (_entity, name: string | undefined) => {
    let named: Record<string, string> = {
      amp: '&',
      lt: '<',
      gt: '>',
      quot: '"',
      apos: "'"
    };
    if (name && Object.hasOwn(named, name)) return named[name]!;
    if (name && /^#(?:[0-9]+|x[0-9a-f]+)$/i.test(name)) {
      let code =
        name[1]?.toLowerCase() === 'x'
          ? Number.parseInt(name.slice(2), 16)
          : Number.parseInt(name.slice(1), 10);
      if (
        code === 9 ||
        code === 10 ||
        code === 13 ||
        (code >= 32 && code <= 0xd7ff) ||
        (code >= 0xe000 && code <= 0xfffd) ||
        (code >= 0x10000 && code <= 0x10ffff)
      )
        return String.fromCodePoint(code);
    }
    return invalidXml();
  });

// The provider returns XML, including CDATA responses and empty relationship nodes.
// External entities and document types are never needed by this API.
export let parseXml = (value: unknown): XmlNode => {
  if (typeof value !== 'string') return invalidXml();
  let xml = value.replace(/^\uFEFF/, '').trim();
  let pos = 0;
  let skipMisc = () => {
    while (true) {
      while (/\s/.test(xml[pos] ?? '') && pos < xml.length) pos++;
      if (xml.startsWith('<?xml', pos)) {
        let end = xml.indexOf('?>', pos);
        if (end === -1) return invalidXml();
        pos = end + 2;
      } else if (xml.startsWith('<!--', pos)) {
        let end = xml.indexOf('-->', pos);
        if (end === -1) return invalidXml();
        pos = end + 3;
      } else return;
    }
  };
  let parseNode = (depth: number): XmlNode => {
    if (depth > 256 || xml[pos] !== '<') return invalidXml();
    let start = ++pos;
    let quote: string | undefined;
    while (pos < xml.length) {
      let char = xml[pos]!;
      if (quote) {
        if (char === quote) quote = undefined;
      } else if (char === '"' || char === "'") quote = char;
      else if (char === '>') break;
      pos++;
    }
    if (pos === xml.length || quote) return invalidXml();
    let opening = xml.slice(start, pos++);
    let selfClosing = /\/\s*$/.test(opening);
    if (selfClosing) opening = opening.replace(/\/\s*$/, '');
    let match = /^([A-Za-z_][\w:.-]*)([\s\S]*)$/.exec(opening);
    if (!match) return invalidXml();
    let tag = match[1]!;
    let attributes: Record<string, string> = Object.create(null);
    let remaining = match[2]!;
    while (remaining.trim()) {
      let attr = /^\s+([A-Za-z_][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/.exec(remaining);
      if (!attr || Object.hasOwn(attributes, attr[1]!)) return invalidXml();
      attributes[attr[1]!] = decodeXml(attr[2] ?? attr[3]!);
      remaining = remaining.slice(attr[0].length);
    }
    let node: XmlNode = { tag, attributes, children: [], text: '' };
    if (selfClosing) return node;
    let parts: string[] = [];
    while (pos < xml.length) {
      if (xml.startsWith(`</${tag}`, pos)) {
        let closing = /^<\/([A-Za-z_][\w:.-]*)\s*>/.exec(xml.slice(pos));
        if (!closing || closing[1] !== tag) return invalidXml();
        pos += closing[0].length;
        node.text = parts.join('');
        return node;
      }
      if (xml.startsWith('<!--', pos)) {
        let end = xml.indexOf('-->', pos);
        if (end === -1) return invalidXml();
        pos = end + 3;
      } else if (xml.startsWith('<![CDATA[', pos)) {
        let end = xml.indexOf(']]>', pos + 9);
        if (end === -1) return invalidXml();
        parts.push(xml.slice(pos + 9, end));
        pos = end + 3;
      } else if (xml[pos] === '<') {
        node.children.push(parseNode(depth + 1));
      } else {
        let end = xml.indexOf('<', pos);
        if (end === -1) return invalidXml();
        parts.push(decodeXml(xml.slice(pos, end)));
        pos = end;
      }
    }
    return invalidXml();
  };
  skipMisc();
  let node = parseNode(0);
  skipMisc();
  if (pos !== xml.length) return invalidXml();
  return node;
};

export let findChild = (node: XmlNode, tag: string): XmlNode | undefined =>
  node.children.find(c => c.tag === tag);

export let findChildren = (node: XmlNode, tag: string): XmlNode[] =>
  node.children.filter(c => c.tag === tag);

export let getChildText = (node: XmlNode, tag: string): string => {
  let child = findChild(node, tag);
  if (!child?.text.trim()) {
    throw createApiServiceError(`CodeREADr returned a response without a valid ${tag}.`, {
      reason: 'invalid_provider_response'
    });
  }
  return child.text;
};

export let getAttribute = (node: XmlNode, name: string): string => {
  let value = node.attributes[name];
  if (value === undefined || !value.trim()) {
    throw createApiServiceError(`CodeREADr returned a ${node.tag} without a valid ${name}.`, {
      reason: 'invalid_provider_response'
    });
  }
  return value;
};

export let nodeToObject = (node: XmlNode): unknown => {
  let obj: Record<string, unknown> = Object.assign(Object.create(null), node.attributes);
  if (node.children.length === 0) return node.text || obj;
  let groups: Record<string, XmlNode[]> = Object.create(null);
  for (let child of node.children) (groups[child.tag] ??= []).push(child);
  for (let [tag, children] of Object.entries(groups)) {
    if (children.length === 1) {
      let child = children[0]!;
      obj[tag] =
        child.children.length === 0 && Object.keys(child.attributes).length === 0
          ? child.text
          : nodeToObject(child);
    } else obj[tag] = children.map(nodeToObject);
  }
  return obj;
};
