import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteAction = SlateTool.create(spec, {
  name: 'Delete Action',
  key: 'delete_action',
  description: `Delete an action (task) from OnePageCRM by its ID.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      actionId: z.string().describe('ID of the action to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the action was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      userId: ctx.auth.userId,
      token: ctx.auth.token
    });

    await client.deleteAction(ctx.input.actionId);

    return {
      output: { deleted: true },
      message: `Deleted action ${ctx.input.actionId}.`
    };
  })
  .build();
