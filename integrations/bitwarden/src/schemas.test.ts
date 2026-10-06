import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';

describeMcpCompatibleToolSchemas('Bitwarden tool schemas', provider.actions);
describe('Retained organization API contracts', () => {
  it('retains all legacy keys and only the approved native reads', () => {
    expect(provider.actions.map(action => action.key).sort()).toEqual(
      [
        'list_members',
        'get_member',
        'invite_member',
        'update_member',
        'remove_member',
        'reinvite_member',
        'revoke_restore_member',
        'list_groups',
        'get_group',
        'create_group',
        'update_group',
        'delete_group',
        'list_collections',
        'update_collection',
        'delete_collection',
        'list_policies',
        'update_policy',
        'query_events',
        'import_organization',
        'get_collection',
        'get_policy'
      ].sort()
    );
    expect(provider.actions.every(action => `bitwarden-${action.key}`.length < 60)).toBe(true);
  });
});
