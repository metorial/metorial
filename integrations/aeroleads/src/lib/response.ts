import { isApiErrorRecord } from 'slates';

export let getResult = (response: Record<string, unknown>) =>
  isApiErrorRecord(response.result) ? response.result : response;

export let getText = (...values: unknown[]) => {
  for (let value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
};

// Profile list fields are documented as strings, but some responses use arrays.
export let getStringList = (...values: unknown[]) => {
  let items = values.flatMap(value => {
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string');
    }
    return typeof value === 'string' ? [value] : [];
  });
  let result = [...new Set(items.map(item => item.trim()).filter(Boolean))];
  return result.length ? result : undefined;
};
