import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';

describeMcpCompatibleToolSchemas('LastPass', provider);
describe('LastPass preserved public contracts', () => {
  const keys = [
    'get_users',
    'provision_users',
    'deprovision_user',
    'manage_user',
    'manage_group_membership',
    'get_shared_folders',
    'get_event_report'
  ];
  it('preserves seven public keys without triggers or invented identity', () => {
    expect(
      provider.actions
        .filter(a => a.type === 'tool')
        .map(a => a.key)
        .sort()
    ).toEqual([...keys].sort());
    expect(provider.actions.filter(a => a.type !== 'tool')).toHaveLength(0);
  });
  for (const key of keys)
    it(`${key} has a bounded production ID`, () =>
      expect(`lastpass-${key}`.length).toBeLessThan(60));
});
