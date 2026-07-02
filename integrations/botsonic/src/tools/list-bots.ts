import { SlateTool } from 'slates';
import { z } from 'zod';
import { BusinessClient } from '../lib/client';
import { spec } from '../spec';

export let listBots = SlateTool.create(spec, {
  name: 'List Bots',
  key: 'list_bots',
  description: `Retrieve a paginated list of all bots associated with your Botsonic account.
Supports searching, sorting, filtering by workspace, and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      searchQuery: z.string().optional().describe('Search for bots matching this query'),
      sortBy: z.string().optional().describe('Field to sort by (e.g. created_at, updated_at)'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      workspaceId: z.string().optional().describe('Filter bots by workspace ID'),
      page: z.number().optional().describe('Page number (starts at 1)'),
      size: z.number().optional().describe('Number of results per page (1-100, default 50)')
    })
  )
  .output(
    z.object({
      bots: z
        .array(
          z.object({
            botId: z.string().describe('Unique bot identifier'),
            ownerId: z.string().describe('Owner identifier'),
            workspaceId: z.string().describe('Workspace the bot belongs to'),
            isDeleted: z.boolean().describe('Whether the bot is deleted'),
            isShared: z.boolean().describe('Whether the bot is shared'),
            templateId: z.string().describe('Bot template type'),
            createdAt: z.string().describe('Creation timestamp'),
            updatedAt: z.string().describe('Last update timestamp')
          })
        )
        .describe('List of bots'),
      total: z.number().describe('Total number of bots'),
      page: z.number().describe('Current page number'),
      pages: z.number().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BusinessClient(ctx.auth.token);

    let result = await client.listBots({
      searchQuery: ctx.input.searchQuery,
      sortBy: ctx.input.sortBy,
      sortOrder: ctx.input.sortOrder,
      workspaceId: ctx.input.workspaceId,
      page: ctx.input.page,
      size: ctx.input.size
    });

    let bots = result.items.map(bot => ({
      botId: bot.id,
      ownerId: bot.owner_id,
      workspaceId: bot.workspace_id,
      isDeleted: bot.is_deleted,
      isShared: bot.is_shared,
      templateId: bot.bot_template_id || '',
      createdAt: bot.created_at,
      updatedAt: bot.updated_at
    }));

    return {
      output: {
        bots,
        total: result.total,
        page: result.page,
        pages: result.pages
      },
      message: `Found **${result.total}** bots (page ${result.page}/${result.pages}).`
    };
  })
  .build();
