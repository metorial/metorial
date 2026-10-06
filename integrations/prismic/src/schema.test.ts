import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import original from './legacy-schemas.json';

const object = (value: unknown) => z.record(z.string(), z.unknown()).parse(value);
function preserve(previous: unknown, current: unknown, input: boolean) {
  const before = object(previous),
    after = object(current);
  // Additional nullable output cases preserve every original valid string.
  if (!input && before.type === 'string' && Array.isArray(after.anyOf)) {
    expect(after.anyOf.some(branch => object(branch).type === 'string')).toBe(true);
    return;
  }
  for (const [key, value] of Object.entries(before)) {
    if (key === 'description' || key === '$schema') continue;
    if (key === 'properties')
      for (const [name, property] of Object.entries(object(value)))
        preserve(property, object(after.properties)[name], input);
    else if (key === 'items') preserve(value, after.items, input);
    else expect(after[key]).toEqual(value);
  }
}
describeMcpCompatibleToolSchemas('Prismic input schemas', provider.actions);
it.each(Object.entries(original))('preserves the original %s contract', (key, schemas) => {
  const action = provider.actions.find(value => value.key === key);
  expect(action).toBeDefined();
  if (!action) return;
  preserve(
    schemas.input,
    z.toJSONSchema(action.inputSchema as z.ZodType, { unrepresentable: 'any' }),
    true
  );
  preserve(
    schemas.output,
    z.toJSONSchema(action.outputSchema as z.ZodType, { unrepresentable: 'any' }),
    false
  );
});
it('retains 18 legacy keys and only two approved essentials', () => {
  expect(Object.keys(original)).toHaveLength(18);
  expect(provider.actions).toHaveLength(20);
  expect(
    provider.actions
      .filter(action => !Object.keys(original).includes(action.key))
      .map(action => action.key)
      .sort()
  ).toEqual(['download_asset', 'get_shared_slice']);
  expect(provider.triggerGroups).toHaveLength(0);
  for (const action of provider.actions)
    expect(`prismic-${action.key}`.length).toBeLessThan(60);
});
