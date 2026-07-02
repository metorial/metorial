import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { youtubeActionScopes } from '../scopes';
import { spec } from '../spec';

export let channelActivity = SlateTrigger.create(spec, {
  name: 'Channel Activity',
  key: 'channel_activity',
  description:
    'Triggers when a YouTube channel has new activity such as video uploads, likes, favorites, comments, subscriptions, and playlist additions.'
})
  .scopes(youtubeActionScopes.channelActivity)
  .input(
    z.object({
      activityId: z.string().describe('Unique activity ID'),
      activityType: z
        .string()
        .describe('Type of activity (e.g., upload, like, favorite, comment, subscription)'),
      title: z.string().optional().describe('Activity title'),
      description: z.string().optional().describe('Activity description'),
      publishedAt: z.string().optional().describe('When the activity occurred'),
      channelId: z.string().optional().describe('Channel that performed the activity'),
      videoId: z.string().optional().describe('Related video ID if applicable'),
      relatedChannelId: z.string().optional().describe('Related channel ID if applicable'),
      playlistId: z.string().optional().describe('Related playlist ID if applicable')
    })
  )
  .output(
    z.object({
      activityId: z.string().describe('Unique activity ID'),
      activityType: z.string().describe('Type of activity'),
      title: z.string().optional().describe('Activity title'),
      description: z.string().optional().describe('Activity description'),
      publishedAt: z.string().optional().describe('When the activity occurred'),
      channelId: z.string().optional().describe('Channel that performed the activity'),
      videoId: z.string().optional().describe('Related video ID if applicable'),
      relatedChannelId: z.string().optional().describe('Related channel ID if applicable'),
      playlistId: z.string().optional().describe('Related playlist ID if applicable')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = Client.fromAuth(ctx.auth);

      let lastPolledAt = ctx.state?.lastPolledAt as string | undefined;

      let response = await client.listActivities({
        part: ['snippet', 'contentDetails'],
        mine: true,
        maxResults: 50,
        publishedAfter: lastPolledAt
      });

      let now = new Date().toISOString();

      let inputs = response.items.map(act => {
        let videoId: string | undefined;
        let relatedChannelId: string | undefined;
        let playlistId: string | undefined;

        if (act.contentDetails?.upload) {
          videoId = act.contentDetails.upload.videoId;
        } else if (act.contentDetails?.like) {
          videoId = act.contentDetails.like.resourceId?.videoId;
        } else if (act.contentDetails?.favorite) {
          videoId = act.contentDetails.favorite.resourceId?.videoId;
        } else if (act.contentDetails?.comment) {
          videoId = act.contentDetails.comment.resourceId?.videoId;
          relatedChannelId = act.contentDetails.comment.resourceId?.channelId;
        } else if (act.contentDetails?.subscription) {
          relatedChannelId = act.contentDetails.subscription.resourceId?.channelId;
        } else if (act.contentDetails?.playlistItem) {
          videoId = act.contentDetails.playlistItem.resourceId?.videoId;
          playlistId = act.contentDetails.playlistItem.playlistId;
        } else if (act.contentDetails?.recommendation) {
          videoId = act.contentDetails.recommendation.resourceId?.videoId;
          relatedChannelId = act.contentDetails.recommendation.resourceId?.channelId;
        }

        return {
          activityId: act.id,
          activityType: act.snippet?.type || 'unknown',
          title: act.snippet?.title,
          description: act.snippet?.description,
          publishedAt: act.snippet?.publishedAt,
          channelId: act.snippet?.channelId,
          videoId,
          relatedChannelId,
          playlistId
        };
      });

      return {
        inputs,
        updatedState: {
          lastPolledAt: now
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `activity.${ctx.input.activityType}`,
        id: ctx.input.activityId,
        output: {
          activityId: ctx.input.activityId,
          activityType: ctx.input.activityType,
          title: ctx.input.title,
          description: ctx.input.description,
          publishedAt: ctx.input.publishedAt,
          channelId: ctx.input.channelId,
          videoId: ctx.input.videoId,
          relatedChannelId: ctx.input.relatedChannelId,
          playlistId: ctx.input.playlistId
        }
      };
    }
  })
  .build();
