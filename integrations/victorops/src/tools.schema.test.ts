import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';

describeMcpCompatibleToolSchemas('VictorOps tool input schemas', provider.actions);
describe('VictorOps historical schema contracts', () => {
  it('preserves the original tool keys and ID limits', () => {
    const keys = new Set(provider.actions.map(action => action.key));
    for (const key of [
      'list_incidents',
      'create_incident',
      'manage_incident',
      'manage_incident_notes',
      'get_on_call',
      'create_on_call_override',
      'manage_user',
      'manage_team',
      'manage_escalation_policy',
      'manage_routing_keys',
      'manage_maintenance_mode',
      'search_incident_history',
      'send_chat_message',
      'get_team_rotations',
      'get_shift_log'
    ])
      expect(keys.has(key)).toBe(true);
    expect(provider.actions).toHaveLength(18);
    for (const action of provider.actions)
      expect(`victorops-${action.key}`.length).toBeLessThan(60);
  });
  it('keeps historical number inputs as number schemas', () => {
    for (const [key, path] of [
      ['get_on_call', ['properties', 'daysForward']],
      ['get_on_call', ['properties', 'daysSkip']],
      ['manage_escalation_policy', ['properties', 'steps', 'items', 'properties', 'timeout']],
      ['search_incident_history', ['properties', 'offset']],
      ['search_incident_history', ['properties', 'limit']]
    ] as const) {
      const action = provider.actions.find(action => action.key === key);
      if (!action || action.type !== 'tool') throw new Error(`Missing historical tool ${key}`);
      let field: unknown = z.toJSONSchema(action.inputSchema);
      for (const segment of path)
        field = z.record(z.string(), z.unknown()).parse(field)[segment];
      expect(z.object({ type: z.literal('number') }).safeParse(field).success).toBe(true);
    }
  });
});
