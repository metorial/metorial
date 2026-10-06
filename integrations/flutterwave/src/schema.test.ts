import { ServiceError } from '@lowerdeck/error';
import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { auth } from './auth';
import { provider } from './index';
import legacy from './legacy-contracts.json';

describeMcpCompatibleToolSchemas('Flutterwave tool input schemas', provider.actions);
type Schema = Record<string, any>;
const compatible = (current: Schema, old: Schema): void => {
  for (const [key, value] of Object.entries(old)) {
    if (['description', '$schema', 'additionalProperties'].includes(key)) continue;
    if (key === 'properties') {
      for (const [field, schema] of Object.entries(value as Schema))
        compatible(current.properties[field], schema as Schema);
    } else if (key === 'required') {
      for (const field of current.required ?? []) expect(value).toContain(field);
    } else if (key === 'enum') {
      for (const choice of value as unknown[]) expect(current.enum).toContain(choice);
    } else if (key === 'items') compatible(current.items, value as Schema);
    else if (typeof value === 'object' && value !== null && !Array.isArray(value))
      compatible(current[key], value as Schema);
    else expect(current[key]).toEqual(value);
  }
};
describe('Original public schema and auth deprecation contracts', () => {
  for (const [key, original] of Object.entries(legacy)) {
    it(`preserves ${key} input/output field types and optionality`, () => {
      const tool = provider.actions.find(
        action => action.type === 'tool' && action.key === key
      );
      if (!tool || tool.type !== 'tool') throw new Error('An original tool is missing.');
      compatible(tool.inputSchema.toJSONSchema({ unrepresentable: 'any' }), original.input);
      compatible(tool.outputSchema.toJSONSchema({ unrepresentable: 'any' }), original.output);
    });
  }
  it('retains all 16 original keys and exactly two essential reads', () => {
    const tools = provider.actions.filter(action => action.type === 'tool');
    expect(Object.keys(legacy)).toHaveLength(16);
    expect(tools).toHaveLength(18);
    expect(tools.map(tool => tool.key)).toEqual(
      expect.arrayContaining(['get_virtual_account', 'get_bill_payment'])
    );
    for (const tool of tools) expect(`flutterwave-${tool.key}`.length).toBeLessThan(60);
  });
  it('preserves both auth keys and the original token/Secret Key schemas', () => {
    expect(auth.authStack.map(method => method.key)).toEqual(['secret_key', 'oauth_v4']);
    expect(auth.outputSchema.toJSONSchema().properties?.token).toMatchObject({
      type: 'string'
    });
    const secret = auth.authStack.find(method => method.key === 'secret_key');
    expect(secret?.inputSchema?.toJSONSchema().required).toEqual(['secretKey']);
    const retained = auth.authStack.find(method => method.key === 'oauth_v4');
    expect(retained?.name).toMatch(/Deprecated/);
    expect(retained?.type).toBe('auth.oauth');
  });
  it('deprecated v4 callbacks refuse locally with explicit v3 remediation', async () => {
    const retained = auth.authStack.find(method => method.key === 'oauth_v4');
    if (!retained || retained.type !== 'auth.oauth')
      throw new Error('Retained auth contract missing.');
    for (const callback of [
      retained.getAuthorizationUrl,
      retained.handleCallback,
      retained.handleTokenRefresh
    ]) {
      if (!callback) throw new Error('Retained deprecation callback missing.');
      await expect(callback({} as never)).rejects.toBeInstanceOf(ServiceError);
      await expect(callback({} as never)).rejects.toThrow(/Reconnect.*API v3 Secret Key/);
    }
  });
});
