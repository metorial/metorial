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

export let listPlaylists = SlateTool.create(spec, {
  name: 'List Playlists',
  key: 'list_playlists',
  description: `List YouTube playlists by ID, channel, or for the authenticated user. Returns playlist metadata including title, description, privacy status, and item count.`,
  tags: {
    readOnly: true
  }
})
  .scopes(youtubeActionScopes.listPlaylists)
  .input(
    z.object({
      playlistId: z
        .string()
        .optional()
        .describe('Specific playlist ID(s) to retrieve (comma-separated)'),
      channelId: z.string().optional().describe('Channel ID to list playlists for'),
      mine: z
        .boolean()
        .optional()
        .describe("Set to true to list the authenticated user's playlists"),
      maxResults: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .describe('Maximum number of results (1-50)'),
      pageToken: z.string().optional().describe('Token for pagination')
    })
  )
  .output(
    z.object({
      playlists: z.array(
        z.object({
          playlistId: z.string(),
          title: z.string().optional(),
          description: z.string().optional(),
          publishedAt: z.string().optional(),
          channelId: z.string().optional(),
          channelTitle: z.string().optional(),
          privacyStatus: z.string().optional(),
          itemCount: z.number().optional(),
          thumbnails: z
            .object({
              default: thumbnailSchema,
              medium: thumbnailSchema,
              high: thumbnailSchema
            })
            .optional()
        })
      ),
      totalResults: z.number().optional(),
      nextPageToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = Client.fromAuth(ctx.auth);
    let filterCount = [ctx.input.playlistId, ctx.input.channelId, ctx.input.mine].filter(
      Boolean
    ).length;

    if (filterCount !== 1) {
      throw youtubeServiceError('Provide exactly one of playlistId, channelId, or mine=true');
    }

    let response = await client.listPlaylists({
      part: ['snippet', 'status', 'contentDetails'],
      playlistId: ctx.input.playlistId,
      channelId: ctx.input.channelId,
      mine: ctx.input.mine,
      maxResults: ctx.input.maxResults,
      pageToken: ctx.input.pageToken
    });

    let playlists = response.items.map(pl => ({
      playlistId: pl.id,
      title: pl.snippet?.title,
      description: pl.snippet?.description,
      publishedAt: pl.snippet?.publishedAt,
      channelId: pl.snippet?.channelId,
      channelTitle: pl.snippet?.channelTitle,
      privacyStatus: pl.status?.privacyStatus,
      itemCount: pl.contentDetails?.itemCount,
      thumbnails: pl.snippet?.thumbnails
        ? {
            default: pl.snippet.thumbnails.default,
            medium: pl.snippet.thumbnails.medium,
            high: pl.snippet.thumbnails.high
          }
        : undefined
    }));

    return {
      output: {
        playlists,
        totalResults: response.pageInfo?.totalResults,
        nextPageToken: response.nextPageToken
      },
      message: `Retrieved **${playlists.length}** playlist(s).${response.nextPageToken ? ' More pages available.' : ''}`
    };
  })
  .build();
