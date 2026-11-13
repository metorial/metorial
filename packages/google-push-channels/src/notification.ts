import { skipWebhook, timingSafeStringEqual } from 'slates';
import { type GoogleWatchChannel, isChannelLive } from './channel';

export type GoogleChannelNotification<T extends GoogleWatchChannel> =
  | { ok: true; channel: T; messageNumber: string; resourceState: string | null }
  | { ok: false; skip: ReturnType<typeof skipWebhook> };

/**
 * Authenticates a notification against the saved channels. Google signs nothing, so an
 * authenticated notification is a wakeup hint, never event data.
 */
export let verifyChannelNotification = async <T extends GoogleWatchChannel>(options: {
  integration: string;
  request: Request;
  channels: readonly T[];
  emptyBody?: boolean;
}): Promise<GoogleChannelNotification<T>> => {
  let { request } = options;
  let fail = (what: string, status: number, headers?: Record<string, string>) => ({
    ok: false as const,
    skip: skipWebhook(`${options.integration}_webhook_${what}`, {
      status,
      ...(headers ? { headers } : {})
    })
  });
  if (request.method !== 'POST') return fail('method_not_allowed', 405, { Allow: 'POST' });
  let channelId = request.headers.get('x-goog-channel-id');
  let channel = options.channels.find(candidate => candidate.id === channelId);
  if (!channel) return fail('channel_mismatch', 403);
  if (!timingSafeStringEqual(channel.token, request.headers.get('x-goog-channel-token')))
    return fail('token_invalid', 401);
  // X-Goog-Resource-URI is version-specific; the resource ID is the stable identity.
  if (request.headers.get('x-goog-resource-id') !== channel.resourceId)
    return fail('resource_mismatch', 403);
  if (!isChannelLive(channel)) return fail('channel_expired', 403);
  let messageNumber = request.headers.get('x-goog-message-number');
  if (!messageNumber || !/^[1-9]\d*$/.test(messageNumber)) return fail('message_invalid', 400);
  if (options.emptyBody && (await request.arrayBuffer()).byteLength)
    return fail('body_invalid', 400);
  return {
    ok: true,
    channel,
    messageNumber,
    resourceState: request.headers.get('x-goog-resource-state')
  };
};
