import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageConversationTool = SlateTool.create(spec, {
  name: 'Manage Conversation',
  key: 'manage_conversation',
  description: `Create, update, delete, or fetch conversations. Conversations are interactive sessions between users and AI bots. Supports creating new conversations linked to bots, updating settings, and retrieving conversation details.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete', 'fetch']).describe('Action to perform'),
      conversationId: z
        .string()
        .optional()
        .describe('Conversation ID (required for update, delete, fetch)'),
      botId: z.string().optional().describe('Bot ID to link the conversation to'),
      backstory: z.string().optional().describe('Override backstory for this conversation'),
      model: z.string().optional().describe('Override AI model for this conversation'),
      datasetId: z.string().optional().describe('Override dataset for this conversation'),
      skillsetId: z.string().optional().describe('Override skillset for this conversation'),
      meta: z.record(z.string(), z.any()).optional().describe('Arbitrary metadata')
    })
  )
  .output(
    z.object({
      conversationId: z.string().describe('Conversation ID'),
      botId: z.string().optional().describe('Linked bot ID'),
      model: z.string().optional().describe('AI model used'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      runAsUserId: ctx.config.runAsUserId
    });

    let { action, conversationId, botId, backstory, model, datasetId, skillsetId, meta } =
      ctx.input;

    if (action === 'create') {
      let result = await client.createConversation({
        botId,
        backstory,
        model,
        datasetId,
        skillsetId,
        meta
      });
      return {
        output: {
          conversationId: result.id,
          botId: result.botId,
          model: result.model,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt
        },
        message: `Conversation **${result.id}** created.`
      };
    }

    if (action === 'fetch') {
      if (!conversationId) throw new Error('conversationId is required for fetch');
      let result = await client.fetchConversation(conversationId);
      return {
        output: {
          conversationId: result.id,
          botId: result.botId,
          model: result.model,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt
        },
        message: `Fetched conversation **${result.id}**.`
      };
    }

    if (action === 'update') {
      if (!conversationId) throw new Error('conversationId is required for update');
      let updateData: Record<string, any> = {};
      if (botId !== undefined) updateData.botId = botId;
      if (backstory !== undefined) updateData.backstory = backstory;
      if (model !== undefined) updateData.model = model;
      if (datasetId !== undefined) updateData.datasetId = datasetId;
      if (skillsetId !== undefined) updateData.skillsetId = skillsetId;
      if (meta !== undefined) updateData.meta = meta;
      let result = await client.updateConversation(conversationId, updateData);
      return {
        output: {
          conversationId: result.id || conversationId,
          botId: result.botId,
          model: result.model,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt
        },
        message: `Conversation **${conversationId}** updated.`
      };
    }

    if (action === 'delete') {
      if (!conversationId) throw new Error('conversationId is required for delete');
      await client.deleteConversation(conversationId);
      return {
        output: {
          conversationId
        },
        message: `Conversation **${conversationId}** deleted.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
