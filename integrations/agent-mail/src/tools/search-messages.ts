import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchMessages = SlateTool.create(spec, {
  name: 'Search Messages',
  key: 'search_messages',
  description:
    'Find email messages by sender, recipients, subject, and body text, ranked by relevance. Spam, blocked, unauthenticated, and trashed results are excluded.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      inboxId: z
        .string()
        .describe('Inbox to search. Call list_inboxes to discover inbox IDs.'),
      query: z.string().min(1).describe('Full-text search query.'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum results per page, up to 100.'),
      pageToken: z.string().optional().describe('Cursor from a previous search response.'),
      before: z.string().optional().describe('Only results before this ISO 8601 timestamp.'),
      after: z.string().optional().describe('Only results after this ISO 8601 timestamp.')
    })
  )
  .output(
    z.object({
      count: z.number(),
      nextPageToken: z.string().optional(),
      messages: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Complete matching message summaries from AgentMail, in relevance order.')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({
      token: ctx.auth.token,
      podId: ctx.config.podId
    }).searchMessages(ctx.input.inboxId, ctx.input.query, ctx.input);
    return {
      output: {
        count: result.count,
        nextPageToken: result.nextPageToken,
        messages: result.messages.map(item => ({ ...item }))
      },
      message: `Found ${result.count} matching messages.`
    };
  })
  .build();
