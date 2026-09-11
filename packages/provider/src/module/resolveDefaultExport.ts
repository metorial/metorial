export let resolveDefaultExport = <T>(value: unknown): T => {
  let current = value;

  for (let i = 0; i < 4; i++) {
    if (typeof current === 'function') return current as T;
    if (current && typeof current === 'object' && 'default' in current) {
      current = (current as { default: unknown }).default;
      continue;
    }
    break;
  }

  throw new TypeError('Module export is not a constructor');
};
