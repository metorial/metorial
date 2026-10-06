import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import legacyInputs from './legacy-input-contracts.json';
import legacyOutputs from './legacy-output-contracts.json';
import { spec } from './spec';

describeMcpCompatibleToolSchemas('ZoomInfo input schemas', provider.actions);
const canonical = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !['description', '$schema'].includes(key))
      .map(([key, item]) => [key, canonical(item)])
  );
};
const record = (value: unknown) => z.record(z.string(), z.unknown()).parse(value);
const preserveFields = (before: unknown, after: unknown) => {
  const previous = record(before),
    current = record(after);
  for (const [key, value] of Object.entries(previous)) {
    if (key === 'properties') {
      const fields = record(current.properties);
      for (const [field, schema] of Object.entries(record(value)))
        preserveFields(schema, fields[field]);
    } else if (key === 'items') preserveFields(value, current.items);
    else expect(current[key]).toEqual(value);
  }
  expect(current.required ?? []).toEqual(previous.required ?? []);
};
it.each(Object.entries(legacyInputs))('preserves historical %s input', (key, schema) => {
  const action = provider.actions.find(action => action.key === key);
  expect(action).toBeDefined();
  preserveFields(
    canonical(schema),
    canonical(z.toJSONSchema(action?.inputSchema as z.ZodType))
  );
});
it.each(Object.entries(legacyOutputs))('preserves historical %s output', (key, schema) => {
  const action = provider.actions.find(action => action.key === key);
  expect(action).toBeDefined();
  preserveFields(
    canonical(schema),
    canonical(z.toJSONSchema(action?.outputSchema as z.ZodType))
  );
});
it('keeps tool inventory, auth keys and stored config contracts', () => {
  expect(provider.actions).toHaveLength(15);
  expect(new Set(provider.actions.map(action => action.key)).size).toBe(15);
  for (const action of provider.actions)
    expect(`zoominfo-${action.key}`.length).toBeLessThan(60);
  expect(spec.authSchema.parse({ token: 'schema-only-token' })).toEqual({
    token: 'schema-only-token'
  });
  expect(spec.configSchema.parse({})).toEqual({ apiVersion: 'legacy' });
  for (const key of ['oauth_pkce', 'legacy_password', 'legacy_pki', 'client_credentials'])
    expect(spec.auth.authStack.some(method => method.key === key)).toBe(true);
});
it('preserves legacy password and PKI input contracts with additive username', () => {
  const password = spec.auth.authStack.find(method => method.key === 'legacy_password');
  const pki = spec.auth.authStack.find(method => method.key === 'legacy_pki');
  if (!password || !pki || !('inputSchema' in password) || !('inputSchema' in pki))
    throw new Error('Missing legacy auth schemas.');
  expect(
    password.inputSchema?.parse({ username: 'schema-user', password: 'schema-password' })
  ).toEqual({ username: 'schema-user', password: 'schema-password' });
  expect(
    pki.inputSchema?.parse({ clientId: 'schema-client', privateKey: 'schema-private-key' })
  ).toEqual({ clientId: 'schema-client', privateKey: 'schema-private-key' });
  expect(record(z.toJSONSchema(pki.inputSchema as z.ZodType)).required).toEqual([
    'clientId',
    'privateKey'
  ]);
});
