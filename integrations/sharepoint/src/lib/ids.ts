let placeholderIds = new Set(['none', 'null', 'undefined', 'nil']);

export let cleanId = (value: string | undefined | null) => {
  let trimmed = value?.trim();
  if (!trimmed || placeholderIds.has(trimmed.toLowerCase())) return undefined;
  return trimmed;
};
