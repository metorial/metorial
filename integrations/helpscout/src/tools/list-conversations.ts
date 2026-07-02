import { SlateTool } from 'slates';
import { z } from 'zod';
import { HelpScoutClient } from '../lib/client';
import { spec } from '../spec';

let conversationSchema = z.object({
  conversationId: z.number().describe('Conversation ID'),
  number: z.number().optional().describe('Conversation number'),
  subject: z.string().describe('Conversation subject'),
  status: z.string().describe('Conversation status (active, pending, closed, spam)'),
  type: z.string().describe('Conversation type (email, chat, phone)'),
  mailboxId: z.number().optional().describe('Mailbox ID'),
  assigneeId: z.number().nullable().optional().describe('Assigned user ID'),
  customerEmail: z.string().nullable().optional().describe('Primary customer email'),
  tags: z.array(z.string()).describe('Tags on the conversation'),
  createdAt: z.string().describe('Creation timestamp'),
  modifiedAt: z.string().optional().describe('Last modified timestamp'),
  closedAt: z.string().nullable().optional().describe('Closed timestamp'),
  preview: z.string().optional().describe('Preview text of the conversation')
});

export let listConversations = SlateTool.create(spec, {
  name: 'List Conversations',
  key: 'list_conversations',
  description: `Search and list support conversations across mailboxes. Filter by mailbox, status, tag, assignee, or use a custom query string. Results are paginated.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      mailboxId: z.number().optional().describe('Filter by mailbox ID'),
      status: z
        .enum(['active', 'pending', 'closed', 'spam', 'all'])
        .optional()
        .describe('Filter by conversation status'),
      tag: z.string().optional().describe('Filter by tag name'),
      assignedTo: z.number().optional().describe('Filter by assigned user ID'),
      modifiedSince: z
        .string()
        .optional()
        .describe('Filter conversations modified after this ISO date'),
      query: z
        .string()
        .optional()
        .describe(
          'Custom search query (overrides other filters). Uses Help Scout query syntax.'
        ),
      sortField: z
        .enum(['createdAt', 'modifiedAt', 'number', 'subject', 'status'])
        .optional()
        .describe('Field to sort by'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      page: z.number().optional().describe('Page number (1-based)')
    })
  )
  .output(
    z.object({
      conversations: z.array(conversationSchema),
      totalCount: z.number().describe('Total number of matching conversations'),
      currentPage: z.number().describe('Current page number'),
      totalPages: z.number().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HelpScoutClient(ctx.auth.token);
    let data = await client.listConversations({
      mailbox: ctx.input.mailboxId,
      status: ctx.input.status,
      tag: ctx.input.tag,
      assignedTo: ctx.input.assignedTo,
      modifiedSince: ctx.input.modifiedSince,
      query: ctx.input.query,
      sortField: ctx.input.sortField,
      sortOrder: ctx.input.sortOrder,
      page: ctx.input.page
    });

    let embedded = data?._embedded?.conversations ?? [];
    let conversations = embedded.map((c: any) => ({
      conversationId: c.id,
      number: c.number,
      subject: c.subject,
      status: c.status,
      type: c.type,
      mailboxId: c.mailboxId,
      assigneeId: c.assignee?.id ?? null,
      customerEmail: c.primaryCustomer?.email ?? null,
      tags: (c.tags ?? []).map((t: any) => t.tag ?? t),
      createdAt: c.createdAt,
      modifiedAt: c.userUpdatedAt ?? c.modifiedAt,
      closedAt: c.closedAt ?? null,
      preview: c.preview
    }));

    let page = data?.page ?? {};

    return {
      output: {
        conversations,
        totalCount: page.totalElements ?? conversations.length,
        currentPage: page.number ?? 1,
        totalPages: page.totalPages ?? 1
      },
      message: `Found **${page.totalElements ?? conversations.length}** conversations (page ${page.number ?? 1} of ${page.totalPages ?? 1}).`
    };
  })
  .build();
