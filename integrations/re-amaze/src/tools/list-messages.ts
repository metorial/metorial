import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapPerson, personSchema, validateDateRange } from '../lib/conversations';
import { spec } from '../spec';

let channelSchema = z.object({
  name: z.string().nullable().optional(),
  slug: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  channel: z.number().nullable().optional().describe('Provider channel type code')
});

let messageSchema = z.object({
  body: z.string().nullable().optional().describe('Message content'),
  visibility: z
    .number()
    .describe(
      '0=Regular, 1=Internal Note, 2=Collision Detected; other provider values are preserved'
    ),
  origin: z
    .number()
    .nullable()
    .optional()
    .describe('Provider origin code, such as 0=Chat, 1=Email, 7=API, 9=SMS'),
  originId: z.string().nullable().optional().describe('Unique message origin identifier'),
  createdAt: z.string().nullable().optional().describe('ISO 8601 creation timestamp'),
  updatedAt: z
    .string()
    .nullable()
    .optional()
    .describe('ISO 8601 update timestamp, when available'),
  sender: personSchema.optional().describe('Sender information supplied by the provider'),
  recipients: z
    .array(personSchema)
    .describe('Explicit notification recipients; this does not indicate message access'),
  conversation: z
    .object({
      slug: z.string().nullable().optional(),
      subject: z.string().nullable().optional(),
      createdAt: z.string().nullable().optional(),
      channel: channelSchema.optional()
    })
    .optional()
    .describe('Conversation and channel containing the message'),
  attachments: z
    .array(
      z.object({
        fileName: z.string().nullable().optional(),
        contentType: z.string().nullable().optional(),
        size: z.number().nullable().optional().describe('File size in bytes'),
        isImage: z.boolean().nullable().optional()
      })
    )
    .describe('File metadata associated with the message'),
  originalBody: z
    .string()
    .nullable()
    .optional()
    .describe('Original HTML when requested and available')
});

type ProviderMessage = {
  body?: string | null;
  visibility: number;
  origin?: number | null;
  origin_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  user?: unknown;
  recipients?: unknown[] | null;
  conversation?: {
    slug?: string | null;
    subject?: string | null;
    created_at?: string | null;
    category?: {
      name?: string | null;
      slug?: string | null;
      email?: string | null;
      channel?: number | null;
    } | null;
  } | null;
  attachments?:
    | {
        file_file_name?: string | null;
        file_content_type?: string | null;
        file_file_size?: number | null;
        'image?'?: boolean | null;
      }[]
    | null;
  original_body?: string | null;
};

export let listMessages = SlateTool.create(spec, {
  name: 'List Messages',
  key: 'list_messages',
  description:
    'Retrieve one page of messages, newest first, across the current brand or within a conversation. Includes customer messages, staff replies and internal notes, sender and recipient information, and file metadata.',
  instructions: [
    'To read an entire conversation, supply conversationSlug and follow nextPage while hasMore is true.',
    'Provider counts can omit the initial conversation message. Follow nextPage until hasMore is false; a final page may be empty.',
    'Omit filter to include both staff and customer messages. Visibility describes the message type, not the sender’s role.',
    'Use includeOriginalBody to request the original HTML where available.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      conversationSlug: z
        .string()
        .min(1)
        .optional()
        .describe('Conversation slug; omit to list messages across the current brand'),
      page: z.number().int().positive().default(1).describe('Page number, starting at 1'),
      filter: z
        .enum(['staff', 'customer'])
        .optional()
        .describe('Return messages sent by staff or by customers'),
      sentBy: z.string().optional().describe('Filter by the sender’s email address'),
      tag: z.string().optional().describe('Comma-separated tags on the conversation'),
      category: z.string().optional().describe('Channel slug to filter by'),
      origin: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe('Provider origin code, such as 0=Chat, 1=Email, 7=API, or 9=SMS'),
      startDate: z
        .string()
        .optional()
        .describe('Filter messages created after this ISO 8601 date or timestamp'),
      endDate: z
        .string()
        .optional()
        .describe('Filter messages created before this ISO 8601 date or timestamp'),
      includeOriginalBody: z
        .boolean()
        .optional()
        .describe('Request original message HTML when available')
    })
  )
  .output(
    z.object({
      page: z.number().describe('Requested page number'),
      pageSize: z.number().describe('Provider page size'),
      pageCount: z
        .number()
        .describe(
          'Provider-reported page count; can omit a page containing the initial message'
        ),
      totalCount: z
        .number()
        .describe('Provider-reported count; can exclude the initial conversation message'),
      hasMore: z
        .boolean()
        .describe('Whether another page should be requested; a final page may be empty'),
      nextPage: z.number().nullable().describe('Next page number, or null for the last page'),
      messages: z.array(messageSchema).describe('Messages in newest-first order')
    })
  )
  .handleInvocation(async ctx => {
    validateDateRange(ctx.input.startDate, ctx.input.endDate);

    let client = new Client({
      token: ctx.auth.token,
      loginEmail: ctx.auth.loginEmail,
      brandSubdomain: ctx.config.brandSubdomain
    });
    let result = await client.listMessages(ctx.input);
    // Re:amaze can exclude the initial message from its counts. A full page must
    // continue even at the reported last page to avoid losing the oldest message.
    let hasMore =
      ctx.input.page < result.page_count ||
      (result.page_size > 0 && (result.messages?.length ?? 0) >= result.page_size);
    let messages = (result.messages || []).map((message: ProviderMessage) => ({
      body: message.body,
      visibility: message.visibility,
      origin: message.origin,
      originId: message.origin_id,
      createdAt: message.created_at,
      updatedAt: message.updated_at,
      sender: mapPerson(message.user),
      recipients: (message.recipients || []).flatMap(recipient => {
        let person = mapPerson(recipient);
        return person ? [person] : [];
      }),
      conversation: message.conversation
        ? {
            slug: message.conversation.slug,
            subject: message.conversation.subject,
            createdAt: message.conversation.created_at,
            channel: message.conversation.category
              ? {
                  name: message.conversation.category.name,
                  slug: message.conversation.category.slug,
                  email: message.conversation.category.email,
                  channel: message.conversation.category.channel
                }
              : undefined
          }
        : undefined,
      attachments: (message.attachments || []).map(attachment => ({
        fileName: attachment.file_file_name,
        contentType: attachment.file_content_type,
        size: attachment.file_file_size,
        isImage: attachment['image?']
      })),
      originalBody: message.original_body
    }));

    return {
      output: {
        page: ctx.input.page,
        pageSize: result.page_size,
        pageCount: result.page_count,
        totalCount: result.total_count,
        hasMore,
        nextPage: hasMore ? ctx.input.page + 1 : null,
        messages
      },
      message: `Retrieved **${messages.length}** messages (page ${ctx.input.page} of ${result.page_count}).`
    };
  })
  .build();
