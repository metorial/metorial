import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';

// These contracts protect public registration and schema compatibility; provider
// behavior requires live verification and is not mocked here.
describeMcpCompatibleToolSchemas('Heartbeat tool input schemas', provider.actions);

let replacements = {
  create_member: 'provision_member',
  update_member: 'edit_member_profile',
  create_channel: 'create_community_channel',
  create_event: 'schedule_event',
  get_recent_posts: 'list_channel_threads'
};

describe('Heartbeat deprecated tool registration', () => {
  for (let [legacy, replacement] of Object.entries(replacements)) {
    it(`keeps ${legacy} and its ${replacement} replacement registered`, () => {
      let original = provider.actions.find(action => action.key === legacy);
      let current = provider.actions.find(action => action.key === replacement);
      expect(original).toBeDefined();
      expect(original?.tags?.deprecated).toBe(true);
      expect(current).toBeDefined();
      expect(current?.tags?.deprecated).not.toBe(true);
    });
  }

  it('keeps the original repaired tools active', () => {
    for (let key of [
      'find_user',
      'list_members',
      'deactivate_member',
      'manage_group',
      'list_groups',
      'create_thread',
      'create_comment',
      'list_channels'
    ]) {
      let action = provider.actions.find(action => action.key === key);
      expect(action).toBeDefined();
      expect(action?.tags?.deprecated).not.toBe(true);
    }
  });
});
