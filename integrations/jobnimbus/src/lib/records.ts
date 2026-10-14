export let recordId = (record: unknown): string | undefined => {
  if (typeof record === 'string') return record;
  if (
    record &&
    typeof record === 'object' &&
    'id' in record &&
    typeof record.id === 'string'
  ) {
    return record.id;
  }
  return undefined;
};

export let recordName = (record: unknown): string | undefined => {
  if (
    record &&
    typeof record === 'object' &&
    'name' in record &&
    typeof record.name === 'string'
  ) {
    return record.name;
  }
  return undefined;
};

export let ownerIds = (owners: unknown): string[] | undefined => {
  if (!Array.isArray(owners)) return undefined;
  return owners.flatMap(owner => {
    let id = recordId(owner);
    return id === undefined ? [] : [id];
  });
};
