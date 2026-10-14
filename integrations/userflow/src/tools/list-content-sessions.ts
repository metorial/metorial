import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listContentSessions = SlateTool.create(spec, {
  name: 'List Content Sessions',
  key: 'list_content_sessions',
  description:
    'Lists onboarding sessions, completion state, progress, and survey answers. Filter by user or content and paginate through the results.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      contentId: z
        .string()
        .optional()
        .describe(
          'Only include sessions for this content item. Call list_content to find content IDs.'
        ),
      userId: z.string().optional().describe('Only include sessions for this user.'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum sessions to return (1–100, default 10).'),
      startingAfter: z.string().optional().describe('Last session ID from the previous page.'),
      orderBy: z
        .string()
        .optional()
        .describe(
          'Sort by created_at or last_activity_at. Prefix with - for descending order.'
        ),
      expand: z
        .array(z.string())
        .optional()
        .describe(
          'Related objects to expand, such as answers, content, user, group, or version.'
        )
    })
  )
  .output(
    z.object({
      sessions: z
        .array(z.record(z.string(), z.unknown()))
        .describe(
          'Session objects with id, user_id, content_id, version_id, progress, completion state, timestamps, and requested expanded objects.'
        ),
      hasMore: z.boolean().describe('Whether more sessions are available'),
      nextPageUrl: z.string().nullable().describe('URL for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, apiVersion: ctx.config.apiVersion });
    let result = await client.listContentSessions(ctx.input);
    return {
      output: {
        sessions: result.data,
        hasMore: result.has_more,
        nextPageUrl: result.next_page_url
      },
      message: `Retrieved **${result.data.length}** content session(s).`
    };
  })
  .build();
