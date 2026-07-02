import { SlateTool } from 'slates';
import { z } from 'zod';
import { BusinessClient } from '../lib/client';
import { spec } from '../spec';

export let createBot = SlateTool.create(spec, {
  name: 'Create Bot',
  key: 'create_bot',
  description: `Create a new Botsonic chatbot. After creation, you can upload training data and configure FAQs and starter questions to customize the bot's behavior.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('Name for the new bot'),
      templateId: z
        .enum(['e_commerce', 'customer_support', 'personalized', 'openai_assistant', 'agent'])
        .optional()
        .describe('Bot template type'),
      workspaceId: z.string().optional().describe('Workspace to create the bot in')
    })
  )
  .output(
    z.object({
      botId: z.string().describe('Unique identifier of the created bot'),
      ownerId: z.string().describe('Owner identifier'),
      workspaceId: z.string().describe('Workspace the bot belongs to'),
      templateId: z.string().describe('Bot template type'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BusinessClient(ctx.auth.token);

    let params: Record<string, any> = {};
    if (ctx.input.name) params.name = ctx.input.name;
    if (ctx.input.templateId) params.bot_template_id = ctx.input.templateId;
    if (ctx.input.workspaceId) params.workspace_id = ctx.input.workspaceId;

    let bot = await client.createBot(params);

    return {
      output: {
        botId: bot.id,
        ownerId: bot.owner_id,
        workspaceId: bot.workspace_id,
        templateId: bot.bot_template_id || '',
        createdAt: bot.created_at
      },
      message: `Created bot **${bot.id}** with template "${bot.bot_template_id || 'default'}".`
    };
  })
  .build();
