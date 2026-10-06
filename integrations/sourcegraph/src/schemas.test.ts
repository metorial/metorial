import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';

describeMcpCompatibleToolSchemas('Sourcegraph input schemas', provider.actions);
describe('Sourcegraph preserved registration contracts', () => {
  it('retains all fourteen public keys without triggers or reserved actions', () => {
    expect(
      provider.actions
        .filter(action => action.type === 'tool')
        .map(action => action.key)
        .sort()
    ).toEqual(
      [
        'search_code',
        'get_file_content',
        'list_repositories',
        'get_repository',
        'list_batch_changes',
        'get_batch_change',
        'close_batch_change',
        'list_code_insights',
        'create_code_insight',
        'delete_code_insight',
        'list_code_monitors',
        'create_code_monitor',
        'delete_code_monitor',
        'get_current_user'
      ].sort()
    );
    expect(
      provider.actions.every(
        action => action.type === 'tool' && `sourcegraph-${action.key}`.length < 60
      )
    ).toBe(true);
  });
});
