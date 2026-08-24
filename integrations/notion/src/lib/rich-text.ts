let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const NOTION_TEXT_CONTENT_LIMIT = 2000;

let normalizeNotionRichTextContentLimits = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.flatMap(entry => {
      if (!isRecord(entry) || entry.type !== 'text' || !isRecord(entry.text)) {
        return [normalizeNotionRichTextContentLimits(entry)];
      }

      let content = entry.text.content;
      if (typeof content !== 'string' || content.length <= NOTION_TEXT_CONTENT_LIMIT) {
        return [normalizeNotionRichTextContentLimits(entry)];
      }

      let characters = Array.from(content);
      let parts: unknown[] = [];
      for (let offset = 0; offset < characters.length; offset += NOTION_TEXT_CONTENT_LIMIT) {
        parts.push(
          normalizeNotionRichTextContentLimits({
            ...entry,
            text: {
              ...entry.text,
              content: characters.slice(offset, offset + NOTION_TEXT_CONTENT_LIMIT).join('')
            }
          })
        );
      }

      return parts;
    });
  }

  if (!isRecord(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      normalizeNotionRichTextContentLimits(entry)
    ])
  );
};

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

export let normalizeNotionBlockUpdateContent = (
  value: Record<string, unknown>
): Record<string, unknown> => {
  let normalized = normalizeNotionRichTextContentLimits(value) as Record<string, unknown>;
  if (!isRecord(normalized.image) || !('type' in normalized.image)) {
    return normalized;
  }

  return {
    ...normalized,
    image: Object.fromEntries(
      Object.entries(normalized.image).filter(([key]) => key !== 'type')
    )
  };
};
