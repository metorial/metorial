import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageBotTool = SlateTool.create(spec, {
  name: 'Manage Bot',
  key: 'manage_bot',
  description: `Create, update, delete, or fetch ChatBotKit bots. Bots are conversational AI systems with a backstory, AI model, dataset, and skillset. Use this to configure bot behavior, personality, and capabilities.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete', 'fetch'])
        .describe('Action to perform on the bot'),
      botId: z.string().optional().describe('Bot ID (required for update, delete, fetch)'),
      name: z.string().optional().describe('Bot display name'),
      description: z.string().optional().describe('Bot description'),
      backstory: z
        .string()
        .optional()
        .describe('Natural language instructions defining the bot personality and behavior'),
      model: z.string().optional().describe('AI model identifier (e.g. gpt-4, claude-3)'),
      datasetId: z.string().optional().describe('ID of the dataset to attach to the bot'),
      skillsetId: z.string().optional().describe('ID of the skillset to attach to the bot'),
      privacy: z.boolean().optional().describe('Enable privacy features'),
      moderation: z.boolean().optional().describe('Enable content moderation'),
      meta: z.record(z.string(), z.any()).optional().describe('Arbitrary metadata')
    })
  )
  .output(
    z.object({
      botId: z.string().describe('Bot ID'),
      name: z.string().optional().describe('Bot name'),
      description: z.string().optional().describe('Bot description'),
      backstory: z.string().optional().describe('Bot backstory'),
      model: z.string().optional().describe('AI model'),
      datasetId: z.string().optional().describe('Attached dataset ID'),
      skillsetId: z.string().optional().describe('Attached skillset ID'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      runAsUserId: ctx.config.runAsUserId
    });

    let {
      action,
      botId,
      name,
      description,
      backstory,
      model,
      datasetId,
      skillsetId,
      privacy,
      moderation,
      meta
    } = ctx.input;

    if (action === 'create') {
      let result = await client.createBot({
        name,
        description,
        backstory,
        model,
        datasetId,
        skillsetId,
        privacy,
        moderation,
        meta
      });
      return {
        output: {
          botId: result.id,
          name: result.name,
          description: result.description,
          backstory: result.backstory,
          model: result.model,
          datasetId: result.datasetId,
          skillsetId: result.skillsetId,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt
        },
        message: `Bot **${result.name || result.id}** created successfully.`
      };
    }

    if (action === 'fetch') {
      if (!botId) throw new Error('botId is required for fetch');
      let result = await client.fetchBot(botId);
      return {
        output: {
          botId: result.id,
          name: result.name,
          description: result.description,
          backstory: result.backstory,
          model: result.model,
          datasetId: result.datasetId,
          skillsetId: result.skillsetId,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt
        },
        message: `Fetched bot **${result.name || result.id}**.`
      };
    }

    if (action === 'update') {
      if (!botId) throw new Error('botId is required for update');
      let updateData: Record<string, any> = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (backstory !== undefined) updateData.backstory = backstory;
      if (model !== undefined) updateData.model = model;
      if (datasetId !== undefined) updateData.datasetId = datasetId;
      if (skillsetId !== undefined) updateData.skillsetId = skillsetId;
      if (privacy !== undefined) updateData.privacy = privacy;
      if (moderation !== undefined) updateData.moderation = moderation;
      if (meta !== undefined) updateData.meta = meta;
      let result = await client.updateBot(botId, updateData);
      return {
        output: {
          botId: result.id || botId,
          name: result.name,
          description: result.description,
          backstory: result.backstory,
          model: result.model,
          datasetId: result.datasetId,
          skillsetId: result.skillsetId,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt
        },
        message: `Bot **${botId}** updated successfully.`
      };
    }

    if (action === 'delete') {
      if (!botId) throw new Error('botId is required for delete');
      await client.deleteBot(botId);
      return {
        output: {
          botId
        },
        message: `Bot **${botId}** deleted successfully.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
