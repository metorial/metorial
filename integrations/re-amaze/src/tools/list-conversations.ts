import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  conversationStatusDescription,
  mapAssignee,
  mapPerson,
  validateDateRange
} from '../lib/conversations';
import { spec } from '../spec';

let conversationSchema = z.object({
  slug: z.string().describe('Unique conversation slug identifier'),
  subject: z.string().nullable().describe('Conversation subject'),
  status: z.number().describe(conversationStatusDescription),
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
  channelName: z
    .string()
    .nullable()
    .optional()
    .describe('Channel the conversation belongs to'),
  channelSlug: z.string().nullable().optional().describe('Channel slug'),
  customerId: z
    .string()
    .nullable()
    .optional()
    .describe('Customer external ID, when provided by the API'),
  customData: z
    .record(z.string(), z.unknown())
    .nullable()
    .optional()
    .describe('Conversation custom field values')
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
      forId: z
        .string()
        .optional()
        .describe('Filter conversations for a customer external ID from SSO'),
      data: z
        .record(z.string(), z.string())
        .optional()
        .describe('Match conversation custom fields by key and value'),
      sort: z
        .enum(['updated', 'changed'])
        .optional()
        .describe('"updated" for latest customer activity, "changed" for any update'),
      tag: z.string().optional().describe('Comma-separated tag values to filter by'),
      category: z.string().optional().describe('Channel slug to filter by'),
      origin: z
        .string()
        .optional()
        .describe(
          'Conversation origin as a name or numeric string (e.g., email, native, api, sms, or 1)'
        ),
      startDate: z
        .string()
        .optional()
        .describe('Filter by latest customer message after this ISO 8601 date'),
      endDate: z
        .string()
        .optional()
        .describe('Filter by latest customer message before this ISO 8601 date'),
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
    validateDateRange(ctx.input.startDate, ctx.input.endDate);

    let client = new Client({
      token: ctx.auth.token,
      loginEmail: ctx.auth.loginEmail,
      brandSubdomain: ctx.config.brandSubdomain
    });

    let result = await client.listConversations({
      filter: ctx.input.filter,
      for: ctx.input.customerEmail,
      forId: ctx.input.forId,
      data: ctx.input.data,
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
      author: mapPerson(c.author),
      assignee: mapAssignee(c.assignee),
      channelName: c.category?.name,
      channelSlug: c.category?.slug,
      customerId:
        c.author?.id === undefined || c.author?.id === null
          ? c.author?.id
          : String(c.author.id),
      customData: c.data
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
