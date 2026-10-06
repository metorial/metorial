import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { auth } from './auth';
import { config } from './config';
import { provider } from './index';
import legacy from './legacy-schemas.json';

const object = (value: unknown) => z.record(z.string(), z.unknown()).parse(value);
function compatible(before: unknown, after: unknown, input: boolean) {
  const previous = object(before),
    current = object(after);
  for (const [key, value] of Object.entries(previous)) {
    if (key === 'description' || key === '$schema') continue;
    if (key === 'properties')
      for (const [field, schema] of Object.entries(object(value)))
        compatible(schema, object(current.properties)[field], input);
    else if (key === 'items') compatible(value, current.items, input);
    else if (key === 'required') {
      if (input) expect(current.required ?? []).toEqual(value);
      else
        for (const field of z.array(z.string()).parse(value))
          expect(current.required).toContain(field);
    } else expect(current[key]).toEqual(value);
  }
}
describeMcpCompatibleToolSchemas('Strapi tool input schemas', provider.actions);
it.each(Object.entries(legacy))('preserves legacy %s contracts', (key, value) => {
  const tool = provider.actions.find(action => action.key === key);
  expect(tool).toBeDefined();
  if (!tool) return;
  compatible(value.input, z.toJSONSchema(tool.inputSchema), true);
  compatible(
    value.output,
    z.toJSONSchema(tool.outputSchema, { unrepresentable: 'any' }),
    false
  );
});
it('retains twelve keys plus two approved public capabilities and one reserved renewal', () => {
  expect(Object.keys(legacy)).toHaveLength(12);
  expect(provider.actions).toHaveLength(15);
  expect(
    provider.actions
      .filter(tool => !(tool.key in legacy))
      .map(tool => tool.key)
      .sort()
  ).toEqual(['download_media', 'get_current_user', 'metorial$getFileUrl']);
  for (const tool of provider.actions) expect(`strapi-${tool.key}`.length).toBeLessThan(60);
  expect(provider.triggerGroups).toHaveLength(0);
  expect(auth.authStack.map(method => method.key)).toEqual(['api_token', 'jwt_login']);
});
it('preserves legacy instance settings without duplicate setup fields', () => {
  const original = { baseUrl: 'https://synthetic.example/cms', apiVersion: '4' };
  expect(config.configSchema.parse(original)).toEqual(original);
  expect(Object.keys(z.toJSONSchema(config.configSchema).properties ?? {})).toEqual([]);
});
