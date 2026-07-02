import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deletePhantom = SlateTool.create(spec, {
  name: 'Delete Phantom',
  key: 'delete_phantom',
  description: `Permanently delete a Phantom from your workspace. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      phantomId: z.string().describe('ID of the Phantom to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the Phantom was deleted successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteAgent(ctx.input.phantomId);

    return {
      output: { deleted: true },
      message: `Phantom **${ctx.input.phantomId}** has been deleted.`
    };
  })
  .build();
