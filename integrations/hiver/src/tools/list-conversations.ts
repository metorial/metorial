import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listConversations = SlateTool.create(spec, {
  name: 'List Conversations',
  key: 'list_conversations',
  description: `Retrieve conversations from a shared inbox with pagination support. Returns a list of conversations along with a pagination token for fetching subsequent pages. Use sorting options to control the order of results.`,
  constraints: [
    'Rate limit: 1 request per second, 5000 requests per day',
    'Results per page: 10-100 (default: 10)'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      inboxId: z.string().describe('ID of the inbox to list conversations from'),
      limit: z
        .number()
        .min(10)
        .max(100)
        .optional()
        .describe('Number of results per page (10-100, default: 10)'),
      sortBy: z.string().optional().describe('Field to sort results by'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      nextPage: z.string().optional().describe('Pagination token for the next page of results')
    })
  )
  .output(
    z.object({
      conversations: z
        .array(
          z.object({
            conversationId: z.string().describe('Unique identifier of the conversation'),
            subject: z.string().optional().describe('Subject of the conversation'),
            status: z.string().optional().describe('Current status of the conversation'),
            assignee: z
              .record(z.string(), z.unknown())
              .optional()
              .describe('Assignee of the conversation'),
            tags: z
              .array(z.record(z.string(), z.unknown()))
              .optional()
              .describe('Tags applied to the conversation'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            updatedAt: z.string().optional().describe('Last update timestamp')
          })
        )
        .describe('List of conversations'),
      nextPage: z
        .string()
        .optional()
        .describe('Pagination token for next page, if more results exist')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listConversations(ctx.input.inboxId, {
      limit: ctx.input.limit,
      sortBy: ctx.input.sortBy,
      sortOrder: ctx.input.sortOrder,
      nextPage: ctx.input.nextPage
    });

    let conversations = result.results.map(c => ({
      conversationId: String(c.id),
      subject: c.subject,
      status: c.status,
      assignee: c.assignee,
      tags: c.tags,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt
    }));

    return {
      output: {
        conversations,
        nextPage: result.nextPage
      },
      message: `Retrieved **${conversations.length}** conversation(s).${result.nextPage ? ' More results available.' : ''}`
    };
  });
