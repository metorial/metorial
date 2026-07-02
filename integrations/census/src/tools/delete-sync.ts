import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteSync = SlateTool.create(spec, {
  name: 'Delete Sync',
  key: 'delete_sync',
  description: `Permanently deletes a sync configuration. This does not affect data already synced to the destination, but stops all future sync runs.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      syncId: z.number().describe('ID of the sync to delete.')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the sync was successfully deleted.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    await client.deleteSync(ctx.input.syncId);

    return {
      output: {
        deleted: true
      },
      message: `Deleted sync **${ctx.input.syncId}**.`
    };
  })
  .build();
