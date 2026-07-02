import { SlateTool } from 'slates';
import { z } from 'zod';
import { BotbabaClient } from '../lib/client';
import { spec } from '../spec';

export let listBots = SlateTool.create(spec, {
  name: 'List Bots',
  key: 'list_bots',
  description: `Retrieve all chatbots associated with your Botbaba account. Returns a list of bots with their configuration details, including bot IDs, names, and settings.
Use this to discover available bots before performing other operations such as sending WhatsApp messages.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      bots: z.array(z.record(z.string(), z.unknown())).describe('List of bots in the account'),
      totalCount: z.number().describe('Total number of bots returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BotbabaClient({
      token: ctx.auth.token
    });

    let bots = await client.getBots();

    return {
      output: {
        bots,
        totalCount: bots.length
      },
      message: `Found **${bots.length}** bot(s) in your Botbaba account.`
    };
  })
  .build();
