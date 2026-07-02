import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { youtubeActionScopes } from '../scopes';
import { spec } from '../spec';

let thumbnailSchema = z
  .object({
    url: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional()
  })
  .optional();

export let getVideo = SlateTool.create(spec, {
  name: 'Get Video Details',
  key: 'get_video',
  description: `Retrieve detailed information about one or more YouTube videos by ID. Returns snippet (title, description, tags), statistics (views, likes, comments), content details (duration, definition), and status (privacy, license).`,
  tags: {
    readOnly: true
  }
})
  .scopes(youtubeActionScopes.getVideo)
  .input(
    z.object({
      videoId: z.string().describe('Video ID or comma-separated list of video IDs (up to 50)')
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
          tags: z.array(z.string()).optional(),
          categoryId: z.string().optional(),
          defaultLanguage: z.string().optional(),
          thumbnails: z
            .object({
              default: thumbnailSchema,
              medium: thumbnailSchema,
              high: thumbnailSchema,
              standard: thumbnailSchema,
              maxres: thumbnailSchema
            })
            .optional(),
          duration: z.string().optional().describe('ISO 8601 duration'),
          dimension: z.string().optional(),
          definition: z.string().optional(),
          caption: z.string().optional(),
          licensedContent: z.boolean().optional(),
          viewCount: z.string().optional(),
          likeCount: z.string().optional(),
          commentCount: z.string().optional(),
          favoriteCount: z.string().optional(),
          privacyStatus: z.string().optional(),
          license: z.string().optional(),
          embeddable: z.boolean().optional(),
          madeForKids: z.boolean().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = Client.fromAuth(ctx.auth);

    let response = await client.listVideos({
      part: ['snippet', 'statistics', 'contentDetails', 'status'],
      videoId: ctx.input.videoId
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
        tags: video.snippet?.tags,
        categoryId: video.snippet?.categoryId,
        defaultLanguage: video.snippet?.defaultLanguage,
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
        dimension: video.contentDetails?.dimension,
        definition: video.contentDetails?.definition,
        caption: video.contentDetails?.caption,
        licensedContent: video.contentDetails?.licensedContent,
        viewCount: video.statistics?.viewCount,
        likeCount: video.statistics?.likeCount,
        commentCount: video.statistics?.commentCount,
        favoriteCount: video.statistics?.favoriteCount,
        privacyStatus: video.status?.privacyStatus,
        license: video.status?.license,
        embeddable: video.status?.embeddable,
        madeForKids: video.status?.madeForKids
      };
    });

    return {
      output: { videos },
      message: `Retrieved details for **${videos.length}** video(s).${videos.length > 0 ? ` First: "${videos[0]?.title}"` : ''}`
    };
  })
  .build();
