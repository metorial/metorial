import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { config } from './config';
import { provider } from './index';
import legacy from './legacy-contract.json';

type Schema = {
  type?: string | string[];
  properties?: Record<string, Schema>;
  items?: Schema;
  enum?: unknown[];
};
function preserves(before: Schema, after: Schema) {
  if (before.type) {
    const old = Array.isArray(before.type) ? before.type : [before.type];
    const now = Array.isArray(after.type) ? after.type : [after.type];
    for (const value of old) expect(now).toContain(value);
  }
  if (before.enum) for (const value of before.enum) expect(after.enum).toContain(value);
  for (const [key, value] of Object.entries(before.properties ?? {})) {
    expect(after.properties).toHaveProperty(key);
    preserves(value, after.properties![key]!);
  }
  if (before.items) {
    expect(after.items).toBeDefined();
    preserves(before.items, after.items!);
  }
}
describeMcpCompatibleToolSchemas('Celigo inputs', provider.actions);
describe('Celigo compatibility', () => {
  it('preserves22 legacy keys plus one download and reserved renewal, without triggers', () => {
    expect(provider.actions.map(a => a.key).sort()).toEqual(
      [...Object.keys(legacy), 'download_job_file', 'metorial$getFileUrl'].sort()
    );
    for (const action of provider.actions) {
      expect(action.type).toBe('tool');
      expect(`celigo-${action.key}`.length).toBeLessThan(60);
    }
  });
  it.each(Object.entries(legacy))('preserves recursive legacy fields: %s', (key, contract) => {
    const tool = provider.actions.find(a => a.key === key)!;
    preserves(
      contract.input as Schema,
      tool.inputSchema.toJSONSchema({ unrepresentable: 'any' }) as Schema
    );
    preserves(
      contract.output as Schema,
      tool.outputSchema.toJSONSchema({ unrepresentable: 'any' }) as Schema
    );
  });
  it('retains empty config and legacy regional settings', () => {
    expect(config.configSchema.safeParse({}).success).toBe(true);
    expect(config.configSchema.parse({ region: 'eu' })).toEqual({ region: 'eu' });
  });
  it.each([
    'list_connections',
    'list_flows',
    'list_exports',
    'list_imports',
    'list_integrations'
  ])('accepts native optional paging: %s', key => {
    expect(
      provider.actions
        .find(a => a.key === key)!
        .inputSchema.safeParse({
          limit: 1,
          nextPageUrl: `https://api.eu.integrator.io/v1/${key.slice(5)}?after=opaque%2Fcursor`
        }).success
    ).toBe(true);
  });
  it('preserves opaque IDs without numeric coercion', () => {
    const tool = provider.actions.find(a => a.key === 'get_connection')!;
    expect(tool.inputSchema.parse({ connectionId: '9007199254740993' }).connectionId).toBe(
      '9007199254740993'
    );
    expect(tool.inputSchema.safeParse({ connectionId: 9007199254740992 }).success).toBe(false);
  });
});
