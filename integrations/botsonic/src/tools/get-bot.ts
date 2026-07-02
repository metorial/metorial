import { SlateTool } from 'slates';
import { z } from 'zod';
import { BusinessClient } from '../lib/client';
import { spec } from '../spec';

export let getBot = SlateTool.create(spec, {
  name: 'Get Bot',
  key: 'get_bot',
  description: `Retrieve detailed information about a specific Botsonic bot by its ID, including its configuration, template, and API key.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      botId: z.string().describe('The unique identifier of the bot to retrieve'),
      workspaceId: z.string().optional().describe('Workspace ID to filter by'),
      includeApiKey: z
        .boolean()
        .optional()
        .describe('If true, also retrieves the bot-specific API key')
    })
  )
  .output(
    z.object({
      botId: z.string().describe('Unique bot identifier'),
      ownerId: z.string().describe('Owner identifier'),
      workspaceId: z.string().describe('Workspace the bot belongs to'),
      isDeleted: z.boolean().describe('Whether the bot is deleted'),
      isShared: z.boolean().describe('Whether the bot is shared'),
      vectorstore: z.string().describe('Vector store type used by the bot'),
      templateId: z.string().describe('Bot template type'),
      botInfoConfig: z
        .record(z.string(), z.any())
        .describe('Bot display and info configuration'),
      botPromptConfig: z
        .record(z.string(), z.any())
        .describe('Bot prompt and behavior configuration'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp'),
      apiKey: z.any().optional().describe('Bot-specific API key (if requested)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BusinessClient(ctx.auth.token);

    let bot = await client.getBot(ctx.input.botId, ctx.input.workspaceId);

    let apiKey: any;
    if (ctx.input.includeApiKey) {
      apiKey = await client.getBotApiKey(ctx.input.botId);
    }

    return {
      output: {
        botId: bot.id,
        ownerId: bot.owner_id,
        workspaceId: bot.workspace_id,
        isDeleted: bot.is_deleted,
        isShared: bot.is_shared,
        vectorstore: bot.vectorstore,
        templateId: bot.bot_template_id || '',
        botInfoConfig: bot.bot_info_config || {},
        botPromptConfig: bot.bot_prompt_config || {},
        createdAt: bot.created_at,
        updatedAt: bot.updated_at,
        apiKey
      },
      message: `Retrieved bot **${bot.id}** (template: ${bot.bot_template_id || 'N/A'}).${apiKey ? ' API key included.' : ''}`
    };
  })
  .build();
