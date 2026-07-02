import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listChannels = SlateTool.create(spec, {
  name: 'List Channels',
  key: 'list_channels',
  description: `List all sales channels configured for the store. Channels represent different selling venues such as storefronts, marketplaces, POS devices, or social media shops.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination'),
      limit: z.number().optional().describe('Results per page'),
      type: z
        .string()
        .optional()
        .describe('Filter by channel type (e.g., storefront, marketplace, pos)'),
      platform: z
        .string()
        .optional()
        .describe('Filter by platform (e.g., bigcommerce, amazon, facebook)'),
      isVisible: z.boolean().optional().describe('Filter by visibility'),
      available: z.boolean().optional().describe('Filter by available status')
    })
  )
  .output(
    z.object({
      channels: z.array(z.any()).describe('Array of channel objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      storeHash: ctx.config.storeHash
    });

    let params: Record<string, any> = {};
    if (ctx.input.page) params.page = ctx.input.page;
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.type) params.type = ctx.input.type;
    if (ctx.input.platform) params.platform = ctx.input.platform;
    if (ctx.input.isVisible !== undefined) params.is_visible = ctx.input.isVisible;
    if (ctx.input.available !== undefined) params.available = ctx.input.available;

    let result = await client.listChannels(params);

    return {
      output: { channels: result.data },
      message: `Found ${result.data.length} channels.`
    };
  })
  .build();
