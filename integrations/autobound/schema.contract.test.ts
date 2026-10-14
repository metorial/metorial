import { expect, test } from 'bun:test';
import { z } from 'zod';
import { provider } from './src/index';

test('the deprecated insight tool remains registered beside its signal replacements', () => {
  let legacy = provider.actions.find(action => action.key === 'generate_insights');
  expect(legacy).toBeDefined();
  expect(legacy?.tags?.deprecated).toBe(true);
  expect(legacy?.description).toStartWith('DEPRECATED — use enrich_contact or enrich_company');
  expect(provider.actions.some(action => action.key === 'enrich_contact')).toBe(true);
  expect(provider.actions.some(action => action.key === 'enrich_company')).toBe(true);
});

test('all registered tool inputs serialize as flat objects with valid identifiers', () => {
  for (let action of provider.actions) {
    let schema = z.toJSONSchema(action.inputSchema);
    expect(schema.type).toBe('object');
    expect(schema.oneOf).toBeUndefined();
    expect(schema.anyOf).toBeUndefined();
    expect(schema.allOf).toBeUndefined();
    expect(`autobound-${action.key}`.length).toBeLessThan(60);
  }
});
