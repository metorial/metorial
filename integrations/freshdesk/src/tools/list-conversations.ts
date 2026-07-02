import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreshdeskClient } from '../lib/client';
import { spec } from '../spec';

export let listConversations = SlateTool.create(spec, {
  name: 'List Conversations',
  key: 'list_conversations',
  description: `Lists all conversations (replies, notes, forwards) on a ticket. Returns the full conversation history including public replies and private agent notes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ticketId: z.number().describe('ID of the ticket to list conversations for'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      conversations: z
        .array(
          z.object({
            conversationId: z.number().describe('Conversation entry ID'),
            bodyText: z.string().nullable().describe('Plain text content'),
            isPrivate: z.boolean().describe('Whether this is a private note'),
            incoming: z.boolean().describe('Whether this was an incoming message'),
            source: z.number().describe('Source channel of the conversation'),
            fromEmail: z.string().nullable().describe('Sender email address'),
            toEmails: z.array(z.string()).describe('Recipient email addresses'),
            userId: z.number().describe('ID of the user who created this entry'),
            createdAt: z.string().describe('Timestamp of the conversation entry'),
            updatedAt: z.string().describe('Last update timestamp')
          })
        )
        .describe('List of conversation entries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreshdeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token
    });

    let conversations = await client.listConversations(ctx.input.ticketId, ctx.input.page);

    let mapped = conversations.map((c: any) => ({
      conversationId: c.id,
      bodyText: c.body_text ?? null,
      isPrivate: c.private ?? false,
      incoming: c.incoming ?? false,
      source: c.source,
      fromEmail: c.from_email ?? null,
      toEmails: c.to_emails ?? [],
      userId: c.user_id,
      createdAt: c.created_at,
      updatedAt: c.updated_at
    }));

    return {
      output: { conversations: mapped },
      message: `Retrieved **${mapped.length}** conversations for ticket **#${ctx.input.ticketId}**`
    };
  })
  .build();
