import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConnectClient } from '../lib/client';
import { spec } from '../spec';

export let searchItems = SlateTool.create(spec, {
  name: 'Search Items',
  key: 'search_items',
  description: `Search for items across one or all accessible vaults using title or tag filters. Returns matching item summaries. Useful for finding items when you don't know which vault they're in.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      vaultId: z
        .string()
        .optional()
        .describe(
          'Optionally limit search to a specific vault. If omitted, searches across all accessible vaults.'
        ),
      title: z
        .string()
        .optional()
        .describe('Search by item title (case-insensitive contains match)'),
      tag: z.string().optional().describe('Filter by tag')
    })
  )
  .output(
    z.object({
      items: z.array(
        z.object({
          itemId: z.string().describe('Unique identifier of the item'),
          title: z.string().describe('Title of the item'),
          category: z.string().describe('Category of the item'),
          vaultId: z.string().describe('ID of the vault containing the item'),
          vaultName: z.string().optional().describe('Name of the vault containing the item'),
          tags: z.array(z.string()).optional().describe('Tags assigned to the item'),
          createdAt: z.string().describe('When the item was created'),
          updatedAt: z.string().describe('When the item was last updated')
        })
      ),
      totalCount: z.number().describe('Total number of matching items')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.config.connectServerUrl) {
      throw new Error('Connect server URL is required. Set it in the configuration.');
    }

    let client = new ConnectClient({
      token: ctx.auth.token,
      serverUrl: ctx.config.connectServerUrl
    });

    let filterParts: string[] = [];
    if (ctx.input.title) filterParts.push(`title co "${ctx.input.title}"`);
    if (ctx.input.tag) filterParts.push(`tag eq "${ctx.input.tag}"`);
    let filter = filterParts.length > 0 ? filterParts.join(' and ') : undefined;

    let vaultIds: string[] = [];
    let vaultNameMap: Record<string, string> = {};

    if (ctx.input.vaultId) {
      vaultIds.push(ctx.input.vaultId);
    } else {
      ctx.progress('Fetching vaults...');
      let vaults = await client.listVaults();
      for (let v of vaults) {
        vaultIds.push(v.id);
        vaultNameMap[v.id] = v.name;
      }
    }

    ctx.progress('Searching items...');
    let allItems: Array<{
      itemId: string;
      title: string;
      category: string;
      vaultId: string;
      vaultName?: string;
      tags?: string[];
      createdAt: string;
      updatedAt: string;
    }> = [];

    for (let vId of vaultIds) {
      let items = await client.listItems(vId, filter);
      for (let item of items) {
        allItems.push({
          itemId: item.id,
          title: item.title,
          category: item.category,
          vaultId: item.vault.id,
          vaultName: vaultNameMap[item.vault.id],
          tags: item.tags,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt
        });
      }
    }

    return {
      output: {
        items: allItems,
        totalCount: allItems.length
      },
      message: `Found **${allItems.length}** item(s) matching the search criteria.${
        allItems.length > 0
          ? '\n' +
            allItems
              .slice(0, 10)
              .map(i => `- **${i.title}** (${i.category}) in ${i.vaultName || i.vaultId}`)
              .join('\n') +
            (allItems.length > 10 ? `\n- ...and ${allItems.length - 10} more` : '')
          : ''
      }`
    };
  })
  .build();
