import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import legacyInputs from './legacy-input-contracts.json';
import legacyOutputs from './legacy-output-contracts.json';
import { spec } from './spec';

describeMcpCompatibleToolSchemas('Superhuman Gmail input schemas', provider.actions);
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
const preserve = (before: unknown, after: unknown, relaxRequired: boolean) => {
  const previous = record(before),
    current = record(after);
  for (const [key, value] of Object.entries(previous)) {
    if (key === 'properties') {
      const fields = record(current.properties);
      for (const [field, schema] of Object.entries(record(value)))
        preserve(schema, fields[field], relaxRequired);
    } else if (key === 'items') preserve(value, current.items, relaxRequired);
    else if (key !== 'required') expect(current[key]).toEqual(value);
  }
  if (relaxRequired)
    for (const field of z.array(z.string()).parse(current.required ?? []))
      expect(previous.required ?? []).toContain(field);
  else expect(current.required ?? []).toEqual(previous.required ?? []);
};
it.each(Object.entries(legacyInputs))('preserves historical %s input', (key, schema) => {
  const action = provider.actions.find(action => action.key === key);
  expect(action).toBeDefined();
  preserve(
    canonical(schema),
    canonical(z.toJSONSchema(action?.inputSchema as z.ZodType)),
    false
  );
});
it.each(
  Object.entries(legacyOutputs)
)('retains %s output fields with documented optionality', (key, schema) => {
  const action = provider.actions.find(action => action.key === key);
  expect(action).toBeDefined();
  preserve(
    canonical(schema),
    canonical(z.toJSONSchema(action?.outputSchema as z.ZodType)),
    true
  );
});
it('retains original keys, adds only profile/download and has no triggers', () => {
  expect(provider.actions.map(action => action.key).sort()).toEqual(
    [
      'download_attachment',
      'get_profile',
      'search_conversations',
      'get_conversation_context',
      'triage_conversation',
      'manage_reply_draft',
      'send_reply'
    ].sort()
  );
  for (const action of provider.actions)
    expect(`superhuman-gmail-${action.key}`.length).toBeLessThan(60);
  expect(provider.actions.filter(action => action.type === 'trigger')).toHaveLength(0);
  expect(provider.triggerGroups).toHaveLength(0);
});
it('preserves old stored auth and the default mailbox selection', () => {
  expect(
    spec.authSchema.parse({ token: 'schema-token', refreshToken: 'schema-refresh' })
  ).toEqual({ token: 'schema-token', refreshToken: 'schema-refresh' });
  expect(spec.configSchema.parse({})).toEqual({ userId: 'me' });
});
it('keeps the Google auth key and requests distinct nonduplicate permission tiers', () => {
  expect(spec.auth.authStack.map(method => method.key)).toEqual([
    'google_oauth',
    'google_oauth_readonly',
    'google_oauth_full_access'
  ]);
  const expected = [
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://mail.google.com/'
  ];
  for (const [index, method] of spec.auth.authStack.entries()) {
    if (!('scopes' in method)) throw new Error('Expected OAuth method.');
    expect(method.scopes.map(scope => scope.scope)).toEqual([expected[index]]);
  }
});
