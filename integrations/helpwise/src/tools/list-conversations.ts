import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listConversations = SlateTool.create(spec, {
  name: 'List Conversations',
  key: 'list_conversations',
  description: `Retrieve conversations (threads) from your Helpwise mailboxes. Provide mailboxId for the current API, with labelId and pageToken to select a folder and continue pagination. Status, tag, query, and numbered pages retain legacy behavior.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      mailboxId: z.string().optional().describe('Filter conversations by mailbox ID'),
      status: z
        .string()
        .optional()
        .describe('Filter by conversation status (e.g., open, closed)'),
      tagId: z.string().optional().describe('Filter by tag ID'),
      query: z.string().optional().describe('Search query to filter conversations'),
      limit: z
        .number()
        .positive()
        .refine(Number.isSafeInteger)
        .optional()
        .describe('Maximum number of conversations to return'),
      page: z
        .number()
        .positive()
        .refine(Number.isSafeInteger)
        .optional()
        .describe('Legacy page number; use pageToken with mailboxId for the current API'),
      pageToken: z
        .string()
        .optional()
        .describe('nextPageToken from the preceding response; requires mailboxId'),
      labelId: z
        .number()
        .nonnegative()
        .refine(Number.isSafeInteger)
        .optional()
        .describe(
          'Folder ID: 14 all, 0 assigned, 10 unassigned, 11 starred, 9 snoozed, 2 draft, 1 sent, 7 closed, 8 spam, 5 trash, 6 scheduled'
        )
    })
  )
  .output(
    z.object({
      nextPageToken: z.string().nullable().optional().describe('Token for the next page'),
      conversations: z.array(z.record(z.string(), z.any())).describe('List of conversations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listConversations({
      mailbox_id: ctx.input.mailboxId,
      status: ctx.input.status,
      tag_id: ctx.input.tagId,
      query: ctx.input.query,
      limit: ctx.input.limit,
      page: ctx.input.page,
      pageToken: ctx.input.pageToken,
      labelId: ctx.input.labelId
    });

    let conversations = Array.isArray(result)
      ? result
      : (result.conversations ?? result.threads ?? result.data ?? []);

    return {
      output: { conversations, nextPageToken: result.nextPageToken },
      message: `Retrieved ${conversations.length} conversation(s).`
    };
  })
  .build();
