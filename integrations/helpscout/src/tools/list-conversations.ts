import { SlateTool } from 'slates';
import { z } from 'zod';
import { HelpScoutClient } from '../lib/client';
import { halPageInfo } from '../lib/pagination';
import { spec } from '../spec';

let conversationSchema = z.object({
  conversationId: z.number().describe('Conversation ID'),
  number: z.number().optional().describe('Conversation number'),
  subject: z.string().describe('Conversation subject'),
  status: z.string().describe('Conversation status (active, pending, closed, spam)'),
  type: z.string().describe('Conversation type (email, chat, phone)'),
  folderId: z.number().optional().describe('Folder ID'),
  mailboxId: z.number().optional().describe('Mailbox ID'),
  assigneeId: z.number().nullable().optional().describe('Assigned user or team ID'),
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
  description: `Search and list support conversations across mailboxes. Filter by mailbox, folder, status, tag, assignee, modification time, or conversation number, and optionally add an advanced search query. All filters are combined with AND. Results are paginated (25 per page). Only active conversations are returned unless a status is given.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      mailboxId: z
        .number()
        .optional()
        .describe('Filter by mailbox ID. Call list_mailboxes to discover mailbox IDs.'),
      folderId: z
        .number()
        .optional()
        .describe(
          'Filter by mailbox folder ID. Call list_mailboxes with a mailboxId to discover folder IDs.'
        ),
      status: z
        .enum(['active', 'pending', 'closed', 'spam', 'all'])
        .optional()
        .describe(
          'Filter by conversation status. Defaults to active; use "all" for every status.'
        ),
      tag: z
        .string()
        .optional()
        .describe('Filter by tag name. Use comma-separated values to match several tags.'),
      assignedTo: z
        .number()
        .optional()
        .describe('Filter by assigned user ID. Call list_users to discover user IDs.'),
      modifiedSince: z
        .string()
        .optional()
        .describe('Only return conversations modified after this ISO 8601 timestamp'),
      number: z.number().optional().describe('Look up a conversation by its visible number'),
      query: z
        .string()
        .optional()
        .describe(
          'Advanced search query in Help Scout query syntax, e.g. (subject:"refund" OR body:"refund"), (email:"jane@example.com"), or (customerIds:123). Combined with the other filters using AND.'
        ),
      sortField: z
        .enum([
          'createdAt',
          'modifiedAt',
          'number',
          'subject',
          'status',
          'customerEmail',
          'customerName',
          'mailboxid',
          'score',
          'waitingSince'
        ])
        .optional()
        .describe('Field to sort by (default createdAt)'),
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
      folder: ctx.input.folderId,
      number: ctx.input.number,
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
      folderId: c.folderId,
      mailboxId: c.mailboxId,
      assigneeId: c.assignee?.id ?? null,
      customerEmail: c.primaryCustomer?.email ?? null,
      tags: (c.tags ?? []).map((t: any) => t.tag ?? t),
      createdAt: c.createdAt,
      modifiedAt: c.userUpdatedAt ?? c.modifiedAt,
      closedAt: c.closedAt ?? null,
      preview: c.preview
    }));

    let page = halPageInfo(data, conversations.length);

    return {
      output: {
        conversations,
        ...page
      },
      message: `Found **${page.totalCount}** conversations (page ${page.currentPage} of ${page.totalPages}).`
    };
  })
  .build();
