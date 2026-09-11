import { describe, expect, it } from 'vitest';
import { resolveDefaultExport } from './pQueue';

class Example {
  value: number;
  constructor(value: number) {
    this.value = value;
  }
}

describe('resolveDefaultExport', () => {
  it('unwraps nested CJS default exports from bundlers', () => {
    expect(resolveDefaultExport<typeof Example>({ default: { default: Example } })).toBe(
      Example
    );
    expect(new (resolveDefaultExport<typeof Example>({ default: Example }))(3).value).toBe(3);
  });
});
