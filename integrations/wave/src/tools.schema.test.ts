import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { auth } from './auth';
import original from './compatibility.schemas.json';
import { config } from './config';
import { provider } from './index';

const simplify = (value: unknown): unknown =>
  Array.isArray(value)
    ? value.map(simplify)
    : value && typeof value === 'object'
      ? Object.fromEntries(
          Object.entries(value)
            .filter(([key]) => !['description', '$schema'].includes(key))
            .map(([key, v]) => [key, simplify(v)])
        )
      : value;
const schema = (value: z.ZodType, input = false) =>
  simplify(z.toJSONSchema(value, { io: input ? 'input' : 'output', unrepresentable: 'any' }));
describeMcpCompatibleToolSchemas('Wave input schemas', provider.actions);
describe('Wave compatibility and bounded capabilities', () => {
  for (const [key, saved] of Object.entries(original)) {
    it(`${key} retains input fields, types and requiredness`, () => {
      const action = provider.actions.find(action => action.key === key)!;
      expect(schema(action.inputSchema, true)).toMatchObject(saved.input);
      expect(
        z.record(z.string(), z.unknown()).parse(schema(action.inputSchema, true)).required ??
          []
      ).toEqual(z.record(z.string(), z.unknown()).parse(saved.input).required ?? []);
    });
    it(`${key} retains output fields and types`, () =>
      expect(
        schema(provider.actions.find(action => action.key === key)!.outputSchema)
      ).toMatchObject(saved.output));
  }
  it('retains 28 keys and the two approved additions with no triggers', () => {
    expect(provider.actions.map(action => action.key).sort()).toEqual(
      [...Object.keys(original), 'get_resource', 'get_invoice_pdf'].sort()
    );
    for (const action of provider.actions)
      expect(`wave-${action.key}`.length).toBeLessThan(60);
    expect(provider.triggerGroups).toHaveLength(0);
  });
  it('preserves OAuth and adds documented owner-token authentication', () => {
    expect(auth.authStack.map(method => method.key)).toEqual(['oauth', 'access_token']);
    const oauth = auth.authStack.find(method => method.type === 'auth.oauth');
    if (!oauth || oauth.type !== 'auth.oauth') throw new Error('OAuth missing.');
    expect(oauth.scopes?.map(scope => scope.scope)).toContain('invoice:send');
    expect(oauth.scopes?.map(scope => scope.scope)).not.toContain('transaction:read');
    expect(config.configSchema.parse({})).toEqual({});
  });
  it('marks exact reads and PDF delivery as reads', () => {
    for (const key of ['get_resource', 'get_invoice_pdf'])
      expect(provider.actions.find(action => action.key === key)?.tags?.readOnly).toBe(true);
  });
});
