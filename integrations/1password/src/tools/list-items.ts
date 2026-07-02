import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConnectClient } from '../lib/client';
import { spec } from '../spec';

export let listItems = SlateTool.create(spec, {
  name: 'List Items',
  key: 'list_items',
  description: `List items stored in a specific vault. Returns item summaries including titles, categories, tags, and URLs. Use the filter parameter to search by title or tag. For full item details including field values, use the Get Item tool.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      vaultId: z.string().describe('ID of the vault to list items from'),
      filter: z
        .string()
        .optional()
        .describe(
          'Optional filter to narrow results. Supports filtering by title (e.g., "title eq \\"My Login\\"") or tag (e.g., "tag eq \\"production\\"").'
        )
    })
  )
  .output(
    z.object({
      items: z.array(
        z.object({
          itemId: z.string().describe('Unique identifier of the item'),
          title: z.string().describe('Title of the item'),
          category: z
            .string()
            .describe('Category of the item (e.g., LOGIN, PASSWORD, API_CREDENTIAL)'),
          vaultId: z.string().describe('ID of the vault containing the item'),
          tags: z.array(z.string()).optional().describe('Tags assigned to the item'),
          favorite: z.boolean().optional().describe('Whether the item is a favorite'),
          createdAt: z.string().describe('When the item was created'),
          updatedAt: z.string().describe('When the item was last updated'),
          state: z.string().optional().describe('State of the item (e.g., ACTIVE, ARCHIVED)')
        })
      )
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

    ctx.progress('Fetching items...');
    let items = await client.listItems(ctx.input.vaultId, ctx.input.filter);

    let mapped = items.map(item => ({
      itemId: item.id,
      title: item.title,
      category: item.category,
      vaultId: item.vault.id,
      tags: item.tags,
      favorite: item.favorite,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      state: item.state
    }));

    return {
      output: { items: mapped },
      message: `Found **${mapped.length}** item(s) in vault.${
        mapped.length > 0
          ? '\n' +
            mapped
              .slice(0, 10)
              .map(i => `- **${i.title}** (${i.category})`)
              .join('\n') +
            (mapped.length > 10 ? `\n- ...and ${mapped.length - 10} more` : '')
          : ''
      }`
    };
  })
  .build();
