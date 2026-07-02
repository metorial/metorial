// Lightweight XML parser for AWS SNS API responses.
// Handles the simple XML structure returned by SNS.

export let parseXml = (xml: string): Record<string, any> => {
  let result: Record<string, any> = {};
  parseElement(xml, result);
  return result;
};

let decodeXmlEntities = (value: string): string =>
  value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code: string) =>
      String.fromCharCode(Number.parseInt(code, 16))
    );

let parseElement = (xml: string, target: Record<string, any>): void => {
  let tagRegex = /<(\w+)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/g;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(xml)) !== null) {
    let tagName = match[1]!;
    let content = match[2]!;

    // Check if content contains child elements
    if (/<\w+>/.test(content)) {
      // Check if this is a collection (member pattern)
      if (/^\s*<member(?:\s[^>]*)?>/.test(content)) {
        let members: any[] = [];
        let memberRegex = /<member(?:\s[^>]*)?>([\s\S]*?)<\/member>/g;
        let memberMatch: RegExpExecArray | null;
        while ((memberMatch = memberRegex.exec(content)) !== null) {
          let memberContent = memberMatch[1]!;
          if (/<\w+>/.test(memberContent)) {
            let memberObj: Record<string, any> = {};
            parseElement(memberContent, memberObj);
            members.push(memberObj);
          } else {
            members.push(decodeXmlEntities(memberContent.trim()));
          }
        }
        target[tagName] = members;
      } else if (/^\s*<entry(?:\s[^>]*)?>/.test(content)) {
        // Handle map entries (key/value pairs)
        let entries: Record<string, string> = {};
        let entryRegex = /<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/g;
        let entryMatch: RegExpExecArray | null;
        while ((entryMatch = entryRegex.exec(content)) !== null) {
          let keyMatch = /<key(?:\s[^>]*)?>([\s\S]*?)<\/key>/.exec(entryMatch[1]!);
          let valueMatch = /<value(?:\s[^>]*)?>([\s\S]*?)<\/value>/.exec(entryMatch[1]!);
          if (keyMatch && valueMatch) {
            entries[decodeXmlEntities(keyMatch[1]!.trim())] = decodeXmlEntities(
              valueMatch[1]!.trim()
            );
          }
        }
        target[tagName] = entries;
      } else {
        let child: Record<string, any> = {};
        parseElement(content, child);
        target[tagName] = child;
      }
    } else {
      target[tagName] = decodeXmlEntities(content.trim());
    }
  }
};

// Extract error information from AWS error XML responses
export let parseAwsError = (xml: string): { code: string; message: string } => {
  let codeMatch = /<Code>([\s\S]*?)<\/Code>/.exec(xml);
  let messageMatch = /<Message>([\s\S]*?)<\/Message>/.exec(xml);
  return {
    code: codeMatch?.[1]?.trim() || 'UnknownError',
    message: messageMatch?.[1]?.trim() || 'An unknown error occurred'
  };
};
