import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { InstagramClient } from '../lib/client';
import { spec } from '../spec';

export let newMediaTrigger = SlateTrigger.create(spec, {
  name: 'New Media',
  key: 'new_media',
  description:
    '[Polling fallback] Triggers when new photos, videos, reels, or carousel posts are published to your Instagram account. Uses polling since Instagram does not provide a webhook for new posts.'
})
  .input(
    z.object({
      mediaId: z.string().describe('ID of the new media'),
      mediaType: z.string().optional().describe('Type of media'),
      caption: z.string().optional().describe('Caption text'),
      mediaUrl: z.string().optional().describe('Media URL'),
      permalink: z.string().optional().describe('Permanent link'),
      timestamp: z.string().optional().describe('Published timestamp'),
      likeCount: z.number().optional().describe('Number of likes'),
      commentsCount: z.number().optional().describe('Number of comments')
    })
  )
  .output(
    z.object({
      mediaId: z.string().describe('ID of the new media'),
      mediaType: z.string().optional().describe('Type: IMAGE, VIDEO, CAROUSEL_ALBUM'),
      caption: z.string().optional().describe('Caption text'),
      mediaUrl: z.string().optional().describe('Media URL'),
      permalink: z.string().optional().describe('Permanent link to the post'),
      timestamp: z.string().optional().describe('Published timestamp'),
      likeCount: z.number().optional().describe('Number of likes'),
      commentsCount: z.number().optional().describe('Number of comments')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new InstagramClient({
        token: ctx.auth.token,
        apiVersion: ctx.config.apiVersion,
        apiBaseUrl: ctx.auth.apiBaseUrl
      });

      let effectiveUserId = ctx.auth.userId || 'me';
      let result = await client.listMedia(effectiveUserId, { limit: 10 });

      let lastSeenTimestamp = ctx.state?.lastSeenTimestamp as string | undefined;
      let media = (result.data || []) as Record<string, any>[];

      let newMedia = lastSeenTimestamp
        ? media.filter((m: any) => m.timestamp && m.timestamp > lastSeenTimestamp)
        : [];

      // On first run, just store the latest timestamp without emitting events
      let latestTimestamp = media.length > 0 ? media[0]!.timestamp : lastSeenTimestamp;

      return {
        inputs: newMedia.map((m: any) => ({
          mediaId: m.id,
          mediaType: m.media_type,
          caption: m.caption,
          mediaUrl: m.media_url,
          permalink: m.permalink,
          timestamp: m.timestamp,
          likeCount: m.like_count,
          commentsCount: m.comments_count
        })),
        updatedState: {
          lastSeenTimestamp: latestTimestamp || lastSeenTimestamp
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'media.created',
        id: ctx.input.mediaId,
        output: {
          mediaId: ctx.input.mediaId,
          mediaType: ctx.input.mediaType,
          caption: ctx.input.caption,
          mediaUrl: ctx.input.mediaUrl,
          permalink: ctx.input.permalink,
          timestamp: ctx.input.timestamp,
          likeCount: ctx.input.likeCount,
          commentsCount: ctx.input.commentsCount
        }
      };
    }
  })
  .build();
