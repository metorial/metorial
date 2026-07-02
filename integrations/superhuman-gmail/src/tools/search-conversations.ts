import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchConversations = SlateTool.create(spec, {
  name: 'Search Conversations',
  key: 'search_conversations',
  description:
    'List Gmail **threads** (conversations) matching a query or label filters. Optimized for inbox triage: same search operators as the Gmail search bar (`is:unread`, `from:`, `label:`, `after:`, etc.).',
  instructions: [
    'Prefer **thread** listing over single-message search when triaging inbox or following conversations.',
    'Combine **query** with **labelIds** (e.g. INBOX, UNREAD) to narrow results.',
    'Use **pageToken** from the previous response to paginate.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe('Gmail search query (same syntax as gmail.com search).'),
      labelIds: z
        .array(z.string())
        .optional()
        .describe('Restrict to threads that have all of these label IDs (system or custom).'),
      maxResults: z
        .number()
        .optional()
        .default(20)
        .describe('Maximum threads to return (max 500 per Gmail API page).'),
      pageToken: z.string().optional().describe('Pagination token from a prior call.'),
      includeSpamTrash: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include threads in SPAM or TRASH.')
    })
  )
  .output(
    z.object({
      conversations: z.array(
        z.object({
          threadId: z.string(),
          snippet: z.string(),
          historyId: z.string()
        })
      ),
      nextPageToken: z.string().optional(),
      resultSizeEstimate: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      userId: ctx.config.userId
    });

    let result = await client.listThreads({
      query: ctx.input.query,
      labelIds: ctx.input.labelIds,
      maxResults: ctx.input.maxResults,
      pageToken: ctx.input.pageToken,
      includeSpamTrash: ctx.input.includeSpamTrash
    });

    return {
      output: {
        conversations: result.threads.map(t => ({
          threadId: t.id,
          snippet: t.snippet,
          historyId: t.historyId
        })),
        nextPageToken: result.nextPageToken,
        resultSizeEstimate: result.resultSizeEstimate
      },
      message: `Found **${result.resultSizeEstimate}** matching conversations; returned **${result.threads.length}**.`
    };
  });
