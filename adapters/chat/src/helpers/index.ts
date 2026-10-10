/** Case-insensitive substring match of a trimmed query; an empty query matches everything. */
export let matchesChatQuery = (
  query: string | undefined,
  values: (string | null | undefined)[]
): boolean => {
  let needle = query?.trim().toLowerCase();
  if (!needle) return true;
  return values.some(value => value?.toLowerCase().includes(needle));
};
