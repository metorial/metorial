import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { bigcommerceServiceError } from '../lib/errors';
import { spec } from '../spec';

export let managePriceList = SlateTool.create(spec, {
  name: 'Manage Price List',
  key: 'manage_price_list',
  description: `List, create, update, or delete price lists. Price lists allow per-variant, per-currency pricing that can be assigned to specific customer groups and channels.`,
  instructions: [
    'Use action "list" to retrieve price lists.',
    'Use action "get" to retrieve a specific price list with its details.',
    'Use action "create" to create a new price list.',
    'Use action "update" to modify an existing price list.',
    'Use action "delete" to remove a price list.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      priceListId: z
        .number()
        .optional()
        .describe('Price list ID (required for get/update/delete)'),
      name: z.string().optional().describe('Price list name'),
      active: z.boolean().optional().describe('Whether the price list is active'),
      page: z.number().optional().describe('Page number for list pagination'),
      limit: z.number().optional().describe('Results per page for list')
    })
  )
  .output(
    z.object({
      priceList: z.any().optional().describe('The price list object'),
      priceLists: z.array(z.any()).optional().describe('List of price lists'),
      deleted: z.boolean().optional().describe('Whether the price list was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      storeHash: ctx.config.storeHash
    });

    if (ctx.input.action === 'list') {
      let params: Record<string, any> = {};
      if (ctx.input.page) params.page = ctx.input.page;
      if (ctx.input.limit) params.limit = ctx.input.limit;
      if (ctx.input.name) params.name = ctx.input.name;
      let result = await client.listPriceLists(params);
      return {
        output: { priceLists: result.data },
        message: `Found ${result.data.length} price lists.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.priceListId)
        throw bigcommerceServiceError('priceListId is required for get');
      let result = await client.getPriceList(ctx.input.priceListId);
      return {
        output: { priceList: result.data },
        message: `Retrieved price list **${result.data.name}** (ID: ${result.data.id}).`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.priceListId)
        throw bigcommerceServiceError('priceListId is required for delete');
      await client.deletePriceList(ctx.input.priceListId);
      return {
        output: { deleted: true },
        message: `Deleted price list with ID ${ctx.input.priceListId}.`
      };
    }

    let data: Record<string, any> = {};
    if (ctx.input.name) data.name = ctx.input.name;
    if (ctx.input.active !== undefined) data.active = ctx.input.active;

    if (ctx.input.action === 'create') {
      let result = await client.createPriceList(data);
      return {
        output: { priceList: result.data },
        message: `Created price list **${result.data.name}** (ID: ${result.data.id}).`
      };
    }

    if (!ctx.input.priceListId)
      throw bigcommerceServiceError('priceListId is required for update');
    let result = await client.updatePriceList(ctx.input.priceListId, data);
    return {
      output: { priceList: result.data },
      message: `Updated price list **${result.data.name}** (ID: ${result.data.id}).`
    };
  })
  .build();
