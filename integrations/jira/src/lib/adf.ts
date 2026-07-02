type AdfDocument = {
  type: 'doc';
  version: 1;
  content: unknown[];
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let isAdfDocument = (value: unknown): value is AdfDocument =>
  isRecord(value) &&
  value.type === 'doc' &&
  value.version === 1 &&
  Array.isArray(value.content);

let parseStringifiedAdf = (value: string) => {
  try {
    let parsed = JSON.parse(value);
    return isAdfDocument(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

export let normalizeAdf = (value: unknown) => {
  if (typeof value !== 'string') {
    return value;
  }

  let parsed = parseStringifiedAdf(value);
  if (parsed) {
    return parsed;
  }

  return {
    version: 1,
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: value }] }]
  };
};
