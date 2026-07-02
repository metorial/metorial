import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listConversations = SlateTool.create(spec, {
  name: 'List Conversations',
  key: 'list_conversations',
  description: `Retrieve conversations (threads) from your Helpwise mailboxes. Filter by mailbox, status, tag, or search query to find specific conversations.`,
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
      limit: z.number().optional().describe('Maximum number of conversations to return'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
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
      page: ctx.input.page
    });

    let conversations = Array.isArray(result)
      ? result
      : (result.conversations ?? result.threads ?? result.data ?? []);

    return {
      output: { conversations },
      message: `Retrieved ${conversations.length} conversation(s).`
    };
  })
  .build();
