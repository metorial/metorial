/**
 * Lightweight XML parser for CodeREADr API responses.
 * The API returns simple XML structures; this parser handles the expected formats.
 */

export interface XmlNode {
  tag: string;
  attributes: Record<string, string>;
  children: XmlNode[];
  text: string;
}

let parseAttributes = (attrString: string): Record<string, string> => {
  let attrs: Record<string, string> = {};
  let regex = /(\w+)\s*=\s*"([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(attrString)) !== null) {
    attrs[match[1]!] = match[2]!;
  }
  return attrs;
};

export let parseXml = (xml: string): XmlNode => {
  // Remove XML declaration
  xml = xml.replace(/<\?xml[^?]*\?>\s*/g, '').trim();

  let parseNode = (input: string, pos: number): { node: XmlNode; endPos: number } => {
    // Skip whitespace
    while (pos < input.length && /\s/.test(input[pos]!)) pos++;

    if (input[pos] !== '<') {
      throw new Error(`Expected '<' at position ${pos}, got '${input[pos]}'`);
    }

    // Read tag name and attributes
    let tagEnd = input.indexOf('>', pos);
    if (tagEnd === -1) throw new Error('Unclosed tag');

    let tagContent = input.substring(pos + 1, tagEnd);
    let isSelfClosing = tagContent.endsWith('/');
    if (isSelfClosing) {
      tagContent = tagContent.slice(0, -1).trim();
    }

    let spaceIdx = tagContent.indexOf(' ');
    let tag: string;
    let attrString: string;
    if (spaceIdx === -1) {
      tag = tagContent.trim();
      attrString = '';
    } else {
      tag = tagContent.substring(0, spaceIdx).trim();
      attrString = tagContent.substring(spaceIdx + 1).trim();
    }

    let attributes = parseAttributes(attrString);
    let node: XmlNode = { tag, attributes, children: [], text: '' };

    if (isSelfClosing) {
      return { node, endPos: tagEnd + 1 };
    }

    pos = tagEnd + 1;
    let textParts: string[] = [];

    // Parse children and text content
    while (pos < input.length) {
      // Skip to next interesting character
      let nextTag = input.indexOf('<', pos);
      if (nextTag === -1) break;

      // Collect text before the tag
      let textBefore = input.substring(pos, nextTag);
      if (textBefore.trim()) {
        textParts.push(textBefore.trim());
      }

      // Check if it's a CDATA section
      if (input.substring(nextTag, nextTag + 9) === '<![CDATA[') {
        let cdataEnd = input.indexOf(']]>', nextTag + 9);
        if (cdataEnd === -1) throw new Error('Unclosed CDATA');
        textParts.push(input.substring(nextTag + 9, cdataEnd));
        pos = cdataEnd + 3;
        continue;
      }

      // Check if closing tag
      if (input[nextTag + 1] === '/') {
        let closeEnd = input.indexOf('>', nextTag);
        if (closeEnd === -1) throw new Error('Unclosed closing tag');
        node.text = textParts.join('');
        return { node, endPos: closeEnd + 1 };
      }

      // Must be a child element
      let result = parseNode(input, nextTag);
      node.children.push(result.node);
      pos = result.endPos;
    }

    node.text = textParts.join('');
    return { node, endPos: pos };
  };

  let result = parseNode(xml, 0);
  return result.node;
};

export let findChild = (node: XmlNode, tag: string): XmlNode | undefined => {
  return node.children.find(c => c.tag === tag);
};

export let findChildren = (node: XmlNode, tag: string): XmlNode[] => {
  return node.children.filter(c => c.tag === tag);
};

export let getChildText = (node: XmlNode, tag: string): string => {
  let child = findChild(node, tag);
  return child ? child.text : '';
};

export let nodeToObject = (node: XmlNode): Record<string, any> => {
  let obj: Record<string, any> = {};

  // Include attributes
  for (let [key, value] of Object.entries(node.attributes)) {
    obj[key] = value;
  }

  if (node.children.length === 0) {
    if (node.text) {
      return node.text as any;
    }
    return obj;
  }

  // Group children by tag
  let groups: Record<string, XmlNode[]> = {};
  for (let child of node.children) {
    if (!groups[child.tag]) {
      groups[child.tag] = [];
    }
    groups[child.tag]!.push(child);
  }

  for (let [tag, children] of Object.entries(groups)) {
    if (children!.length === 1) {
      let child = children![0]!;
      if (child.children.length === 0 && Object.keys(child.attributes).length === 0) {
        obj[tag] = child.text;
      } else {
        obj[tag] = nodeToObject(child);
      }
    } else {
      obj[tag] = children.map(c => nodeToObject(c));
    }
  }

  return obj;
};
