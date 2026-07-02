import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { pinterestServiceError } from '../lib/errors';
import { spec } from '../spec';

export let listCatalogs = SlateTool.create(spec, {
  name: 'List Catalogs',
  key: 'list_catalogs',
  description: `List product catalogs, catalog feeds, catalog items, or product groups. Provides access to shopping catalog data for managing product listings on Pinterest.`,
  instructions: [
    'Set "resource" to "catalogs" to list top-level catalogs.',
    'Set "resource" to "feeds" to list catalog feeds (optionally filtered by catalogId).',
    'Set "resource" to "items" to list catalog items (requires feedId).',
    'Set "resource" to "product_groups" to list product groups.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      resource: z
        .enum(['catalogs', 'feeds', 'items', 'product_groups'])
        .describe('Type of catalog resource to list'),
      feedId: z.string().optional().describe('Feed ID (required for listing items)'),
      catalogId: z
        .string()
        .optional()
        .describe('Filter feeds or product groups by catalog ID'),
      bookmark: z.string().optional().describe('Pagination bookmark from a previous response'),
      pageSize: z.number().optional().describe('Number of items per page')
    })
  )
  .output(
    z.object({
      items: z.array(z.any()).describe('List of catalog resources'),
      bookmark: z.string().optional().describe('Bookmark for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result: any;
    if (ctx.input.resource === 'catalogs') {
      result = await client.listCatalogs({
        bookmark: ctx.input.bookmark,
        pageSize: ctx.input.pageSize
      });
    } else if (ctx.input.resource === 'feeds') {
      result = await client.listCatalogFeeds({
        bookmark: ctx.input.bookmark,
        pageSize: ctx.input.pageSize,
        catalogId: ctx.input.catalogId
      });
    } else if (ctx.input.resource === 'items') {
      if (!ctx.input.feedId) {
        throw pinterestServiceError('Feed ID is required when listing catalog items');
      }
      result = await client.listCatalogItems({
        feedId: ctx.input.feedId,
        bookmark: ctx.input.bookmark,
        pageSize: ctx.input.pageSize
      });
    } else {
      result = await client.listCatalogProductGroups({
        feedId: ctx.input.feedId,
        catalogId: ctx.input.catalogId,
        bookmark: ctx.input.bookmark,
        pageSize: ctx.input.pageSize
      });
    }

    let items = result.items || [];

    return {
      output: {
        items,
        bookmark: result.bookmark ?? undefined
      },
      message: `Found **${items.length}** ${ctx.input.resource}.${result.bookmark ? ' More results available with bookmark.' : ''}`
    };
  })
  .build();
