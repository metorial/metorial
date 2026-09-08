import { describe, expect, it } from 'vitest';
import { resolveDefaultExport } from './resolveDefaultExport';

class Example {
  value: number;
  constructor(value: number) {
    this.value = value;
  }
}

describe('resolveDefaultExport', () => {
  it('returns a constructor export as-is', () => {
    expect(resolveDefaultExport<typeof Example>(Example)).toBe(Example);
    expect(new (resolveDefaultExport<typeof Example>(Example))(1).value).toBe(1);
  });

  it('unwraps CJS default-export objects produced by bundlers', () => {
    expect(resolveDefaultExport<typeof Example>({ default: Example })).toBe(Example);
  });

  it('unwraps nested default exports from double-bundling', () => {
    expect(
      resolveDefaultExport<typeof Example>({ default: { default: Example } })
    ).toBe(Example);
  });

  it('throws when the export is not a constructor', () => {
    expect(() => resolveDefaultExport({})).toThrow(TypeError);
    expect(() => resolveDefaultExport({ default: { foo: 1 } })).toThrow(TypeError);
    expect(() => resolveDefaultExport(undefined)).toThrow(TypeError);
  });
});
