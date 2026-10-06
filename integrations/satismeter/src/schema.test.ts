import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import legacy from './legacy-schemas.json';
import { spec } from './spec';

const object = (value: unknown) => z.record(z.string(), z.unknown()).parse(value);
function preserve(previous: unknown, current: unknown, input: boolean) {
  const before = object(previous),
    after = object(current);
  for (const [key, value] of Object.entries(before)) {
    if (key === 'description' || key === '$schema') continue;
    if (key === 'properties')
      for (const [name, property] of Object.entries(object(value)))
        preserve(property, object(after.properties)[name], input);
    else if (key === 'items') preserve(value, after.items, input);
    else if (key === 'required' && input) expect(after.required ?? []).toEqual(value);
    else expect(after[key]).toEqual(value);
  }
  if (input && before.required === undefined) expect(after.required ?? []).toEqual([]);
}
describeMcpCompatibleToolSchemas('SatisMeter input schemas', provider.actions);
it.each(Object.entries(legacy))('retains original %s contracts', (key, schemas) => {
  const action = provider.actions.find(item => item.key === key);
  expect(action).toBeDefined();
  if (!action) return;
  preserve(schemas.input, z.toJSONSchema(action.inputSchema as z.ZodType), true);
  preserve(
    schemas.output,
    z.toJSONSchema(action.outputSchema as z.ZodType, { unrepresentable: 'any' }),
    false
  );
});
it('keeps ten original keys and only two approved essentials', () => {
  expect(Object.keys(legacy)).toHaveLength(10);
  expect(provider.actions).toHaveLength(12);
  expect(new Set(provider.actions.map(item => item.key)).size).toBe(12);
  for (const action of provider.actions)
    expect(`satismeter-${action.key}`.length).toBeLessThan(60);
  expect(provider.triggerGroups).toHaveLength(0);
});
it('retains stored project configuration without requiring an opaque ID', () => {
  expect(z.toJSONSchema(spec.configSchema).properties).toEqual({});
  expect(spec.configSchema.parse({ projectId: 'legacy-project' })).toEqual({
    projectId: 'legacy-project'
  });
});
