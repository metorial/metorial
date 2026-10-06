import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { expect, it } from 'vitest';
import { auth } from './auth';
import { config } from './config';
import { provider } from './index';
import legacy from './legacy-schemas.json';
import { z } from './lib/validation';

const object = (v: unknown) => z.record(z.string(), z.unknown()).parse(v);
function compatible(before: unknown, after: unknown) {
  const p = object(before),
    c = object(after);
  for (const [k, v] of Object.entries(p)) {
    if (['description', '$schema', 'default'].includes(k)) continue;
    if (k === 'properties' || k === '$defs') {
      for (const [field, schema] of Object.entries(object(v)))
        compatible(schema, object(c[k])[field]);
    } else if (k === 'required') {
      for (const field of z.array(z.string()).parse(c.required ?? []))
        expect(z.array(z.string()).parse(v)).toContain(field);
    } else if (k === 'items' || k === 'additionalProperties') {
      if (v && typeof v === 'object') compatible(v, c[k]);
      else expect(c[k]).toEqual(v);
    } else if (k === 'enum') {
      for (const item of z.array(z.unknown()).parse(v)) expect(c.enum).toContain(item);
    } else expect(c[k]).toEqual(v);
  }
}
describeMcpCompatibleToolSchemas('Softr tool input schemas', provider.actions);
it.each(
  Object.entries(legacy)
)('preserves genuine legacy %s inputs and output field types', (key, schemas) => {
  const action = provider.actions.find(a => a.key === key);
  expect(action).toBeDefined();
  if (!action?.outputSchema) return;
  compatible(
    schemas.input,
    z.toJSONSchema(action.inputSchema, { io: 'input', unrepresentable: 'any' })
  );
  const p = object(schemas.output),
    c = object(z.toJSONSchema(action.outputSchema, { unrepresentable: 'any' }));
  for (const [field, schema] of Object.entries(object(p.properties)))
    expect(object(object(c.properties)[field]).type).toEqual(object(schema).type);
});
it('retains fifteen legacy keys plus exactly two approved additions', () => {
  expect(Object.keys(legacy)).toHaveLength(15);
  expect(provider.actions.map(a => a.key).sort()).toEqual(
    [...Object.keys(legacy), 'list_table_views', 'manage_user_lifecycle'].sort()
  );
  expect(provider.triggerGroups).toHaveLength(0);
  for (const a of provider.actions) expect(`softr-${a.key}`.length).toBeLessThan(60);
  expect(auth.authStack.map(a => a.key)).toEqual(['api_key']);
});
it('retains genuine stored app domains without duplicate setup properties', () => {
  const stored = { domain: 'existing.softr.app' };
  expect(config.configSchema.parse(stored)).toEqual(stored);
  expect(Object.keys(z.toJSONSchema(config.configSchema).properties ?? {})).toEqual([]);
  const method = auth.authStack[0];
  expect(method?.inputSchema).toBeDefined();
  if (method?.inputSchema)
    expect(z.toJSONSchema(method.inputSchema).properties).toHaveProperty('domain');
});
