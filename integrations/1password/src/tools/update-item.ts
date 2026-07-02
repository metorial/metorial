import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConnectClient, type PatchOperation } from '../lib/client';
import { spec } from '../spec';

export let updateItem = SlateTool.create(spec, {
  name: 'Update Item',
  key: 'update_item',
  description: `Update an existing item in a 1Password vault. Supports changing the title, tags, favorite status, URLs, and adding/updating/removing individual fields using JSON Patch operations. For simple updates, use the convenience fields. For advanced modifications, provide patch operations directly.`,
  instructions: [
    'For simple updates, use the title, tags, favorite, and urls fields.',
    'For field-level changes, use patchOperations with JSON Patch syntax (RFC 6902). The path follows the format "/fields/{fieldId}/value" or "/fields/-" to append.',
    'If both convenience fields and patchOperations are provided, convenience fields are applied first via a full replacement, then patch operations are applied.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      vaultId: z.string().describe('ID of the vault containing the item'),
      itemId: z.string().describe('ID of the item to update'),
      title: z.string().optional().describe('New title for the item'),
      tags: z
        .array(z.string())
        .optional()
        .describe('New tags for the item (replaces existing tags)'),
      favorite: z
        .boolean()
        .optional()
        .describe('Whether to mark/unmark the item as a favorite'),
      urls: z
        .array(
          z.object({
            href: z.string().describe('The URL'),
            primary: z.boolean().optional().describe('Whether this is the primary URL'),
            label: z.string().optional().describe('Label for the URL')
          })
        )
        .optional()
        .describe('New URLs for the item (replaces existing URLs)'),
      patchOperations: z
        .array(
          z.object({
            op: z.enum(['add', 'remove', 'replace']).describe('The operation type'),
            path: z
              .string()
              .describe('JSON Patch path (e.g., "/title", "/fields/{fieldId}/value")'),
            value: z.any().optional().describe('The new value for add/replace operations')
          })
        )
        .optional()
        .describe('JSON Patch operations for granular field-level changes')
    })
  )
  .output(
    z.object({
      itemId: z.string().describe('ID of the updated item'),
      title: z.string().describe('Title of the updated item'),
      category: z.string().describe('Category of the updated item'),
      vaultId: z.string().describe('ID of the vault containing the item'),
      updatedAt: z.string().describe('When the item was last updated')
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

    let hasConvenienceUpdates =
      ctx.input.title !== undefined ||
      ctx.input.tags !== undefined ||
      ctx.input.favorite !== undefined ||
      ctx.input.urls !== undefined;

    let result: any;

    if (hasConvenienceUpdates && !ctx.input.patchOperations) {
      ctx.progress('Fetching current item...');
      let current = await client.getItem(ctx.input.vaultId, ctx.input.itemId);

      if (ctx.input.title !== undefined) current.title = ctx.input.title;
      if (ctx.input.tags !== undefined) current.tags = ctx.input.tags;
      if (ctx.input.favorite !== undefined) current.favorite = ctx.input.favorite;
      if (ctx.input.urls !== undefined) current.urls = ctx.input.urls;

      ctx.progress('Updating item...');
      result = await client.replaceItem(ctx.input.vaultId, ctx.input.itemId, current);
    } else if (ctx.input.patchOperations && ctx.input.patchOperations.length > 0) {
      if (hasConvenienceUpdates) {
        ctx.progress('Fetching current item...');
        let current = await client.getItem(ctx.input.vaultId, ctx.input.itemId);

        if (ctx.input.title !== undefined) current.title = ctx.input.title;
        if (ctx.input.tags !== undefined) current.tags = ctx.input.tags;
        if (ctx.input.favorite !== undefined) current.favorite = ctx.input.favorite;
        if (ctx.input.urls !== undefined) current.urls = ctx.input.urls;

        ctx.progress('Replacing item...');
        await client.replaceItem(ctx.input.vaultId, ctx.input.itemId, current);
      }

      ctx.progress('Applying patch operations...');
      let ops: PatchOperation[] = ctx.input.patchOperations.map(op => ({
        op: op.op,
        path: op.path,
        value: op.value
      }));
      result = await client.patchItem(ctx.input.vaultId, ctx.input.itemId, ops);
    } else {
      throw new Error(
        'No updates provided. Specify at least one of: title, tags, favorite, urls, or patchOperations.'
      );
    }

    return {
      output: {
        itemId: result.id,
        title: result.title,
        category: result.category,
        vaultId: result.vault.id,
        updatedAt: result.updatedAt
      },
      message: `Updated item **${result.title}** (${result.category}).`
    };
  })
  .build();
