import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let deleteScript = SlateTool.create(spec, {
  name: 'Delete Worker',
  key: 'delete_script',
  description: `Delete a Worker script from the account. Optionally force-deletes associated resources like bindings and durable objects.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      scriptName: z.string().describe('Name of the Worker script to delete'),
      force: z
        .boolean()
        .optional()
        .describe(
          'When true, also deletes associated bindings, durable objects, and other resources'
        )
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deleteScript(ctx.input.scriptName, ctx.input.force);

    return {
      output: { deleted: true },
      message: `Worker **${ctx.input.scriptName}** has been deleted${ctx.input.force ? ' (force mode, associated resources also removed)' : ''}.`
    };
  })
  .build();
