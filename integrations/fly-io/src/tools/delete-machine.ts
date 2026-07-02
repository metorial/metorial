import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let deleteMachine = SlateTool.create(spec, {
  name: 'Delete Machine',
  key: 'delete_machine',
  description: `Permanently destroy a Fly Machine. Use force to stop a running machine before deletion. This action cannot be undone.`,
  tags: {
    destructive: true
  },
  constraints: [
    'This action cannot be undone. The machine and its data will be permanently deleted.'
  ]
})
  .input(
    z.object({
      appName: z.string().describe('Name of the Fly App'),
      machineId: z.string().describe('ID of the machine to delete'),
      force: z
        .boolean()
        .optional()
        .describe('Force-stop the machine before deletion if it is running')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the machine was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deleteMachine(ctx.input.appName, ctx.input.machineId, ctx.input.force);

    return {
      output: { deleted: true },
      message: `Deleted machine **${ctx.input.machineId}**${ctx.input.force ? ' (force-stopped first)' : ''}.`
    };
  })
  .build();
