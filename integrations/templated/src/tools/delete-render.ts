import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteRender = SlateTool.create(spec, {
  name: 'Delete Render',
  key: 'delete_render',
  description: `Permanently delete a render by its ID. This action is irreversible.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      renderId: z.string().describe('ID of the render to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    await client.deleteRender(ctx.input.renderId);

    return {
      output: { deleted: true },
      message: `Render **${ctx.input.renderId}** has been deleted.`
    };
  })
  .build();
