export let requireExactlyOne = (options: Record<string, unknown>, message?: string): void => {
  let names = Object.keys(options);
  let present = names.filter(name => Boolean(options[name]));

  if (present.length === 1) return;

  throw new Error(
    message ?? `Provide exactly one of ${names.map(name => `\`${name}\``).join(' or ')}.`
  );
};
