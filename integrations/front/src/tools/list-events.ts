import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listEvents = SlateTool.create(spec, {
  name: 'List Events',
  key: 'list_events',
  description: `List recent events across the company or for a specific conversation. Events track actions like assignments, messages, tags, comments, and status changes. Useful for auditing activity or building activity feeds.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      conversationId: z
        .string()
        .optional()
        .describe('If provided, only list events for this conversation'),
      pageToken: z.string().optional().describe('Pagination token'),
      limit: z.number().optional().describe('Maximum number of results')
    })
  )
  .output(
    z.object({
      events: z.array(
        z.object({
          eventId: z.string(),
          type: z.string(),
          emittedAt: z.number(),
          conversationId: z.string().optional(),
          conversationSubject: z.string().optional(),
          sourceType: z.string().optional(),
          targetType: z.string().optional()
        })
      ),
      nextPageToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result: any;
    if (ctx.input.conversationId) {
      result = await client.listConversationEvents(ctx.input.conversationId, {
        page_token: ctx.input.pageToken,
        limit: ctx.input.limit
      });
    } else {
      result = await client.listEvents({
        page_token: ctx.input.pageToken,
        limit: ctx.input.limit
      });
    }

    let events = result._results.map((e: any) => ({
      eventId: e.id,
      type: e.type,
      emittedAt: e.emitted_at,
      conversationId: e.conversation?.id,
      conversationSubject: e.conversation?.subject,
      sourceType: e.source?._meta?.type,
      targetType: e.target?._meta?.type
    }));

    return {
      output: { events, nextPageToken: result._pagination?.next || undefined },
      message: `Found **${events.length}** events${ctx.input.conversationId ? ` for conversation ${ctx.input.conversationId}` : ''}.`
    };
  });
