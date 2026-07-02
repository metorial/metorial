import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageMemoryTool = SlateTool.create(spec, {
  name: 'Manage Memory',
  key: 'manage_memory',
  description: `Create, update, delete, fetch, or search memories. Memories are persistent data units that store information associated with bots and contacts, enabling context recall and personalized experiences across conversations. Supports semantic search for finding relevant memories.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete', 'fetch', 'search_bot', 'search_contact'])
        .describe('Action to perform'),
      memoryId: z
        .string()
        .optional()
        .describe('Memory ID (required for update, delete, fetch)'),
      text: z.string().optional().describe('Memory text content'),
      botId: z
        .string()
        .optional()
        .describe('Bot ID to associate the memory with (or to search within)'),
      contactId: z
        .string()
        .optional()
        .describe('Contact ID to associate the memory with (or to search within)'),
      searchQuery: z
        .string()
        .optional()
        .describe('Semantic search query for finding relevant memories'),
      meta: z.record(z.string(), z.any()).optional().describe('Arbitrary metadata')
    })
  )
  .output(
    z.object({
      memoryId: z.string().optional().describe('Memory ID'),
      text: z.string().optional().describe('Memory text content'),
      botId: z.string().optional().describe('Associated bot ID'),
      contactId: z.string().optional().describe('Associated contact ID'),
      results: z.array(z.record(z.string(), z.any())).optional().describe('Search results'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      runAsUserId: ctx.config.runAsUserId
    });

    let { action, memoryId, text, botId, contactId, searchQuery, meta } = ctx.input;

    if (action === 'create') {
      if (!text) throw new Error('text is required to create a memory');
      let result = await client.createMemory({ text, botId, contactId, meta });
      return {
        output: {
          memoryId: result.id,
          text: result.text,
          botId: result.botId,
          contactId: result.contactId,
          createdAt: result.createdAt
        },
        message: `Memory **${result.id}** created.`
      };
    }

    if (action === 'fetch') {
      if (!memoryId) throw new Error('memoryId is required for fetch');
      let result = await client.fetchMemory(memoryId);
      return {
        output: {
          memoryId: result.id,
          text: result.text,
          botId: result.botId,
          contactId: result.contactId,
          createdAt: result.createdAt
        },
        message: `Fetched memory **${result.id}**.`
      };
    }

    if (action === 'update') {
      if (!memoryId) throw new Error('memoryId is required for update');
      let updateData: Record<string, any> = {};
      if (text !== undefined) updateData.text = text;
      if (meta !== undefined) updateData.meta = meta;
      await client.updateMemory(memoryId, updateData);
      return {
        output: { memoryId, text },
        message: `Memory **${memoryId}** updated.`
      };
    }

    if (action === 'delete') {
      if (!memoryId) throw new Error('memoryId is required for delete');
      await client.deleteMemory(memoryId);
      return {
        output: { memoryId },
        message: `Memory **${memoryId}** deleted.`
      };
    }

    if (action === 'search_bot') {
      if (!botId) throw new Error('botId is required for search_bot');
      if (!searchQuery) throw new Error('searchQuery is required for search');
      let result = await client.searchBotMemories(botId, searchQuery);
      let items = result.items || result.memories || [];
      return {
        output: { botId, results: items },
        message: `Found **${items.length}** memories for bot **${botId}**.`
      };
    }

    if (action === 'search_contact') {
      if (!contactId) throw new Error('contactId is required for search_contact');
      if (!searchQuery) throw new Error('searchQuery is required for search');
      let result = await client.searchContactMemories(contactId, searchQuery);
      let items = result.items || result.memories || [];
      return {
        output: { contactId, results: items },
        message: `Found **${items.length}** memories for contact **${contactId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
