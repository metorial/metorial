import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let deleteApp = SlateTool.create(spec, {
  name: 'Delete App',
  key: 'delete_app',
  description: `Delete a Fly App and all its associated resources. Use force to stop all running Machines before deletion.`,
  constraints: [
    'Machines should be stopped before deletion unless force is set to true.',
    'This action is irreversible.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      appName: z.string().describe('Name of the Fly App to delete'),
      force: z.boolean().optional().describe('Force-stop all Machines and delete immediately')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the app was deleted successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deleteApp(ctx.input.appName, ctx.input.force);

    return {
      output: { deleted: true },
      message: `Deleted app **${ctx.input.appName}**${ctx.input.force ? ' (force)' : ''}.`
    };
  })
  .build();
