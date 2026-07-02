// Lightweight XML parser for AWS SNS API responses
// Handles the simple XML structure returned by SNS

export let parseXml = (xml: string): Record<string, any> => {
  let result: Record<string, any> = {};
  parseElement(xml, result);
  return result;
};

let parseElement = (xml: string, target: Record<string, any>): void => {
  let tagRegex = /<(\w+)>([\s\S]*?)<\/\1>/g;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(xml)) !== null) {
    let tagName = match[1]!;
    let content = match[2]!;

    // Check if content contains child elements
    if (/<\w+>/.test(content)) {
      // Check if this is a collection (member pattern)
      if (content.includes('<member>')) {
        let members: Record<string, any>[] = [];
        let memberRegex = /<member>([\s\S]*?)<\/member>/g;
        let memberMatch: RegExpExecArray | null;
        while ((memberMatch = memberRegex.exec(content)) !== null) {
          let memberObj: Record<string, any> = {};
          parseElement(memberMatch[1]!, memberObj);
          members.push(memberObj);
        }
        target[tagName] = members;
      } else if (content.includes('<entry>')) {
        // Handle map entries (key/value pairs)
        let entries: Record<string, string> = {};
        let entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
        let entryMatch: RegExpExecArray | null;
        while ((entryMatch = entryRegex.exec(content)) !== null) {
          let keyMatch = /<key>([\s\S]*?)<\/key>/.exec(entryMatch[1]!);
          let valueMatch = /<value>([\s\S]*?)<\/value>/.exec(entryMatch[1]!);
          if (keyMatch && valueMatch) {
            entries[keyMatch[1]!] = valueMatch[1]!;
          }
        }
        target[tagName] = entries;
      } else {
        let child: Record<string, any> = {};
        parseElement(content, child);
        target[tagName] = child;
      }
    } else {
      target[tagName] = content.trim();
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
