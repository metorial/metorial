import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteActions = SlateTool.create(spec, {
  name: 'Delete Actions',
  key: 'delete_actions',
  description: `Delete one or more corrective actions by their IDs. This is a destructive operation and cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      actionIds: z.array(z.string()).describe('IDs of the actions to delete')
    })
  )
  .output(
    z.object({
      deletedCount: z.number().describe('Number of actions deleted'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteActions(ctx.input.actionIds);

    return {
      output: {
        deletedCount: ctx.input.actionIds.length,
        success: true
      },
      message: `Deleted **${ctx.input.actionIds.length}** action(s).`
    };
  })
  .build();
