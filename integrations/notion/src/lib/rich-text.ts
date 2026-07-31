let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export let normalizeNotionRichTextAnnotations = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(normalizeNotionRichTextAnnotations);
  }

  if (!isRecord(value)) {
    return value;
  }

  let normalized = Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      normalizeNotionRichTextAnnotations(entry)
    ])
  );

  if (normalized.type !== 'text' || !isRecord(normalized.text)) {
    return normalized;
  }

  let { annotations, ...text } = normalized.text;
  if (!isRecord(annotations)) {
    return normalized;
  }

  return {
    ...normalized,
    text,
    annotations: isRecord(normalized.annotations) ? normalized.annotations : annotations
  };
};
