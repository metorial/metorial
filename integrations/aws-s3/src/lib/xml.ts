// Simple XML parser and builder for S3 API responses/requests

export interface XmlNode {
  name: string;
  attributes?: Record<string, string>;
  children?: XmlNode[];
  text?: string;
}

let decodeXmlEntities = (str: string): string => {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
};

let encodeXmlEntities = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

export let parseXml = (xml: string): XmlNode => {
  let pos = 0;

  // Skip XML declaration
  if (xml.startsWith('<?xml')) {
    pos = xml.indexOf('?>') + 2;
  }

  let skipWhitespace = () => {
    while (pos < xml.length && /\s/.test(xml[pos]!)) pos++;
  };

  let parseNode = (): XmlNode | null => {
    skipWhitespace();
    if (pos >= xml.length || xml[pos] !== '<') return null;

    // Skip comments
    if (xml.slice(pos, pos + 4) === '<!--') {
      pos = xml.indexOf('-->', pos) + 3;
      return parseNode();
    }

    pos++; // skip <
    let nameStart = pos;
    while (pos < xml.length && xml[pos] !== ' ' && xml[pos] !== '>' && xml[pos] !== '/') pos++;
    let name = xml.slice(nameStart, pos);

    // Parse attributes
    let attributes: Record<string, string> = {};
    skipWhitespace();
    while (pos < xml.length && xml[pos] !== '>' && xml[pos] !== '/') {
      let attrStart = pos;
      while (pos < xml.length && xml[pos] !== '=') pos++;
      let attrName = xml.slice(attrStart, pos).trim();
      pos++; // skip =
      let quote = xml[pos]!;
      pos++; // skip opening quote
      let valStart = pos;
      while (pos < xml.length && xml[pos] !== quote) pos++;
      attributes[attrName] = decodeXmlEntities(xml.slice(valStart, pos));
      pos++; // skip closing quote
      skipWhitespace();
    }

    // Self-closing tag
    if (xml[pos] === '/') {
      pos += 2; // skip />
      return { name, attributes: Object.keys(attributes).length > 0 ? attributes : undefined };
    }

    pos++; // skip >

    let children: XmlNode[] = [];
    let textContent = '';

    while (pos < xml.length) {
      skipWhitespace();
      if (pos >= xml.length) break;

      // Check for closing tag
      if (xml[pos] === '<' && xml[pos + 1] === '/') {
        pos += 2;
        while (pos < xml.length && xml[pos] !== '>') pos++;
        pos++; // skip >
        break;
      }

      // Check for child element
      if (xml[pos] === '<') {
        let child = parseNode();
        if (child) children.push(child);
      } else {
        // Text content
        let textStart = pos;
        while (pos < xml.length && xml[pos] !== '<') pos++;
        textContent += xml.slice(textStart, pos);
      }
    }

    let node: XmlNode = {
      name,
      attributes: Object.keys(attributes).length > 0 ? attributes : undefined
    };
    if (children.length > 0) {
      node.children = children;
    }
    if (textContent.trim()) {
      node.text = decodeXmlEntities(textContent.trim());
    }

    return node;
  };

  let result = parseNode();
  return result || { name: 'root' };
};

// Get text content of a child element by name
export let getChildText = (node: XmlNode, childName: string): string | undefined => {
  let child = node.children?.find(c => c.name === childName);
  return child?.text;
};

// Get all child elements with a specific name
export let getChildren = (node: XmlNode, childName: string): XmlNode[] => {
  return node.children?.filter(c => c.name === childName) || [];
};

// Get a single child element by name
export let getChild = (node: XmlNode, childName: string): XmlNode | undefined => {
  return node.children?.find(c => c.name === childName);
};

// Build XML string from structure
export let buildXml = (root: XmlNode, declaration: boolean = true): string => {
  let result = declaration ? '<?xml version="1.0" encoding="UTF-8"?>' : '';

  let buildNode = (node: XmlNode): string => {
    let xml = `<${node.name}`;
    if (node.attributes) {
      for (let [key, value] of Object.entries(node.attributes)) {
        xml += ` ${key}="${encodeXmlEntities(value)}"`;
      }
    }
    if (!node.children?.length && !node.text) {
      return `${xml}/>`;
    }
    xml += '>';
    if (node.text) {
      xml += encodeXmlEntities(node.text);
    }
    if (node.children) {
      for (let child of node.children) {
        xml += buildNode(child);
      }
    }
    xml += `</${node.name}>`;
    return xml;
  };

  result += buildNode(root);
  return result;
};
