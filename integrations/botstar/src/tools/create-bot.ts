import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { BotstarClient } from '../lib/client';
import { spec } from '../spec';

export let createBot = SlateTool.create(spec, {
  name: 'Create Bot',
  key: 'create_bot',
  description:
    'Create an empty chatbot in your BotStar account and return its ID. Build its conversation flow in the BotStar editor before publishing it.'
})
  .input(z.object({ name: z.string().min(1).max(250).describe('Name of the new bot') }))
  .output(
    z.object({
      botId: z.string().describe('ID of the created bot'),
      name: z.string().describe('Name of the created bot')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BotstarClient(ctx.auth.token);
    let bot = await client.createBot(ctx.input.name);
    let botId = bot?.id || bot?._id;
    if (!botId) throw createApiServiceError('BotStar did not return the created bot ID.');

    return {
      output: { botId, name: bot.name ?? ctx.input.name },
      message: `Created bot **${bot.name ?? ctx.input.name}**.`
    };
  })
  .build();
