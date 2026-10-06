import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { auth } from './auth';
import { config } from './config';
import { provider } from './index';
import legacy from './legacy-schemas.json';

const object = (value: unknown) => z.record(z.string(), z.unknown()).parse(value);
function compatible(before: unknown, after: unknown) {
  const previous = object(before),
    current = object(after);
  for (const [key, value] of Object.entries(previous)) {
    if (key === 'description' || key === '$schema') continue;
    if (key === 'properties')
      for (const [field, schema] of Object.entries(object(value)))
        compatible(schema, object(current.properties)[field]);
    else if (key === 'items' || key === 'additionalProperties') {
      if (typeof value === 'object' && value !== null) compatible(value, current[key]);
      else expect(current[key]).toEqual(value);
    } else if (key === 'enum')
      for (const item of z.array(z.unknown()).parse(value))
        expect(current.enum).toContain(item);
    else expect(current[key]).toEqual(value);
  }
}
describeMcpCompatibleToolSchemas('n8n tool input schemas', provider.actions);
it.each(
  Object.entries(legacy)
)('preserves legacy %s input and output field types', (key, schemas) => {
  const action = provider.actions.find(value => value.key === key);
  expect(action).toBeDefined();
  if (!action) return;
  compatible(schemas.input, z.toJSONSchema(action.inputSchema, { unrepresentable: 'any' }));
  const previous = object(schemas.output),
    current = object(z.toJSONSchema(action.outputSchema, { unrepresentable: 'any' }));
  for (const [field, schema] of Object.entries(object(previous.properties))) {
    const next = object(object(current.properties)[field]);
    expect(next.type).toEqual(object(schema).type);
  }
});
it('retains all 23 keys and only approved native capability discovery', () => {
  expect(Object.keys(legacy)).toHaveLength(23);
  expect(provider.actions).toHaveLength(24);
  expect(
    provider.actions.filter(action => !(action.key in legacy)).map(action => action.key)
  ).toEqual(['discover_api']);
  expect(provider.triggerGroups).toHaveLength(0);
  for (const action of provider.actions) expect(`n8n-${action.key}`.length).toBeLessThan(60);
  expect(auth.authStack.map(method => method.key)).toEqual(['api_key']);
});
it('preserves actual legacy instance config without duplicate setup fields', () => {
  const old = { baseUrl: 'http://synthetic.example:5678/deployment/api/v1' };
  expect(config.configSchema.parse(old)).toEqual(old);
  expect(Object.keys(z.toJSONSchema(config.configSchema).properties ?? {})).toEqual([]);
});
