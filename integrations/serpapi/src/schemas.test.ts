import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import baseline from './legacy-contracts.json';

type Schema = {
  type?: unknown;
  enum?: unknown[];
  properties?: Record<string, Schema>;
  items?: Schema;
  anyOf?: Schema[];
  required?: string[];
};
function preserves(old: Schema, now: Schema, path: string) {
  if (old.type !== undefined) expect(now.type, path).toEqual(old.type);
  if (old.enum) expect(now.enum, path).toEqual(expect.arrayContaining(old.enum));
  if (old.items) preserves(old.items, now.items!, `${path}[]`);
  if (old.anyOf)
    for (const choice of old.anyOf) {
      const match = now.anyOf?.find(v => v.type === choice.type);
      expect(match, path).toBeDefined();
      preserves(choice, match!, path);
    }
  for (const [key, field] of Object.entries(old.properties ?? {})) {
    expect(now.properties?.[key], `${path}.${key}`).toBeDefined();
    preserves(field, now.properties![key]!, `${path}.${key}`);
  }
}
describe('SerpApi schema and released compatibility contracts', () => {
  for (const action of provider.actions.filter(a => a.type === 'tool'))
    it(`${action.key} has an object input and bounded public ID`, () => {
      const schema = z.toJSONSchema(action.inputSchema!);
      expect(schema.type).toBe('object');
      expect(schema).not.toHaveProperty('oneOf');
      expect(schema).not.toHaveProperty('anyOf');
      expect(schema).not.toHaveProperty('allOf');
      expect(`serpapi-${action.key}`.length).toBeLessThan(60);
    });
  for (const [key, contract] of Object.entries(baseline))
    it(`${key} preserves genuine released fields/types/enums`, () => {
      const action = provider.actions.find(a => a.key === key);
      expect(action).toBeDefined();
      preserves(
        contract.input as Schema,
        z.toJSONSchema(action!.inputSchema!) as Schema,
        `${key}.input`
      );
      preserves(
        contract.output as Schema,
        z.toJSONSchema(action!.outputSchema!, { unrepresentable: 'any' }) as Schema,
        `${key}.output`
      );
    });
  it('contains exactly the approved public keys without legacy triggers', () => {
    expect(
      provider.actions
        .filter(a => a.type === 'tool')
        .map(a => a.key)
        .sort()
    ).toEqual([...Object.keys(baseline), 'get_search'].sort());
  });
});
