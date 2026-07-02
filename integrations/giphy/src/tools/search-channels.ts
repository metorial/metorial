import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { gifSchema, paginationSchema } from '../lib/types';
import { spec } from '../spec';

export let searchChannels = SlateTool.create(spec, {
  name: 'Search Channels',
  key: 'search_channels',
  description: `Search for GIPHY channels by keyword or phrase. Channels are curated collections of GIFs maintained by users and brands on GIPHY.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search query for channel names'),
      limit: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .describe('Number of results to return (1-50, default 25)'),
      offset: z.number().min(0).optional().describe('Results offset for pagination')
    })
  )
  .output(
    z.object({
      channels: z
        .array(
          z.object({
            channelId: z.number().describe('Unique channel ID'),
            url: z.string().describe('Channel URL on GIPHY'),
            displayName: z.string().describe('Channel display name'),
            slug: z.string().describe('Channel URL slug'),
            type: z.string().describe('Channel type'),
            shortDisplayName: z.string().describe('Short display name'),
            description: z.string().describe('Channel description'),
            bannerImage: z.string().describe('Channel banner image URL'),
            username: z.string().describe('Channel owner username'),
            featuredGif: gifSchema.nullable().describe('Featured GIF for the channel')
          })
        )
        .describe('Array of matching channels'),
      pagination: paginationSchema.describe('Pagination information')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.searchChannels({
      query: ctx.input.query,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    return {
      output: {
        channels: result.channels,
        pagination: result.pagination
      },
      message: `Found ${result.channels.length} channels for "${ctx.input.query}".`
    };
  })
  .build();
