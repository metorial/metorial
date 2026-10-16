import { isApiErrorRecord } from 'slates';

export let richText = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (!isApiErrorRecord(value)) return undefined;
  for (let key of ['Html', 'Text', 'Content']) {
    if (typeof value[key] === 'string' && value[key] !== '') return value[key];
  }
  return typeof value.Text === 'string' ? value.Text : undefined;
};

export let richTextInput = (value: unknown) => {
  if (!isApiErrorRecord(value)) return { Content: '', Type: 'Text' };
  return { Content: richText(value) ?? '', Type: value.Html ? 'Html' : 'Text' };
};

export let responseItems = (value: any): any[] => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.Items)) return value.Items;
  if (Array.isArray(value?.Objects)) return value.Objects;
  return value?.UserId !== undefined ? [value] : [];
};

export let optionalId = (value: unknown) =>
  value === null || value === undefined ? undefined : String(value);

export let enumNumber = (
  value: unknown,
  names: Record<string, number>
): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  if (Object.hasOwn(names, value)) return names[value];
  let number = Number(value);
  return Number.isFinite(number) ? number : undefined;
};
