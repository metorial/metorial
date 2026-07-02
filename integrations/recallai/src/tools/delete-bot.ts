import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteBotTool = SlateTool.create(spec, {
  name: 'Delete Bot',
  key: 'delete_bot',
  description: `Delete a scheduled bot that has not yet been dispatched. This permanently removes the bot and cancels its scheduled join.`,
  constraints: ['Only non-dispatched (scheduled) bots can be deleted.'],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      botId: z.string().describe('The unique identifier of the bot to delete')
    })
  )
  .output(
    z.object({
      botId: z.string().describe('ID of the deleted bot'),
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    await client.deleteBot(ctx.input.botId);

    return {
      output: {
        botId: ctx.input.botId,
        deleted: true
      },
      message: `Bot ${ctx.input.botId} has been deleted.`
    };
  })
  .build();
