import { SlateTool } from 'slates';
import { z } from 'zod';
import { CustomGPTClient } from '../lib/client';
import { spec } from '../spec';

export let listConversations = SlateTool.create(spec, {
  name: 'List Conversations',
  key: 'list_conversations',
  description: `List all conversations for a specific AI agent. Supports pagination and sorting to browse through conversation history.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.number().describe('ID of the agent'),
      page: z.number().optional().describe('Page number (default: 1)'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      orderBy: z.enum(['id', 'created_at']).optional().describe('Field to sort by')
    })
  )
  .output(
    z.object({
      conversations: z
        .array(
          z.object({
            sessionId: z.string().describe('Conversation session ID'),
            name: z.string().nullable().describe('Conversation name'),
            createdAt: z.string().describe('Creation timestamp'),
            updatedAt: z.string().describe('Last update timestamp')
          })
        )
        .describe('List of conversations'),
      currentPage: z.number().describe('Current page number'),
      totalPages: z.number().describe('Total number of pages'),
      totalConversations: z.number().describe('Total number of conversations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CustomGPTClient({ token: ctx.auth.token });

    let result = await client.listConversations(ctx.input.projectId, {
      page: ctx.input.page,
      order: ctx.input.order,
      orderBy: ctx.input.orderBy
    });

    return {
      output: {
        conversations: result.items,
        currentPage: result.currentPage,
        totalPages: result.lastPage,
        totalConversations: result.total
      },
      message: `Found **${result.total}** conversation(s) for agent **${ctx.input.projectId}**. Showing page **${result.currentPage}** of **${result.lastPage}**.`
    };
  })
  .build();
