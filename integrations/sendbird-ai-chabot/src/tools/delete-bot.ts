import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteBot = SlateTool.create(spec, {
  name: 'Delete Bot',
  key: 'delete_bot',
  description: `Permanently deletes a bot from your Sendbird application. The bot will be removed from all channels it has joined.`,
  instructions: [
    'This action is irreversible. Make sure you want to delete the bot before proceeding.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      botUserId: z.string().describe('User ID of the bot to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the bot was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      applicationId: ctx.config.applicationId
    });

    await client.deleteBot(ctx.input.botUserId);

    return {
      output: {
        deleted: true
      },
      message: `Successfully deleted bot **${ctx.input.botUserId}**.`
    };
  })
  .build();
