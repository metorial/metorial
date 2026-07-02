// Lightweight XML parser for Azure Blob Storage REST API responses
// Azure Blob Storage returns XML, so we need basic parsing capabilities

export let getTagContent = (xml: string, tag: string): string | undefined => {
  let regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`);
  let match = xml.match(regex);
  return match ? match[1]! : undefined;
};

export let getAllTagContents = (xml: string, tag: string): string[] => {
  let regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g');
  let results: string[] = [];
  let match: any;
  while ((match = regex.exec(xml)) !== null) {
    results.push(match[1]!);
  }
  return results;
};

export let getAllElements = (xml: string, tag: string): string[] => {
  let regex = new RegExp(`<${tag}>[\\s\\S]*?</${tag}>`, 'g');
  let results: string[] = [];
  let match: any;
  while ((match = regex.exec(xml)) !== null) {
    results.push(match[0]!);
  }
  return results;
};

export let getSelfClosingOrContent = (xml: string, tag: string): string | undefined => {
  // Match self-closing tags like <Tag /> or tags with content
  let regex = new RegExp(`<${tag}\\s*/>|<${tag}>([\\s\\S]*?)</${tag}>`);
  let match = xml.match(regex);
  if (!match) return undefined;
  return match[1] ?? '';
};

export let getAttributeValue = (element: string, attr: string): string | undefined => {
  let regex = new RegExp(`${attr}="([^"]*?)"`);
  let match = element.match(regex);
  return match ? match[1]! : undefined;
};

export let escapeXml = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

export let extractMetadata = (
  xml: string,
  _prefix: string = 'x-ms-meta-'
): Record<string, string> => {
  let metadataSection = getTagContent(xml, 'Metadata');
  if (!metadataSection) return {};

  let metadata: Record<string, string> = {};
  let tagRegex = /<(\w+)>([\s\S]*?)<\/\1>/g;
  let match: any;
  while ((match = tagRegex.exec(metadataSection)) !== null) {
    metadata[match[1]!] = match[2]!;
  }
  return metadata;
};
