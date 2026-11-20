// Watch responses and renewal: https://developers.google.com/workspace/calendar/api/guides/push
// Stopping channels: https://developers.google.com/workspace/drive/api/guides/push#stop-notifications
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  channelRenewAfter,
  createVerifiedChannel,
  isChannelLive,
  registrationChannelId,
  renewalChannelIdentity,
  rotateChannels,
  stopLiveChannels
} from './channel';

let now = Date.parse('2026-11-10T12:00:00Z');
let hour = 60 * 60 * 1000;
let labels = { integration: 'google_example', label: 'Google Example' };
let response = (changes: Record<string, unknown> = {}) => ({
  id: 'channel-1',
  token: 'secret',
  resourceId: 'resource-1',
  resourceUri: 'https://www.googleapis.com/example/v1/things?alt=json',
  expiration: String(now + hour),
  ...changes
});
let create = (changes: Record<string, unknown> = {}, extra = {}) => {
  let stop = vi.fn(async () => {});
  let result = createVerifiedChannel({
    ...labels,
    webhookUrl: 'https://receive.example/hook',
    id: 'channel-1',
    token: 'secret',
    watch: async () => response(changes),
    stop,
    ...extra
  });
  return { result, stop };
};

beforeEach(() => vi.spyOn(Date, 'now').mockReturnValue(now));
afterEach(() => vi.restoreAllMocks());

describe('createVerifiedChannel', () => {
  it('returns the requested channel with its expiry', async () => {
    await expect(create().result).resolves.toEqual({
      id: 'channel-1',
      token: 'secret',
      resourceId: 'resource-1',
      expiresAt: new Date(now + hour).toISOString()
    });
    await expect(
      create({}, { resourceUriMatches: (uri: URL) => uri.pathname === '/example/v1/things' })
        .result
    ).resolves.toMatchObject({ resourceUri: response().resourceUri });
  });

  it.each([
    'http://receive.example/hook',
    'https://user:pass@receive.example/hook',
    'not a url'
  ])('rejects the receive URL %s before watching', async webhookUrl => {
    let watch = vi.fn();
    await expect(
      createVerifiedChannel({
        ...labels,
        webhookUrl,
        id: 'a',
        token: 'b',
        watch,
        stop: vi.fn()
      })
    ).rejects.toThrow('HTTPS receive URL');
    expect(watch).not.toHaveBeenCalled();
  });

  it.each([
    ['another ID', { id: 'other' }],
    ['another token', { token: 'other' }],
    ['a past expiry', { expiration: String(now) }],
    ['an expiry past the lifetime', { expiration: String(now + 3 * hour) }],
    ['an unrepresentable expiry', { expiration: String(9e15) }],
    ['a foreign resource', { resourceUri: 'https://www.googleapis.com/other' }],
    ['a malformed resource path', { resourceUri: 'https://www.googleapis.com/%E0%A4%A' }]
  ])('stops the requested channel when Google returns %s', async (_name, changes) => {
    let { result, stop } = create(changes, {
      maxLifetimeMs: 2 * hour,
      resourceUriMatches: (uri: URL) =>
        decodeURIComponent(uri.pathname) === '/example/v1/things'
    });
    await expect(result).rejects.toMatchObject({
      data: { reason: 'google_example_channel_invalid' }
    });
    expect(stop).toHaveBeenCalledWith('channel-1', 'resource-1');
  });

  it('cannot stop a channel without a resource ID', async () => {
    let { result, stop } = create({ resourceId: '' });
    await expect(result).rejects.toThrow('unexpected notification channel');
    expect(stop).not.toHaveBeenCalled();
    await expect(create({}, { watch: async () => null }).result).rejects.toThrow(
      'unexpected notification channel'
    );
  });
});

describe('channel renewal', () => {
  it('derives the same replacement for a retried operation', () => {
    let previous = { id: 'channel-1', token: 'secret' };
    let first = renewalChannelIdentity(previous, 'operation-1');
    expect(first).toEqual(renewalChannelIdentity(previous, 'operation-1'));
    expect(first.id).toMatch(/^[a-f0-9]{64}$/);
    expect(first.token).toMatch(/^[a-f0-9]{64}$/);
    expect(renewalChannelIdentity(previous, 'operation-2').id).not.toBe(first.id);
  });

  it('derives the token from the saved seed instead of the previous token', () => {
    let seeded = renewalChannelIdentity({ id: 'channel-1', token: 'secret' }, 'op', 'seed');
    expect(seeded).toEqual(
      renewalChannelIdentity({ id: 'channel-1', token: 'leaked' }, 'op', 'seed')
    );
    expect(seeded.token).toMatch(/^[a-f0-9]{64}$/);
    expect(seeded.token).not.toBe(
      renewalChannelIdentity({ id: 'channel-1', token: 'secret' }, 'op').token
    );
    expect(
      renewalChannelIdentity({ id: 'channel-1', token: 'secret' }, 'op', 'other')
    ).not.toEqual(seeded);
  });

  it('requests the same channel for a retried registration operation', () => {
    let id = registrationChannelId('target', 'https://receive.example/hook', 'operation-1');
    expect(id).toMatch(/^[a-f0-9]{64}$/);
    expect(
      registrationChannelId('target', 'https://receive.example/hook', 'operation-1')
    ).toBe(id);
    expect(
      registrationChannelId('target', 'https://receive.example/hook', 'operation-2')
    ).not.toBe(id);
  });

  it('renews before expiry or after a fraction of the remaining lifetime', () => {
    let expiresAt = new Date(now + 10 * hour).toISOString();
    expect(channelRenewAfter(expiresAt, { beforeExpiryMs: hour })).toBe(
      new Date(now + 9 * hour).toISOString()
    );
    expect(channelRenewAfter(expiresAt, { beforeExpiryMs: 24 * hour })).toBe(
      new Date(now).toISOString()
    );
    expect(channelRenewAfter(expiresAt, { lifetimeFraction: 0.8 })).toBe(
      new Date(now + 8 * hour).toISOString()
    );
  });

  it('keeps only unexpired channels', () => {
    let live = { id: 'live', expiresAt: new Date(now + 1).toISOString() };
    let expired = { id: 'expired', expiresAt: new Date(now).toISOString() };
    expect(isChannelLive(live)).toBe(true);
    expect(isChannelLive(expired)).toBe(false);
    expect(rotateChannels([expired], live)).toEqual([live]);
  });

  it('stops every live channel and rethrows the first failure', async () => {
    let channels = ['a', 'b', 'c', 'd'].map((id, index) => ({
      id,
      expiresAt: new Date(now + (index === 3 ? 0 : hour)).toISOString()
    }));
    let stop = vi.fn(async (channel: { id: string }) => {
      if (channel.id !== 'b') throw new Error(`failed ${channel.id}`);
    });
    await expect(stopLiveChannels(channels, stop)).rejects.toThrow('failed a');
    expect(stop.mock.calls.map(([channel]) => channel.id)).toEqual(['a', 'b', 'c']);
    await expect(stopLiveChannels(channels.slice(1, 2), stop)).resolves.toBeUndefined();
  });
});
