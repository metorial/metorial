import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import frozen from './legacy-contracts.json';

let compact = (source: string) => source.replace(/\s+/g, '');
let read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

// These static contracts freeze compatibility; provider mutations are deliberately never invoked.
describe('Sensibo legacy tool contracts', () => {
  for (let [key, baseline] of Object.entries(frozen.tools)) {
    it(`preserves ${key} and registers its documented replacement`, () => {
      let legacy = provider.actions.find(action => action.key === key)!;
      expect(legacy).toBeDefined();
      expect(legacy.tags?.deprecated).toBe(true);
      expect(legacy.description).toMatch(/^DEPRECATED/);
      expect(provider.actions.some(action => action.key === baseline.replacement)).toBe(true);
      expect(z.toJSONSchema(legacy.inputSchema, { unrepresentable: 'any' })).toEqual(
        baseline.input
      );
      expect(z.toJSONSchema(legacy.outputSchema!, { unrepresentable: 'any' })).toEqual(
        baseline.output
      );
      let source = read(baseline.file);
      expect(
        compact(
          source.slice(source.indexOf('.handleInvocation('), source.lastIndexOf('  .build();'))
        )
      ).toBe(compact(baseline.handler));
    });
  }
  for (let [name, source] of Object.entries(frozen.methods)) {
    it(`freezes legacy ${name} routing and payload`, () => {
      expect(compact(read('lib/client.ts'))).toContain(compact(source));
    });
  }
  it('keeps every registered input compatible with object-only tool bridges', () => {
    for (let tool of provider.actions) {
      let schema = z.toJSONSchema(tool.inputSchema, { unrepresentable: 'any' });
      expect(schema.type).toBe('object');
      expect(schema.anyOf).toBeUndefined();
      expect(schema.oneOf).toBeUndefined();
      expect(schema.allOf).toBeUndefined();
      expect(`sensibo-${tool.key}`.length).toBeLessThan(60);
    }
  });
});
