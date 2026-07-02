import { SlateTool } from 'slates';
import { z } from 'zod';
import { BotstarClient } from '../lib/client';
import { spec } from '../spec';

export let getBot = SlateTool.create(spec, {
  name: 'Get Bot',
  key: 'get_bot',
  description: `Retrieve details for a specific chatbot by its ID, including its name and team association.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      botId: z.string().describe('ID of the bot to retrieve')
    })
  )
  .output(
    z.object({
      botId: z.string().describe('Unique identifier of the bot'),
      name: z.string().describe('Name of the bot'),
      teamName: z.string().optional().describe('Team name associated with the bot')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BotstarClient(ctx.auth.token);
    let bot = await client.getBot(ctx.input.botId);

    return {
      output: {
        botId: bot.id || bot._id || '',
        name: bot.name || '',
        teamName: bot.team_name
      },
      message: `Retrieved bot **${bot.name}**.`
    };
  })
  .build();
