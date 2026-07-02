import { SlateTool } from 'slates';
import { z } from 'zod';
import { BotstarClient } from '../lib/client';
import { spec } from '../spec';

export let listBots = SlateTool.create(spec, {
  name: 'List Bots',
  key: 'list_bots',
  description: `Retrieve all chatbots associated with your BotStar account. Returns bot IDs, names, and team names. Bot IDs are needed for interacting with other resources like users, CMS, and attributes.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      bots: z
        .array(
          z.object({
            botId: z.string().describe('Unique identifier of the bot'),
            name: z.string().describe('Name of the bot'),
            teamName: z.string().optional().describe('Team name associated with the bot')
          })
        )
        .describe('List of bots')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BotstarClient(ctx.auth.token);
    let bots = await client.listBots();

    let mapped = (Array.isArray(bots) ? bots : []).map((bot: any) => ({
      botId: bot.id || bot._id || '',
      name: bot.name || '',
      teamName: bot.team_name
    }));

    return {
      output: { bots: mapped },
      message: `Retrieved **${mapped.length}** bot(s).`
    };
  })
  .build();
