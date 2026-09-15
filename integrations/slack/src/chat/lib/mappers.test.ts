import { describe, expect, it, vi } from 'vitest';
import type { SlackClient } from '../../lib/client';
import type { SlackAuthIdentity, SlackConversation } from '../../lib/types';
import { hydrateSlackChannel, mapSlackChannel } from './mappers';

let identity: SlackAuthIdentity = { user_id: 'U_SELF', team_id: 'T1' };

describe('Slack channel mapping', () => {
  it('maps explicit membership and defaults missing membership to access', () => {
    expect(mapSlackChannel({ id: 'C1', is_channel: true, is_member: false }).hasAccess).toBe(
      false
    );
    expect(mapSlackChannel({ id: 'C2', is_channel: true }).hasAccess).toBe(true);
  });

  it('hydrates a DM recipient and uses their full name as the channel name', async () => {
    let getUserInfo = vi.fn().mockResolvedValue({
      id: 'U1',
      name: 'ada',
      real_name: 'Ada Lovelace'
    });
    let client = { getUserInfo } as unknown as SlackClient;
    let channel: SlackConversation = { id: 'D1', is_im: true, user: 'U1' };

    let mapped = await hydrateSlackChannel(client, channel, identity, 'T1');

    expect(mapped).toMatchObject({
      type: 'dm',
      name: 'Ada Lovelace',
      hasAccess: true,
      recipient: {
        userId: 'U1',
        userName: 'ada',
        fullName: 'Ada Lovelace',
        isMe: false
      }
    });
  });

  it('falls back to the recipient id when profile hydration fails', async () => {
    let client = {
      getUserInfo: vi.fn().mockRejectedValue(new Error('user unavailable'))
    } as unknown as SlackClient;

    let mapped = await hydrateSlackChannel(client, { id: 'D1' }, identity, 'T1', 'U1');

    expect(mapped).toMatchObject({
      type: 'dm',
      name: 'U1',
      recipient: { userId: 'U1', fullName: 'U1' }
    });
  });

  it('does not attach a singular recipient to non-DM channels', async () => {
    let getUserInfo = vi.fn();
    let client = { getUserInfo } as unknown as SlackClient;

    let mapped = await hydrateSlackChannel(
      client,
      { id: 'G1', is_mpim: true },
      identity,
      'T1'
    );

    expect(mapped.type).toBe('group_dm');
    expect(mapped.recipient).toBeUndefined();
    expect(getUserInfo).not.toHaveBeenCalled();
  });
});
