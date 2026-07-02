import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { youtubeServiceError } from '../lib/errors';
import { youtubeActionScopes } from '../scopes';
import { spec } from '../spec';

export let listActivities = SlateTool.create(spec, {
  name: 'List Activities',
  key: 'list_activities',
  description: `Retrieve activity feed for a YouTube channel or the authenticated user. Activities include uploads, likes, favorites, comments, subscriptions, and more. Results can be filtered by date range.`,
  tags: {
    readOnly: true
  }
})
  .scopes(youtubeActionScopes.listActivities)
  .input(
    z.object({
      channelId: z.string().optional().describe('Channel ID to get activities for'),
      mine: z.boolean().optional().describe("Get the authenticated user's activities"),
      maxResults: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .describe('Maximum number of results (1-50)'),
      pageToken: z.string().optional().describe('Token for pagination'),
      publishedAfter: z
        .string()
        .optional()
        .describe('Filter activities after this ISO 8601 date'),
      publishedBefore: z
        .string()
        .optional()
        .describe('Filter activities before this ISO 8601 date')
    })
  )
  .output(
    z.object({
      activities: z.array(
        z.object({
          activityId: z.string(),
          type: z.string().optional(),
          title: z.string().optional(),
          description: z.string().optional(),
          publishedAt: z.string().optional(),
          channelId: z.string().optional(),
          videoId: z.string().optional().describe('Related video ID (if applicable)'),
          relatedChannelId: z
            .string()
            .optional()
            .describe('Related channel ID (if applicable)'),
          playlistId: z.string().optional().describe('Related playlist ID (if applicable)')
        })
      ),
      totalResults: z.number().optional(),
      nextPageToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = Client.fromAuth(ctx.auth);
    let filterCount = [ctx.input.channelId, ctx.input.mine].filter(Boolean).length;

    if (filterCount !== 1) {
      throw youtubeServiceError('Provide exactly one of channelId or mine=true');
    }

    let response = await client.listActivities({
      part: ['snippet', 'contentDetails'],
      channelId: ctx.input.channelId,
      mine: ctx.input.mine,
      maxResults: ctx.input.maxResults,
      pageToken: ctx.input.pageToken,
      publishedAfter: ctx.input.publishedAfter,
      publishedBefore: ctx.input.publishedBefore
    });

    let activities = response.items.map(act => {
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
        type: act.snippet?.type,
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
      output: {
        activities,
        totalResults: response.pageInfo?.totalResults,
        nextPageToken: response.nextPageToken
      },
      message: `Retrieved **${activities.length}** activities.${response.nextPageToken ? ' More pages available.' : ''}`
    };
  })
  .build();
