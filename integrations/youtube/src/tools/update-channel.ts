import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { youtubeServiceError } from '../lib/errors';
import { youtubeActionScopes } from '../scopes';
import { spec } from '../spec';

export let updateChannel = SlateTool.create(spec, {
  name: 'Update Channel',
  key: 'update_channel',
  description: `Update branding settings for a YouTube channel. Can modify the channel description, keywords, unsubscribed trailer, and country. Requires channel ownership.`,
  tags: {
    destructive: false
  }
})
  .scopes(youtubeActionScopes.updateChannel)
  .input(
    z.object({
      channelId: z.string().describe('ID of the channel to update'),
      title: z
        .string()
        .optional()
        .describe('Deprecated: YouTube does not allow channel title changes through this API'),
      description: z.string().optional().describe('Channel description'),
      keywords: z.string().optional().describe('Channel keywords (space-separated)'),
      unsubscribedTrailer: z
        .string()
        .optional()
        .describe('Video ID to use as the channel trailer for unsubscribed viewers'),
      country: z
        .string()
        .optional()
        .describe('Country the channel is associated with (ISO 3166-1 alpha-2)')
    })
  )
  .output(
    z.object({
      channelId: z.string(),
      title: z.string().optional(),
      description: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = Client.fromAuth(ctx.auth);

    if (ctx.input.title !== undefined) {
      throw youtubeServiceError(
        'YouTube channel titles cannot be changed through channels.update; omit title'
      );
    }

    if (
      ctx.input.description === undefined &&
      ctx.input.keywords === undefined &&
      ctx.input.unsubscribedTrailer === undefined &&
      ctx.input.country === undefined
    ) {
      throw youtubeServiceError(
        'At least one channel branding field to update must be provided'
      );
    }

    let channelSettings: Record<string, any> = {};
    if (ctx.input.description !== undefined)
      channelSettings.description = ctx.input.description;
    if (ctx.input.keywords !== undefined) channelSettings.keywords = ctx.input.keywords;
    if (ctx.input.unsubscribedTrailer !== undefined)
      channelSettings.unsubscribedTrailer = ctx.input.unsubscribedTrailer;
    if (ctx.input.country !== undefined) channelSettings.country = ctx.input.country;

    let channel = await client.updateChannel({
      part: ['brandingSettings'],
      channelId: ctx.input.channelId,
      brandingSettings: {
        channel: channelSettings
      }
    });

    return {
      output: {
        channelId: channel.id,
        title: channel.brandingSettings?.channel?.title,
        description: channel.brandingSettings?.channel?.description
      },
      message: `Updated channel "${channel.brandingSettings?.channel?.title || ctx.input.channelId}".`
    };
  })
  .build();
