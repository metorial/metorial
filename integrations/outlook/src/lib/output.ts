export let optionalString = (value: unknown) =>
  typeof value === 'string' ? value : undefined;

export let optionalEmailAddresses = (
  value:
    | Array<{
        address?: unknown;
        name?: unknown;
      }>
    | null
    | undefined
) => {
  let normalized = value?.flatMap(entry =>
    typeof entry?.address === 'string'
      ? [
          {
            address: entry.address,
            name: optionalString(entry.name)
          }
        ]
      : []
  );

  return normalized && normalized.length > 0 ? normalized : undefined;
};
