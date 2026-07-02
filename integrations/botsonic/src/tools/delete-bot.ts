import { SlateTool } from 'slates';
import { z } from 'zod';
import { BusinessClient } from '../lib/client';
import { spec } from '../spec';

export let deleteBot = SlateTool.create(spec, {
  name: 'Delete Bot',
  key: 'delete_bot',
  description: `Permanently delete a Botsonic chatbot by its ID. This removes the bot and all its associated training data, FAQs, and configuration.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      botId: z.string().describe('The unique identifier of the bot to delete'),
      workspaceId: z.string().optional().describe('Workspace ID the bot belongs to')
    })
  )
  .output(
    z.object({
      botId: z.string().describe('ID of the deleted bot'),
      isDeleted: z.boolean().describe('Whether the bot was successfully marked as deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BusinessClient(ctx.auth.token);

    let result = await client.deleteBot(ctx.input.botId, ctx.input.workspaceId);

    return {
      output: {
        botId: result.id,
        isDeleted: result.is_deleted
      },
      message: `Deleted bot **${result.id}**.`
    };
  })
  .build();
