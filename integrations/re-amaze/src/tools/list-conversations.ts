import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let conversationSchema = z.object({
  slug: z.string().describe('Unique conversation slug identifier'),
  subject: z.string().nullable().describe('Conversation subject'),
  status: z
    .number()
    .describe('Status code: 0=Open, 1=Responded, 2=Done, 3=Spam, 4=Archived, 5=On Hold'),
  createdAt: z.string().describe('ISO 8601 creation timestamp'),
  tagList: z.array(z.string()).describe('Tags applied to the conversation'),
  author: z
    .object({
      name: z.string().nullable().optional(),
      email: z.string().nullable().optional()
    })
    .optional()
    .describe('Customer who started the conversation'),
  assignee: z
    .string()
    .nullable()
    .optional()
    .describe('Staff member assigned to the conversation'),
  channelName: z.string().nullable().optional().describe('Channel the conversation belongs to')
});

export let listConversations = SlateTool.create(spec, {
  name: 'List Conversations',
  key: 'list_conversations',
  description: `List and filter support conversations. Supports filtering by status (open, archived, unassigned), date range, tags, channel, origin, and customer. Results are paginated.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      filter: z
        .enum(['open', 'archived', 'unassigned', 'all'])
        .optional()
        .describe('Filter conversations by status group'),
      customerEmail: z
        .string()
        .optional()
        .describe('Filter conversations for a specific customer email'),
      sort: z
        .enum(['updated', 'changed'])
        .optional()
        .describe('"updated" for latest customer activity, "changed" for any update'),
      tag: z.string().optional().describe('Comma-separated tag values to filter by'),
      category: z.string().optional().describe('Channel slug to filter by'),
      origin: z
        .string()
        .optional()
        .describe('Channel origin filter (e.g., email, chat, twitter, facebook, sms)'),
      startDate: z
        .string()
        .optional()
        .describe('Filter conversations created after this ISO 8601 date'),
      endDate: z
        .string()
        .optional()
        .describe('Filter conversations created before this ISO 8601 date'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      pageSize: z.number().describe('Number of items per page'),
      pageCount: z.number().describe('Total number of pages'),
      totalCount: z.number().describe('Total number of conversations matching the filter'),
      conversations: z.array(conversationSchema).describe('List of conversations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      loginEmail: ctx.auth.loginEmail,
      brandSubdomain: ctx.config.brandSubdomain
    });

    let result = await client.listConversations({
      filter: ctx.input.filter,
      for: ctx.input.customerEmail,
      sort: ctx.input.sort,
      tag: ctx.input.tag,
      category: ctx.input.category,
      origin: ctx.input.origin,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      page: ctx.input.page
    });

    let conversations = (result.conversations || []).map((c: any) => ({
      slug: c.slug,
      subject: c.subject,
      status: c.status,
      createdAt: c.created_at,
      tagList: c.tag_list || [],
      author: c.author ? { name: c.author.name, email: c.author.email } : undefined,
      assignee: c.assignee,
      channelName: c.category?.name
    }));

    return {
      output: {
        pageSize: result.page_size,
        pageCount: result.page_count,
        totalCount: result.total_count,
        conversations
      },
      message: `Found **${result.total_count}** conversations (page ${ctx.input.page || 1} of ${result.page_count}).`
    };
  })
  .build();
