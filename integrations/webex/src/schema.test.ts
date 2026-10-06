import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';

describeMcpCompatibleToolSchemas('Webex schemas', provider.actions);
const legacy = [
  'send_message',
  'get_message',
  'list_messages',
  'edit_message',
  'delete_message',
  'create_space',
  'update_space',
  'delete_space',
  'get_space',
  'list_spaces',
  'add_member',
  'update_member',
  'remove_member',
  'list_memberships',
  'create_meeting',
  'update_meeting',
  'delete_meeting',
  'get_meeting',
  'list_meetings',
  'list_people',
  'get_person',
  'list_recordings',
  'get_recording',
  'list_teams',
  'create_team',
  'delete_team'
];
describe('Legacy and public contracts', () => {
  it('preserves every legacy key and production ID bound', () => {
    const keys = provider.actions.map(action => action.key);
    for (const key of legacy) {
      expect(keys).toContain(key);
      expect(`cisco-webex-${key}`.length).toBeLessThan(60);
    }
    expect(keys).toContain('download_resource_file');
    expect(keys).toContain('metorial$getFileUrl');
    expect(keys).toHaveLength(28);
    expect(provider.actions.every(action => action.type === 'tool')).toBe(true);
  });
  it('preserves optional historical fields and additive native pagination', () => {
    const meeting = provider.actions.find(action => action.key === 'create_meeting');
    expect(meeting).toBeDefined();
    const schema = z.toJSONSchema(meeting!.inputSchema);
    expect(schema.required).not.toContain('start');
    expect(schema.required).not.toContain('end');
    for (const key of [
      'list_messages',
      'list_spaces',
      'list_memberships',
      'list_people',
      'list_meetings',
      'list_recordings',
      'list_teams'
    ]) {
      const action = provider.actions.find(action => action.key === key)!;
      expect(z.toJSONSchema(action.inputSchema).properties).toHaveProperty('nextPageUrl');
      expect(z.toJSONSchema(action.outputSchema).properties).toHaveProperty('nextPageUrl');
    }
  });
});
