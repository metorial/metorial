import { SlateTool } from 'slates';
import { z } from 'zod';
import { DocsBotAdminClient } from '../lib/client';
import { spec } from '../spec';

export let createBot = SlateTool.create(spec, {
  name: 'Create Bot',
  key: 'create_bot',
  description: `Create a new AI chatbot for the configured team. Requires a name, description, privacy level, and language. Optionally specify the AI model or duplicate an existing bot.`
})
  .input(
    z.object({
      name: z.string().describe('Bot name'),
      description: z.string().describe('Bot description'),
      privacy: z.enum(['public', 'private']).describe('Privacy level for the bot'),
      language: z.string().describe('Language code (e.g. "en", "es", "jp")'),
      model: z
        .string()
        .optional()
        .describe('AI model to use (e.g. "gpt-4o", "gpt-4o-mini", "gpt-4.1")'),
      embeddingModel: z
        .string()
        .optional()
        .describe('Embedding model; defaults based on plan tier'),
      copyFromBotId: z
        .string()
        .optional()
        .describe('Existing bot ID to duplicate settings and sources from')
    })
  )
  .output(
    z.object({
      botId: z.string().describe('Unique bot identifier'),
      name: z.string().describe('Bot name'),
      description: z.string().describe('Bot description'),
      status: z.string().describe('Bot status (typically "pending" after creation)'),
      model: z.string().describe('AI model used'),
      privacy: z.string().describe('Privacy level'),
      language: z.string().describe('Language code'),
      createdAt: z.string().describe('ISO 8601 creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DocsBotAdminClient(ctx.auth.token);

    let bot = await client.createBot(ctx.config.teamId, {
      name: ctx.input.name,
      description: ctx.input.description,
      privacy: ctx.input.privacy,
      language: ctx.input.language,
      model: ctx.input.model,
      embeddingModel: ctx.input.embeddingModel,
      copyFrom: ctx.input.copyFromBotId
    });

    return {
      output: {
        botId: bot.id,
        name: bot.name,
        description: bot.description,
        status: bot.status,
        model: bot.model,
        privacy: bot.privacy,
        language: bot.language,
        createdAt: bot.createdAt
      },
      message: `Created bot **${bot.name}** (ID: \`${bot.id}\`, status: ${bot.status})`
    };
  })
  .build();
