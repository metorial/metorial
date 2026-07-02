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

export let getChannel = SlateTool.create(spec, {
  name: 'Get Channel',
  key: 'get_channel',
  description: `Retrieve detailed information about YouTube channels. Look up by channel ID, username, or get the authenticated user's own channel. Returns snippet, statistics, content details, and branding settings.`,
  tags: {
    readOnly: true
  }
})
  .scopes(youtubeActionScopes.getChannel)
  .input(
    z.object({
      channelId: z.string().optional().describe('Channel ID to look up'),
      forUsername: z.string().optional().describe('Username to look up'),
      mine: z
        .boolean()
        .optional()
        .describe("Set to true to get the authenticated user's channel")
    })
  )
  .output(
    z.object({
      channels: z.array(
        z.object({
          channelId: z.string(),
          title: z.string().optional(),
          description: z.string().optional(),
          customUrl: z.string().optional(),
          publishedAt: z.string().optional(),
          country: z.string().optional(),
          thumbnails: z
            .object({
              default: thumbnailSchema,
              medium: thumbnailSchema,
              high: thumbnailSchema
            })
            .optional(),
          viewCount: z.string().optional(),
          subscriberCount: z.string().optional(),
          hiddenSubscriberCount: z.boolean().optional(),
          videoCount: z.string().optional(),
          uploadsPlaylistId: z.string().optional(),
          brandingTitle: z.string().optional(),
          brandingDescription: z.string().optional(),
          brandingKeywords: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = Client.fromAuth(ctx.auth);
    let filterCount = [ctx.input.channelId, ctx.input.forUsername, ctx.input.mine].filter(
      Boolean
    ).length;

    if (filterCount !== 1) {
      throw youtubeServiceError('Provide exactly one of channelId, forUsername, or mine=true');
    }

    let response = await client.listChannels({
      part: ['snippet', 'statistics', 'contentDetails', 'brandingSettings'],
      channelId: ctx.input.channelId,
      forUsername: ctx.input.forUsername,
      mine: ctx.input.mine
    });

    let channels = response.items.map(ch => {
      let thumbs = ch.snippet?.thumbnails;
      return {
        channelId: ch.id,
        title: ch.snippet?.title,
        description: ch.snippet?.description,
        customUrl: ch.snippet?.customUrl,
        publishedAt: ch.snippet?.publishedAt,
        country: ch.snippet?.country,
        thumbnails: thumbs
          ? {
              default: thumbs.default,
              medium: thumbs.medium,
              high: thumbs.high
            }
          : undefined,
        viewCount: ch.statistics?.viewCount,
        subscriberCount: ch.statistics?.subscriberCount,
        hiddenSubscriberCount: ch.statistics?.hiddenSubscriberCount,
        videoCount: ch.statistics?.videoCount,
        uploadsPlaylistId: ch.contentDetails?.relatedPlaylists?.uploads,
        brandingTitle: ch.brandingSettings?.channel?.title,
        brandingDescription: ch.brandingSettings?.channel?.description,
        brandingKeywords: ch.brandingSettings?.channel?.keywords
      };
    });

    return {
      output: { channels },
      message: `Retrieved **${channels.length}** channel(s).${channels.length > 0 ? ` First: "${channels[0]?.title}"` : ''}`
    };
  })
  .build();
