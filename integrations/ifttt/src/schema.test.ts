import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import original from './legacy-schemas.json';

const object = (value: unknown) => z.record(z.string(), z.unknown()).parse(value);
function preserve(previous: unknown, current: unknown) {
  const before = object(previous),
    after = object(current);
  for (const [key, value] of Object.entries(before)) {
    if (key === 'description' || key === '$schema') continue;
    if (key === 'properties') {
      for (const [name, property] of Object.entries(object(value)))
        preserve(property, object(after.properties)[name]);
    } else if (key === 'items') preserve(value, after.items);
    else if (key === 'enum') {
      expect(Array.isArray(after.enum)).toBe(true);
      for (const item of value as unknown[]) expect(after.enum).toContain(item);
    } else expect(after[key]).toEqual(value);
  }
}
describeMcpCompatibleToolSchemas('IFTTT tool input schemas', provider.actions);
it.each(Object.entries(original))('preserves legacy %s schemas', (key, schemas) => {
  const action = provider.actions.find(value => value.key === key);
  expect(action).toBeDefined();
  if (!action) return;
  preserve(
    schemas.input,
    z.toJSONSchema(action.inputSchema as z.ZodType, { unrepresentable: 'any' })
  );
  preserve(
    schemas.output,
    z.toJSONSchema(action.outputSchema as z.ZodType, { unrepresentable: 'any' })
  );
});
it('retains eight keys and only the approved current-context addition', () => {
  expect(Object.keys(original)).toHaveLength(8);
  expect(provider.actions).toHaveLength(9);
  expect(
    provider.actions.filter(action => !(action.key in original)).map(action => action.key)
  ).toEqual(['get_current_context']);
  expect(provider.triggerGroups).toHaveLength(0);
  for (const action of provider.actions) expect(`ifttt-${action.key}`.length).toBeLessThan(60);
});
