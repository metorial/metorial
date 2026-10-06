import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { expect, it } from 'vitest';
import { auth } from './auth';
import { config } from './config';
import { provider } from './index';
import legacy from './legacy-schemas.json';
import { z } from './lib/validation';

const object = (v: unknown) => z.record(z.string(), z.unknown()).parse(v);
function compatible(before: unknown, after: unknown) {
  const previous = object(before),
    current = object(after);
  for (const [key, value] of Object.entries(previous)) {
    if (['description', '$schema', 'default'].includes(key)) continue;
    if (key === 'properties')
      for (const [field, schema] of Object.entries(object(value)))
        compatible(schema, object(current.properties)[field]);
    else if (key === 'required')
      for (const field of z.array(z.string()).parse(current.required ?? []))
        expect(z.array(z.string()).parse(value)).toContain(field);
    else if (key === 'items' || key === 'additionalProperties') {
      if (typeof value === 'object' && value !== null) compatible(value, current[key]);
      else expect(current[key]).toEqual(value);
    } else if (key === 'enum')
      for (const item of z.array(z.unknown()).parse(value))
        expect(current.enum).toContain(item);
    else expect(current[key]).toEqual(value);
  }
}
describeMcpCompatibleToolSchemas('ToolJet tool input schemas', provider.actions);
it.each(Object.entries(legacy))('preserves legacy %s fields/types/enums', (key, schemas) => {
  const action = provider.actions.find(t => t.key === key);
  expect(action).toBeDefined();
  if (!action) return;
  compatible(
    schemas.input,
    z.toJSONSchema(action.inputSchema, { io: 'input', unrepresentable: 'any' })
  );
  const previous = object(schemas.output),
    current = object(z.toJSONSchema(action.outputSchema, { unrepresentable: 'any' }));
  for (const [field, schema] of Object.entries(object(previous.properties)))
    expect(object(object(current.properties)[field]).type).toEqual(object(schema).type);
});
it('retains exactly eleven tools and no legacy triggers', () => {
  expect(Object.keys(legacy)).toHaveLength(11);
  expect(provider.actions.map(t => t.key).sort()).toEqual(Object.keys(legacy).sort());
  expect(provider.triggerGroups).toHaveLength(0);
  for (const tool of provider.actions) expect(`tooljet-${tool.key}`.length).toBeLessThan(60);
  expect(auth.authStack.map(m => m.key)).toEqual(['access_token']);
});
it('accepts stored instance config without duplicate setup fields', () => {
  const stored = { baseUrl: 'http://synthetic.example:3000/deployment' };
  expect(config.configSchema.parse(stored)).toEqual(stored);
  expect(Object.keys(z.toJSONSchema(config.configSchema).properties ?? {})).toEqual([]);
});
