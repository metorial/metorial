export let pickDefined = <T extends object>(value: T) =>
  Object.fromEntries(
    Object.entries(value).filter(([, child]) => child !== undefined)
  ) as Partial<T> & Record<string, unknown>;

export let setIfDefined = (target: Record<string, unknown>, key: string, value: unknown) => {
  if (value !== undefined) {
    target[key] = value;
  }

  return target;
};
