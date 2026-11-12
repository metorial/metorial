import { createHash, createHmac, randomBytes } from 'node:crypto';
import { createApiServiceError } from 'slates';
import { z } from 'zod';

/** A Google push notification channel as saved in a webhook registration. */
export let googleWatchChannelSchema = z.object({
  id: z.string().min(1).max(64),
  token: z.string().min(1),
  resourceId: z.string().min(1),
  expiresAt: z.iso.datetime()
});
export type GoogleWatchChannel = z.infer<typeof googleWatchChannelSchema>;

/** The fields of a provider watch response this package checks. */
export interface GoogleWatchResponse {
  id?: unknown;
  token?: unknown;
  resourceId?: unknown;
  resourceUri?: unknown;
  expiration?: unknown;
}

export interface GoogleWatchChannelLabels {
  /** Prefix for error reasons, such as `google_calendar`. */
  integration: string;
  /** Provider name used in user-facing messages, such as `Google Calendar`. */
  label: string;
}

export interface CreateGoogleWatchChannelOptions extends GoogleWatchChannelLabels {
  webhookUrl: string;
  id: string;
  token: string;
  /** Rejects a channel that expires later than this from now. */
  maxLifetimeMs?: number;
  /** Starts the watch with `id`, `token` and `webhookUrl`. */
  watch: () => Promise<GoogleWatchResponse | null | undefined>;
  /** Stops a channel the provider returned in an unexpected configuration. */
  stop: (id: string, resourceId: string) => Promise<unknown>;
}

export let newGoogleWatchChannelToken = () => randomBytes(32).toString('hex');

let assertReceiveUrl = (webhookUrl: string, labels: GoogleWatchChannelLabels) => {
  let url: URL | undefined;
  try {
    url = new URL(webhookUrl);
  } catch {}
  if (!url || url.protocol !== 'https:' || url.username || url.password)
    throw createApiServiceError(
      `${labels.label} notifications require an HTTPS receive URL without credentials.`,
      { reason: `${labels.integration}_webhook_url_invalid` }
    );
};

let resourceUriAccepted = (value: unknown, matches: (uri: URL) => boolean) => {
  if (typeof value !== 'string' || !z.url().safeParse(value).success) return false;
  try {
    return matches(new URL(value));
  } catch {
    // Invalid percent-encoding is an invalid provider response.
    return false;
  }
};

/**
 * Starts a watch and checks that Google created exactly the requested channel: the same
 * ID and token, a resource ID, an expiry in the future (and within `maxLifetimeMs`), and
 * when `resourceUriMatches` is given, the watched resource. A mismatched channel is
 * stopped by the requested ID, never by an unrelated returned ID.
 */
export async function createVerifiedChannel(
  options: CreateGoogleWatchChannelOptions & { resourceUriMatches: (uri: URL) => boolean }
): Promise<GoogleWatchChannel & { resourceUri: string }>;
export async function createVerifiedChannel(
  options: CreateGoogleWatchChannelOptions
): Promise<GoogleWatchChannel>;
export async function createVerifiedChannel(
  options: CreateGoogleWatchChannelOptions & { resourceUriMatches?: (uri: URL) => boolean }
): Promise<GoogleWatchChannel & { resourceUri?: string }> {
  assertReceiveUrl(options.webhookUrl, options);
  // A malformed (even empty) watch response is an unexpected channel, not a crash.
  let response: GoogleWatchResponse = (await options.watch()) ?? {};
  let expiration = Number(response.expiration);
  let now = Date.now();
  let resourceId =
    typeof response.resourceId === 'string' && response.resourceId
      ? response.resourceId
      : undefined;
  if (
    response.id !== options.id ||
    response.token !== options.token ||
    !resourceId ||
    (options.resourceUriMatches &&
      !resourceUriAccepted(response.resourceUri, options.resourceUriMatches)) ||
    !Number.isSafeInteger(expiration) ||
    !Number.isFinite(new Date(expiration).getTime()) ||
    expiration <= now ||
    (options.maxLifetimeMs !== undefined && expiration > now + options.maxLifetimeMs)
  ) {
    if (resourceId) await options.stop(options.id, resourceId);
    throw createApiServiceError(
      `${options.label} returned an unexpected notification channel configuration.`,
      { reason: `${options.integration}_channel_invalid` }
    );
  }
  return {
    id: options.id,
    token: options.token,
    resourceId,
    expiresAt: new Date(expiration).toISOString(),
    ...(options.resourceUriMatches ? { resourceUri: response.resourceUri as string } : {})
  };
}

/**
 * The channel ID for one registration operation. Retrying the same operation requests
 * the same channel instead of creating another one.
 */
export let registrationChannelId = (
  targetIdentifier: string,
  webhookUrl: string,
  operationId: string
) =>
  createHash('sha256')
    .update(JSON.stringify([targetIdentifier, webhookUrl, operationId]))
    .digest('hex');

/**
 * The replacement channel for one renewal operation. Retrying the same operation derives
 * the same ID and token, so a lost watch response never creates a second channel.
 *
 * `tokenSeed` is a secret saved with the registration and never sent to Google, so a
 * leaked channel token does not reveal the tokens that follow it. A registration saved
 * without a seed derives its next token from the previous one.
 */
export let renewalChannelIdentity = (
  previous: Pick<GoogleWatchChannel, 'id' | 'token'>,
  operationId: string,
  tokenSeed?: string
) => ({
  id: createHash('sha256')
    .update(JSON.stringify([previous.id, operationId]))
    .digest('hex'),
  token: createHmac('sha256', tokenSeed ?? previous.token)
    .update(operationId)
    .digest('hex')
});

export type GoogleWatchRenewWindow = { beforeExpiryMs: number } | { lifetimeFraction: number };

/** When to renew a channel: a fixed time before expiry, or after a fraction of its remaining life. */
export let channelRenewAfter = (expiresAt: string, window: GoogleWatchRenewWindow) => {
  let now = Date.now();
  let expiration = Date.parse(expiresAt);
  let renewAt =
    'beforeExpiryMs' in window
      ? Math.max(now, expiration - window.beforeExpiryMs)
      : now + Math.max(0, (expiration - now) * window.lifetimeFraction);
  return new Date(renewAt).toISOString();
};

export let isChannelLive = (channel: { expiresAt: string }) =>
  Date.parse(channel.expiresAt) > Date.now();

/** The channels still to accept after `replaced` was renewed: every unexpired one. */
export let rotateChannels = <T extends { expiresAt: string }>(
  previous: readonly T[],
  replaced: T
) => [...previous, replaced].filter(isChannelLive);

/**
 * Stops every unexpired channel. Google has no channel read or list API, so a failed
 * stop (including a 404) cannot prove removal: the first failure is rethrown after
 * the other channels were attempted, keeping cleanup retryable.
 */
export let stopLiveChannels = async <T extends { expiresAt: string }>(
  channels: readonly T[],
  stop: (channel: T) => Promise<unknown>
) => {
  let failures: unknown[] = [];
  for (let channel of channels) {
    if (!isChannelLive(channel)) continue;
    try {
      await stop(channel);
    } catch (error) {
      failures.push(error);
    }
  }
  if (failures.length) throw failures[0];
};
