import { SlateTool } from 'slates';
import { z } from 'zod';
import { BotstarClient } from '../lib/client';
import { botIdSchema, botScopeGuidance } from '../lib/schemas';
import { spec } from '../spec';

export let publishBot = SlateTool.create(spec, {
  name: 'Publish Bot',
  key: 'publish_bot',
  description: `Publish a bot to the live environment. This makes all draft changes available to real users on the connected platforms (website, Messenger). ${botScopeGuidance}`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      botId: botIdSchema
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the bot was published successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BotstarClient(ctx.auth.token);
    await client.publishBot(ctx.input.botId);

    return {
      output: { success: true },
      message: `Published bot **${ctx.input.botId}** to live.`
    };
  })
  .build();
