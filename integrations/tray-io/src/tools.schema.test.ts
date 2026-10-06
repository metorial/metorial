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
    const current = Array.isArray(after.type) ? after.type : [after.type];
    for (const type of old) expect(current).toContain(type);
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
describeMcpCompatibleToolSchemas('Tray tool inputs', provider.actions);
describe('Tray compatibility contracts', () => {
  it('preserves all legacy keys with only two approved additions and no triggers', () => {
    expect(provider.actions.map(a => a.key).sort()).toEqual(
      [...Object.keys(legacy), 'get_current_context', 'get_resource'].sort()
    );
    for (const a of provider.actions) {
      expect(a.type).toBe('tool');
      expect(`trayio-${a.key}`.length).toBeLessThan(60);
    }
  });
  it.each(
    Object.entries(legacy)
  )('preserves recursively typed legacy fields: %s', (key, contract) => {
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
  it('allows empty config for auth-owned region and legacy saved settings', () => {
    expect(config.configSchema.safeParse({}).success).toBe(true);
    expect(config.configSchema.parse({ region: 'eu' })).toEqual({ region: 'eu' });
  });
  it.each([
    'list_users',
    'list_solutions',
    'list_solution_instances',
    'list_authentications'
  ])('adds native optional cursors to %s', key => {
    const tool = provider.actions.find(a => a.key === key)!;
    expect(tool.inputSchema.safeParse({ first: 1, after: 'opaque+/cursor==' }).success).toBe(
      true
    );
  });
  it('retains string IDs without numeric coercion', () => {
    const tool = provider.actions.find(a => a.key === 'get_solution_instance')!;
    expect(
      tool.inputSchema.parse({ solutionInstanceId: '9007199254740993' }).solutionInstanceId
    ).toBe('9007199254740993');
    expect(tool.inputSchema.safeParse({ solutionInstanceId: 9007199254740992 }).success).toBe(
      false
    );
  });
});
