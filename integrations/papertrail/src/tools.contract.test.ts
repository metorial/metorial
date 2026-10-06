import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import { getAccountUsage, getUsage } from './tools';

describeMcpCompatibleToolSchemas('Papertrail tool input schemas', provider.actions);
it('preserves the unsupported legacy account contract and exposes documented usage', () => {
  expect(provider.actions).toContain(getAccountUsage);
  expect(provider.actions).toContain(getUsage);
  expect(getAccountUsage.tags).toMatchObject({ deprecated: true });
  expect(
    getAccountUsage.description?.startsWith('DEPRECATED — use `get_usage` instead.')
  ).toBe(true);
  const schema = z.toJSONSchema(getAccountUsage.outputSchema);
  expect(schema.required).toEqual(['accountId', 'name']);
  expect(schema.properties?.accountId).toMatchObject({ type: 'number' });
  expect(schema.properties?.name).toMatchObject({ type: 'string' });
  expect(
    getAccountUsage.instructions?.some(instruction => instruction.includes('get_usage'))
  ).toBe(true);
});
it('retains legacy numeric schema types and keeps every public ID below 60 characters', () => {
  for (const tool of provider.actions) {
    expect(`papertrail-${tool.key}`.length).toBeLessThan(60);
    expect(JSON.stringify(z.toJSONSchema(tool.inputSchema)), tool.key).not.toContain(
      '"type":"integer"'
    );
    expect(JSON.stringify(z.toJSONSchema(tool.outputSchema)), tool.key).not.toContain(
      '"type":"integer"'
    );
  }
});
