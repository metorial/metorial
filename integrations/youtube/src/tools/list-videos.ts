import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { youtubeServiceError } from '../lib/errors';
import { youtubeActionScopes } from '../scopes';
import { spec } from '../spec';

let thumbnailSchema = z
  .object({
    url: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional()
  })
  .optional();

export let listVideos = SlateTool.create(spec, {
  name: 'List Videos',
  key: 'list_videos',
  description: `List YouTube videos from supported charts or the authenticated user's liked/disliked videos. Use this to retrieve popular videos by region/category or videos the user has rated.`,
  tags: {
    readOnly: true
  }
})
  .scopes(youtubeActionScopes.listVideos)
  .input(
    z.object({
      source: z
        .enum(['mostPopular', 'myRating'])
        .describe('Use "mostPopular" for public charts or "myRating" for rated videos'),
      myRating: z
        .enum(['like', 'dislike'])
        .optional()
        .describe('Required when source is "myRating"'),
      regionCode: z
        .string()
        .optional()
        .describe('ISO 3166-1 alpha-2 region for mostPopular charts'),
      videoCategoryId: z
        .string()
        .optional()
        .describe('Video category ID for mostPopular charts'),
      maxResults: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .describe('Maximum number of videos (1-50)'),
      pageToken: z.string().optional().describe('Token for pagination')
    })
  )
  .output(
    z.object({
      videos: z.array(
        z.object({
          videoId: z.string(),
          title: z.string().optional(),
          description: z.string().optional(),
          publishedAt: z.string().optional(),
          channelId: z.string().optional(),
          channelTitle: z.string().optional(),
          categoryId: z.string().optional(),
          thumbnails: z
            .object({
              default: thumbnailSchema,
              medium: thumbnailSchema,
              high: thumbnailSchema,
              standard: thumbnailSchema,
              maxres: thumbnailSchema
            })
            .optional(),
          duration: z.string().optional(),
          definition: z.string().optional(),
          caption: z.string().optional(),
          viewCount: z.string().optional(),
          likeCount: z.string().optional(),
          commentCount: z.string().optional()
        })
      ),
      totalResults: z.number().optional(),
      nextPageToken: z.string().optional(),
      prevPageToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = Client.fromAuth(ctx.auth);

    if (ctx.input.source === 'myRating' && !ctx.input.myRating) {
      throw youtubeServiceError('myRating is required when source is "myRating"');
    }

    let response = await client.listVideos({
      part: ['snippet', 'statistics', 'contentDetails'],
      chart: ctx.input.source === 'mostPopular' ? 'mostPopular' : undefined,
      myRating: ctx.input.source === 'myRating' ? ctx.input.myRating : undefined,
      maxResults: ctx.input.maxResults,
      pageToken: ctx.input.pageToken,
      regionCode: ctx.input.source === 'mostPopular' ? ctx.input.regionCode : undefined,
      videoCategoryId:
        ctx.input.source === 'mostPopular' ? ctx.input.videoCategoryId : undefined
    });

    let videos = response.items.map(video => {
      let thumbs = video.snippet?.thumbnails;
      return {
        videoId: video.id,
        title: video.snippet?.title,
        description: video.snippet?.description,
        publishedAt: video.snippet?.publishedAt,
        channelId: video.snippet?.channelId,
        channelTitle: video.snippet?.channelTitle,
        categoryId: video.snippet?.categoryId,
        thumbnails: thumbs
          ? {
              default: thumbs.default,
              medium: thumbs.medium,
              high: thumbs.high,
              standard: thumbs.standard,
              maxres: thumbs.maxres
            }
          : undefined,
        duration: video.contentDetails?.duration,
        definition: video.contentDetails?.definition,
        caption: video.contentDetails?.caption,
        viewCount: video.statistics?.viewCount,
        likeCount: video.statistics?.likeCount,
        commentCount: video.statistics?.commentCount
      };
    });

    return {
      output: {
        videos,
        totalResults: response.pageInfo?.totalResults,
        nextPageToken: response.nextPageToken,
        prevPageToken: response.prevPageToken
      },
      message: `Retrieved **${videos.length}** video(s).${response.nextPageToken ? ' More pages available.' : ''}`
    };
  })
  .build();
