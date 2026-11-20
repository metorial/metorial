import {
  type SlatesEventAttributes,
  slatesEventAttributeMaxValueLength,
  slatesEventAttributeMaxValues
} from '@slates/proto';

let toAttributeValue = (value: unknown): string | null => {
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
};

export let extractEventAttributes = (
  fields: string[],
  output: Record<string, unknown> | null | undefined
): SlatesEventAttributes => {
  let attributes: SlatesEventAttributes = {};
  if (!output || typeof output !== 'object') return attributes;

  for (let field of fields) {
    if (!Object.hasOwn(output, field)) continue;

    let raw = output[field];
    let candidates = Array.isArray(raw) ? raw : [raw];
    let values = new Set<string>();

    for (let candidate of candidates) {
      if (values.size >= slatesEventAttributeMaxValues) break;

      let value = toAttributeValue(candidate);
      if (!value || value.length > slatesEventAttributeMaxValueLength) continue;
      values.add(value);
    }

    if (values.size) attributes[field] = [...values];
  }

  return attributes;
};
