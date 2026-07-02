import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConnectClient } from '../lib/client';
import { spec } from '../spec';

export let deleteItem = SlateTool.create(spec, {
  name: 'Delete Item',
  key: 'delete_item',
  description: `Delete an item from a 1Password vault. This permanently removes the item and cannot be undone. To archive an item instead, use the Update Item tool with a patch operation to set the state.`,
  constraints: ['This action is irreversible. The item will be permanently deleted.'],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      vaultId: z.string().describe('ID of the vault containing the item'),
      itemId: z.string().describe('ID of the item to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the item was successfully deleted'),
      itemId: z.string().describe('ID of the deleted item'),
      vaultId: z.string().describe('ID of the vault the item was in')
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

    ctx.progress('Deleting item...');
    await client.deleteItem(ctx.input.vaultId, ctx.input.itemId);

    return {
      output: {
        deleted: true,
        itemId: ctx.input.itemId,
        vaultId: ctx.input.vaultId
      },
      message: `Deleted item \`${ctx.input.itemId}\` from vault \`${ctx.input.vaultId}\`.`
    };
  })
  .build();
