import { assertNewPageToken, SlateTrigger, triggerGroup } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { youtubeServiceError } from '../lib/errors';
import { youtubeActionScopes } from '../scopes';
import { spec } from '../spec';
import {
  type UploadActivityEvent,
  uploadActivityEventSchema,
  uploadActivityId,
  uploadActivityOutputSchema,
  youtubeResourceIdSchema,
  youtubeTimestampSchema
} from './event-schemas';

const OVERLAP_MS = 60 * 60 * 1000;
const MAX_PAGES = 100;
const MAX_CHANNELS = 100;
const MAX_SEEN_VIDEOS = 10_000;
const MISSING_CHANNEL_RETENTION_MS = 24 * 60 * 60 * 1000;
const MIN_SCAN_WINDOW_MS = 60 * 1000;

const channelSchema = z.object({ id: youtubeResourceIdSchema });
const activitySchema = z.object({
  id: youtubeResourceIdSchema,
  snippet: z.object({
    type: z.string().min(1),
    channelId: youtubeResourceIdSchema,
    publishedAt: youtubeTimestampSchema,
    title: z.string().optional(),
    description: z.string().optional()
  }),
  contentDetails: z
    .object({
      upload: z.object({ videoId: youtubeResourceIdSchema }).optional()
    })
    .optional()
});
const seenVideoSchema = z.object({
  videoId: youtubeResourceIdSchema,
  publishedAt: youtubeTimestampSchema
});
const channelStateSchema = z.object({
  channelId: youtubeResourceIdSchema,
  activatedAt: youtubeTimestampSchema,
  checkpoint: youtubeTimestampSchema,
  scanUntil: youtubeTimestampSchema.optional(),
  seenVideos: z.array(seenVideoSchema).max(MAX_SEEN_VIDEOS)
});
const stateSchema = z
  .object({
    version: z.literal(1),
    channels: z.array(channelStateSchema).max(MAX_CHANNELS)
  })
  .strict();
type UploadState = z.infer<typeof stateSchema>;
type Auth = Parameters<typeof Client.fromAuth>[0];
type ChannelState = z.infer<typeof channelStateSchema>;
type ScanBudget = { pages: number; exhausted?: boolean };

function oauthClient(auth: Auth) {
  if (auth.authType === 'apiKey' || auth.apiKey || !auth.token) {
    throw youtubeServiceError(
      'Upload activity events require an OAuth connection to the channel owner. API keys do not identify an owned channel.'
    );
  }
  return Client.fromAuth(auth);
}

async function* pages<T>(
  itemSchema: z.ZodType<T>,
  kind: 'youtube#channelListResponse' | 'youtube#activityListResponse',
  fetchPage: (pageToken?: string) => Promise<unknown>,
  budget: ScanBudget
) {
  const pageSchema = z.object({
    kind: z.literal(kind),
    items: z.array(itemSchema).max(50).optional(),
    nextPageToken: z.string().min(1).optional()
  });
  const tokens = new Set<string>();
  let pageToken: string | undefined;
  do {
    if (budget.pages >= MAX_PAGES) {
      budget.exhausted = true;
      return;
    }
    budget.pages += 1;
    const parsed = pageSchema.safeParse(await fetchPage(pageToken));
    if (!parsed.success) {
      throw youtubeServiceError(
        'YouTube returned an invalid upload activity listing. No checkpoint was advanced.'
      );
    }
    yield* parsed.data.items ?? [];
    pageToken = parsed.data.nextPageToken;
    assertNewPageToken(tokens, pageToken, () =>
      youtubeServiceError('YouTube repeated a pagination token. No checkpoint was advanced.')
    );
  } while (pageToken);
}

async function ownedChannelIds(client: Client, budget: ScanBudget) {
  const ids = new Set<string>();
  for await (const channel of pages(
    channelSchema,
    'youtube#channelListResponse',
    pageToken =>
      client.listChannels({
        part: ['id'],
        mine: true,
        maxResults: 50,
        pageToken
      }),
    budget
  )) {
    ids.add(channel.id);
    if (ids.size > MAX_CHANNELS) {
      throw youtubeServiceError(
        'Upload activity events support at most 100 owned channels per connection.'
      );
    }
  }
  if (budget.exhausted)
    throw youtubeServiceError('The owned channel listing exceeded 100 pages.');
  return [...ids].sort();
}

function readState(value: unknown, now: number): UploadState {
  if (value == null) return { version: 1, channels: [] };
  const parsed = stateSchema.safeParse(value);
  if (!parsed.success) {
    throw youtubeServiceError(
      'The saved upload activity checkpoint is invalid. Restore the saved state or explicitly reset the subscription to start a new silent baseline.'
    );
  }
  const ids = new Set<string>();
  let seenCount = 0;
  for (const channel of parsed.data.channels) {
    const activatedAt = Date.parse(channel.activatedAt);
    const checkpoint = Date.parse(channel.checkpoint);
    if (ids.has(channel.channelId) || activatedAt > checkpoint || checkpoint > now) {
      throw youtubeServiceError(
        'The saved upload activity checkpoint has duplicate channels or inconsistent dates. No checkpoint was advanced.'
      );
    }
    ids.add(channel.channelId);
    const videos = new Set<string>();
    for (const video of channel.seenVideos) {
      const publishedAt = Date.parse(video.publishedAt);
      if (
        videos.has(video.videoId) ||
        publishedAt <= activatedAt ||
        publishedAt >= checkpoint
      ) {
        throw youtubeServiceError(
          'The saved upload activity identities are inconsistent. No checkpoint was advanced.'
        );
      }
      videos.add(video.videoId);
    }
    seenCount += channel.seenVideos.length;
  }
  if (seenCount > MAX_SEEN_VIDEOS)
    throw youtubeServiceError('The saved upload activity identity set exceeds 10000 videos.');
  return parsed.data;
}

export const uploadActivities = triggerGroup(spec, {
  key: 'upload_activities',
  name: 'Owned Channel Upload Activities',
  description:
    'Checks owned channels every 15 minutes for new upload activities after a silent initial baseline.',
  eventSchema: uploadActivityEventSchema
})
  .polling({
    intervalSeconds: 900,
    pollEvents: async ctx => {
      const client = oauthClient(ctx.auth);
      const now = Date.now();
      const observedAt = new Date(now).toISOString();
      const previous = readState(ctx.input.state, now);
      const previousChannels = new Map(
        previous.channels.map(channel => [channel.channelId, channel])
      );
      const channelIds = await ownedChannelIds(client, { pages: 0 });
      const budget: ScanBudget = { pages: 0 };
      const channels = new Map<string, ChannelState>();
      const events = new Map<
        string,
        { payload: UploadActivityEvent; idempotencyKey: string }
      >();
      const checkpointOf = (channelId: string) =>
        Date.parse(previousChannels.get(channelId)?.checkpoint ?? observedAt);

      // Oldest checkpoint first, so a channel the page budget deferred is read first next time.
      const ordered = [...channelIds].sort((a, b) => checkpointOf(a) - checkpointOf(b));
      for (const channelId of ordered) {
        const prior = previousChannels.get(channelId);
        if (!prior) {
          channels.set(channelId, {
            channelId,
            activatedAt: observedAt,
            checkpoint: observedAt,
            seenVideos: []
          });
          continue;
        }
        if (budget.exhausted) {
          channels.set(channelId, prior);
          continue;
        }
        const hadFullBudget = budget.pages === 0;
        const channelEvents: { payload: UploadActivityEvent; idempotencyKey: string }[] = [];
        const activatedAt = Date.parse(prior.activatedAt);
        const checkpoint = Date.parse(prior.checkpoint);
        const scanUntil = prior.scanUntil ? Date.parse(prior.scanUntil) : undefined;
        // A large backlog is read in consecutive windows without overlap.
        const catchingUp =
          scanUntil !== undefined && scanUntil > checkpoint && scanUntil < now;
        const earliest = catchingUp
          ? checkpoint
          : Math.max(activatedAt, checkpoint - OVERLAP_MS);
        const windowEnd = catchingUp ? scanUntil : now;
        const windowEndAt = new Date(windowEnd).toISOString();
        const seen = new Map(prior.seenVideos.map(video => [video.videoId, video]));
        for await (const activity of pages(
          activitySchema,
          'youtube#activityListResponse',
          pageToken =>
            client.listActivities({
              part: ['snippet', 'contentDetails'],
              channelId,
              maxResults: 50,
              pageToken,
              publishedAfter: new Date(earliest).toISOString(),
              publishedBefore: windowEndAt
            }),
          budget
        )) {
          if (activity.snippet.channelId !== channelId) {
            throw youtubeServiceError(
              'YouTube returned activity for a different channel. No checkpoint was advanced.'
            );
          }
          if (activity.snippet.type !== 'upload') continue;
          const videoId = activity.contentDetails?.upload?.videoId;
          if (!videoId)
            throw youtubeServiceError(
              'YouTube returned an upload activity without its video ID. No checkpoint was advanced.'
            );
          const publishedAt = Date.parse(activity.snippet.publishedAt);
          if (publishedAt <= activatedAt || publishedAt < earliest || publishedAt >= windowEnd)
            continue;
          if (seen.has(videoId)) continue;
          seen.set(videoId, { videoId, publishedAt: activity.snippet.publishedAt });
          const payload: UploadActivityEvent = {
            type: 'video.uploaded',
            activityId: activity.id,
            channelId,
            videoId,
            title: activity.snippet.title,
            description: activity.snippet.description,
            activityPublishedAt: activity.snippet.publishedAt,
            observedAt,
            videoUrl: `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`
          };
          channelEvents.push({ payload, idempotencyKey: uploadActivityId(payload) });
        }
        if (budget.exhausted) {
          if (!hadFullBudget) {
            channels.set(channelId, prior);
            continue;
          }
          const span = windowEnd - checkpoint;
          if (span <= MIN_SCAN_WINDOW_MS) {
            throw youtubeServiceError(
              'Upload activity for one channel exceeded 100 pages within one minute. No events or checkpoint were accepted.'
            );
          }
          ctx.warn({
            message:
              'A channel has more recent activity than one check can read. It is being caught up in smaller steps.',
            data: { reason: 'youtube_upload_activity_backlog', channelId }
          });
          channels.set(channelId, {
            ...prior,
            scanUntil: new Date(checkpoint + Math.floor(span / 2)).toISOString()
          });
          continue;
        }
        for (const event of channelEvents) events.set(event.idempotencyKey, event);
        const retainAfter = Math.max(activatedAt, windowEnd - OVERLAP_MS);
        const seenVideos = [...seen.values()].filter(
          video => Date.parse(video.publishedAt) >= retainAfter
        );
        const following = windowEnd + (windowEnd - earliest);
        channels.set(channelId, {
          channelId,
          activatedAt: prior.activatedAt,
          checkpoint: windowEndAt,
          seenVideos,
          ...(catchingUp && following < now
            ? { scanUntil: new Date(following).toISOString() }
            : {})
        });
      }

      // A channel missing from a listing keeps its checkpoint for a day instead of rebaselining.
      const missing = previous.channels
        .filter(
          channel =>
            !channels.has(channel.channelId) &&
            now - Date.parse(channel.checkpoint) < MISSING_CHANNEL_RETENTION_MS
        )
        .sort((a, b) => Date.parse(b.checkpoint) - Date.parse(a.checkpoint))
        .slice(0, Math.max(0, MAX_CHANNELS - channels.size));
      for (const channel of missing) channels.set(channel.channelId, channel);

      const updatedState: UploadState = {
        version: 1,
        channels: [...channels.values()].sort((a, b) => (a.channelId < b.channelId ? -1 : 1))
      };
      if (
        updatedState.channels.reduce(
          (count, channel) => count + channel.seenVideos.length,
          0
        ) > MAX_SEEN_VIDEOS
      ) {
        throw youtubeServiceError(
          'The recent upload activity identity set exceeds 10000 videos. No events or checkpoint were accepted.'
        );
      }
      return {
        events: [...events.values()].sort(
          (a, b) =>
            Date.parse(a.payload.activityPublishedAt) -
              Date.parse(b.payload.activityPublishedAt) ||
            a.idempotencyKey.localeCompare(b.idempotencyKey)
        ),
        updatedState
      };
    }
  })
  .routingMatchers(async ctx =>
    (await ownedChannelIds(oauthClient(ctx.auth), { pages: 0 })).map(channelId => ({
      channelId
    }))
  )
  .build();

export const newVideo = SlateTrigger.create(spec, {
  key: 'new_video',
  name: 'New Video Upload Activity',
  description:
    'Observes upload activities from the OAuth connection’s owned channels every 15 minutes. Existing activity is silently baselined; title/description edits and private-to-public changes are not new uploads. Delayed or unavailable activity may be missed.'
})
  .triggerGroup(uploadActivities)
  .scopes(youtubeActionScopes.newVideo)
  .input(uploadActivityEventSchema)
  .output(uploadActivityOutputSchema)
  .matches(payload => uploadActivityEventSchema.safeParse(payload).success)
  .map(async ctx => {
    const channelIds = await ownedChannelIds(oauthClient(ctx.auth), { pages: 0 });
    if (!channelIds.includes(ctx.input.channelId)) {
      throw youtubeServiceError(
        'This upload activity belongs to a channel not owned by the current OAuth connection.'
      );
    }
    const { type, ...output } = ctx.input;
    return { type, id: uploadActivityId(output), output };
  })
  .build();
