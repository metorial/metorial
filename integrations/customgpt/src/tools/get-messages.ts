import { SlateTool } from 'slates';
import { z } from 'zod';
import { CustomGPTClient } from '../lib/client';
import { spec } from '../spec';

export let getMessages = SlateTool.create(spec, {
  name: 'Get Messages',
  key: 'get_messages',
  description: `Retrieve messages from a conversation, including user queries and agent responses with citations. Supports pagination for long conversations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.number().describe('ID of the agent'),
      sessionId: z.string().describe('Session ID of the conversation'),
      page: z.number().optional().describe('Page number (default: 1)'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort direction')
    })
  )
  .output(
    z.object({
      messages: z
        .array(
          z.object({
            promptId: z.number().describe('Message prompt ID'),
            userQuery: z.string().describe('The user query'),
            agentResponse: z.string().describe('The agent response'),
            citations: z.array(z.record(z.string(), z.unknown())).describe('Citation sources'),
            createdAt: z.string().describe('Message timestamp')
          })
        )
        .describe('List of messages'),
      currentPage: z.number().describe('Current page number'),
      totalPages: z.number().describe('Total number of pages'),
      totalMessages: z.number().describe('Total number of messages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CustomGPTClient({ token: ctx.auth.token });

    let result = await client.listMessages(ctx.input.projectId, ctx.input.sessionId, {
      page: ctx.input.page,
      order: ctx.input.order
    });

    return {
      output: {
        messages: result.items.map(m => ({
          promptId: m.promptId,
          userQuery: m.userQuery,
          agentResponse: m.openaiResponse,
          citations: m.citations,
          createdAt: m.createdAt
        })),
        currentPage: result.currentPage,
        totalPages: result.lastPage,
        totalMessages: result.total
      },
      message: `Retrieved **${result.items.length}** message(s) from conversation **${ctx.input.sessionId}** (page ${result.currentPage}/${result.lastPage}).`
    };
  })
  .build();
