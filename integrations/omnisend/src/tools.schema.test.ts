import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { auth } from './auth';
import original from './compatibility.schemas.json';
import { config } from './config';
import { provider } from './index';

const schema = (value: unknown) => {
  const simplify = (item: unknown): unknown =>
    Array.isArray(item)
      ? item.map(simplify)
      : item !== null && typeof item === 'object'
        ? Object.fromEntries(
            Object.entries(item)
              .filter(([key]) => !['description', '$schema'].includes(key))
              .map(([key, child]) => [key, simplify(child)])
          )
        : item;
  return simplify(z.toJSONSchema(value as z.ZodType, { unrepresentable: 'any' }));
};

describeMcpCompatibleToolSchemas('Omnisend tool input schemas', provider.actions);
describe('Omnisend schema compatibility', () => {
  for (const [key, saved] of Object.entries(original)) {
    it(key + ' retains every original input field, type and requiredness', () => {
      expect(
        schema(provider.actions.find(action => action.key === key)?.inputSchema)
      ).toMatchObject(saved.input);
    });
    it(key + ' retains every original output field, type and requiredness', () => {
      expect(
        schema(provider.actions.find(action => action.key === key)?.outputSchema)
      ).toMatchObject(saved.output);
    });
  }
  it('retains fourteen keys and adds only brand identity and complete replacement', () => {
    expect(provider.actions.map(action => action.key).sort()).toEqual(
      [...Object.keys(original), 'get_brand', 'replace_product'].sort()
    );
    for (const action of provider.actions)
      expect(('omnisend-' + action.key).length).toBeLessThan(60);
    expect(provider.triggerGroups).toHaveLength(0);
  });
  it('keeps API-version selection tool-scoped and both credential methods compatible', () => {
    expect(auth.authStack.map(method => method.key)).toEqual(['oauth', 'api_key']);
    expect(config.configSchema.safeParse({}).success).toBe(true);
    expect(config.configSchema.safeParse({ apiVersion: 'v5' }).success).toBe(true);
    expect(config.configSchema.safeParse({ apiVersion: '2026-03-15' }).success).toBe(true);
    expect(config.configSchema.safeParse({ apiVersion: '2026-preview' }).success).toBe(false);
    const keyMethod = auth.authStack.find(method => method.key === 'api_key');
    expect(schema(keyMethod?.inputSchema)).toMatchObject({
      properties: { token: { type: 'string' } },
      required: ['token']
    });
  });
  it('marks irreversible events and full replacement as effects', () => {
    for (const key of ['send_event', 'replace_product'])
      expect(provider.actions.find(action => action.key === key)?.tags).toMatchObject({
        destructive: true,
        readOnly: false
      });
  });
  it('keeps documented full-replacement update timestamps optional', () => {
    expect(
      schema(provider.actions.find(action => action.key === 'replace_product')?.inputSchema)
    ).toMatchObject({ properties: { updatedAt: { type: 'string' } } });
  });
});
