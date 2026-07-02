import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let managePush = SlateTool.create(spec, {
  name: 'Manage Push',
  key: 'manage_push',
  description: `Dismiss or delete an existing push by its identifier. Use **dismiss** to mark a push as read/acknowledged across all devices, or **delete** to permanently remove it.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      pushIden: z.string().describe('Unique identifier of the push to manage'),
      action: z.enum(['dismiss', 'delete']).describe('Action to perform on the push')
    })
  )
  .output(
    z.object({
      pushIden: z.string().describe('Identifier of the managed push'),
      action: z.string().describe('Action that was performed'),
      success: z.boolean().describe('Whether the action was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'dismiss') {
      await client.updatePush(ctx.input.pushIden, { dismissed: true });
    } else {
      await client.deletePush(ctx.input.pushIden);
    }

    return {
      output: {
        pushIden: ctx.input.pushIden,
        action: ctx.input.action,
        success: true
      },
      message: `Push \`${ctx.input.pushIden}\` has been **${ctx.input.action === 'dismiss' ? 'dismissed' : 'deleted'}**.`
    };
  })
  .build();
