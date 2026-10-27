import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { createHighLevelClient } from '../lib/client';
import { highLevelScope } from '../lib/scopes';
import { spec } from '../spec';

const cursorSchema = z.union([
  z.string(),
  z.number(),
  z.array(z.union([z.string(), z.number()]))
]);
const conversationSchema = z
  .object({
    id: z.string().describe('Conversation identifier.'),
    contactId: z.string().describe('Associated contact identifier.'),
    locationId: z.string().describe('Owning sub-account identifier.'),
    lastMessageBody: z.string().optional().describe('Most recent message preview.'),
    lastMessageType: z.string().optional().describe('Most recent provider message type.'),
    lastMessageDate: cursorSchema
      .optional()
      .describe('Most recent message timestamp or sort value, when supplied.'),
    lastManualMessageDate: cursorSchema
      .optional()
      .describe('Most recent manual-message timestamp or sort value, when supplied.'),
    sort: cursorSchema
      .optional()
      .describe('Exact provider sort value for continuation, when supplied.'),
    unreadCount: z.number().optional().describe('Number of unread messages.'),
    fullName: z.string().optional().describe('Contact full name.'),
    contactName: z.string().optional().describe('Contact display name.')
  })
  .passthrough();

export const conversationsSearchConversationTool = SlateTool.create(spec, {
  key: 'conversations_search_conversation',
  name: 'Search Conversations',
  description:
    'Search one page of conversations in the connected sub-account using contact, assignment, status, and message filters.',
  instructions: [
    'For another page, use the exact last conversation sort value as startAfterDate. nextStartAfterDate is returned only when HighLevel supplies a sort value; do not infer a cursor from a display timestamp.'
  ],
  tags: { readOnly: true }
})
  .scopes(highLevelScope('conversations.readonly'))
  .input(
    z.object({
      contactId: z
        .string()
        .optional()
        .describe('Contact identifier from contacts_get_contacts.'),
      assignedTo: z
        .string()
        .optional()
        .describe('Comma-separated assigned user identifiers, or unassigned.'),
      followers: z.string().optional().describe('Comma-separated follower user identifiers.'),
      mentions: z.string().optional().describe('Comma-separated mentioned user identifiers.'),
      query: z.string().optional().describe('Conversation search text.'),
      sort: z.enum(['asc', 'desc']).optional().describe('Sort direction.'),
      startAfterDate: cursorSchema
        .optional()
        .describe(
          'Exact sort value from the last conversation of the previous page; preserve its type.'
        ),
      id: z.string().optional().describe('Filter by conversation identifier.'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .default(20)
        .describe('Maximum conversations in this page; capped at 100 by this tool.'),
      lastMessageType: z
        .string()
        .optional()
        .describe('Provider message-type filter, such as TYPE_SMS or TYPE_EMAIL.'),
      lastMessageAction: z
        .enum(['automated', 'manual'])
        .optional()
        .describe('Last outbound message action filter.'),
      lastMessageDirection: z
        .enum(['inbound', 'outbound'])
        .optional()
        .describe('Last message direction filter.'),
      status: z
        .enum(['all', 'read', 'unread', 'starred', 'recents'])
        .optional()
        .describe('Conversation status filter.'),
      sortBy: z
        .enum(['last_manual_message_date', 'last_message_date', 'score_profile'])
        .default('last_message_date')
        .describe('Sort field; score_profile requires sortScoreProfile.'),
      sortScoreProfile: z
        .string()
        .optional()
        .describe('Score-profile identifier used for score_profile sorting.'),
      scoreProfile: z.string().optional().describe('Score-profile identifier to filter by.'),
      scoreProfileMin: z
        .number()
        .optional()
        .describe('Minimum score for the selected score-profile filter.'),
      scoreProfileMax: z
        .number()
        .optional()
        .describe('Maximum score for the selected score-profile filter.')
    })
  )
  .output(
    z.object({
      locationId: z.string().describe('Connected sub-account identifier.'),
      conversations: z
        .array(conversationSchema)
        .describe('One page of conversations, retaining provider-specific sort fields.'),
      total: z.number().describe('Total matching conversations reported by HighLevel.'),
      limit: z.number().describe('Requested page size.'),
      nextStartAfterDate: cursorSchema
        .optional()
        .describe(
          'Exact last returned sort value when present; use as startAfterDate to request the next page. This does not guarantee another page exists.'
        )
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.sortBy === 'score_profile' && !ctx.input.sortScoreProfile)
      throw createApiServiceError(
        'Provide sortScoreProfile when sorting conversations by score_profile.'
      );
    if (
      (ctx.input.scoreProfileMin !== undefined || ctx.input.scoreProfileMax !== undefined) &&
      !ctx.input.scoreProfile
    )
      throw createApiServiceError('Provide scoreProfile when filtering by a score range.');
    if (
      ctx.input.scoreProfileMin !== undefined &&
      ctx.input.scoreProfileMax !== undefined &&
      ctx.input.scoreProfileMin > ctx.input.scoreProfileMax
    )
      throw createApiServiceError('scoreProfileMin must not exceed scoreProfileMax.');
    const client = createHighLevelClient(ctx.auth);
    const result = await client.request<{
      conversations: z.infer<typeof conversationSchema>[];
      total: number;
    }>({
      method: 'GET',
      path: '/conversations/search',
      scope: 'conversations.readonly',
      query: pickDefined({ ...ctx.input, locationId: client.locationId })
    });
    for (const conversation of result.conversations)
      client.assertLocation(conversation.locationId);
    const last = result.conversations.at(-1);
    const nextStartAfterDate = last?.sort;
    return {
      output: {
        locationId: client.locationId,
        conversations: result.conversations,
        total: result.total,
        limit: ctx.input.limit,
        nextStartAfterDate
      },
      message: `Retrieved ${result.conversations.length} conversations.`
    };
  })
  .build();

const messageSchema = z
  .object({
    id: z.string().describe('Message identifier.'),
    conversationId: z.string().optional().describe('Conversation identifier.'),
    contactId: z.string().optional().describe('Associated contact identifier.'),
    locationId: z.string().optional().describe('Owning sub-account identifier.'),
    messageType: z.string().optional().describe('Provider channel or message type.'),
    body: z.string().optional().describe('Message content.'),
    direction: z.string().optional().describe('Inbound or outbound direction.'),
    status: z.string().optional().describe('Status reported by the provider.'),
    dateAdded: z.string().optional().describe('Message creation timestamp.'),
    attachments: z
      .array(z.string())
      .optional()
      .describe('Provider message media URLs, when present.')
  })
  .passthrough();

export const conversationsGetMessagesTool = SlateTool.create(spec, {
  key: 'conversations_get_messages',
  name: 'Get Conversation Messages',
  description:
    'Retrieve one page of messages from a conversation discovered with conversations_search_conversation.',
  tags: { readOnly: true }
})
  .scopes(highLevelScope('conversations/message.readonly'))
  .input(
    z.object({
      conversationId: z
        .string()
        .min(1)
        .describe('Conversation identifier from conversations_search_conversation.'),
      lastMessageId: z
        .string()
        .optional()
        .describe('Continuation message identifier returned by the previous page.'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .default(20)
        .describe('Maximum messages in this page; capped at 100 by this tool.'),
      type: z
        .string()
        .optional()
        .describe('Comma-separated provider message types, such as TYPE_SMS,TYPE_EMAIL.')
    })
  )
  .output(
    z.object({
      locationId: z.string().describe('Connected sub-account identifier.'),
      conversationId: z.string().describe('Conversation identifier.'),
      messages: z.array(messageSchema).describe('One page of messages.'),
      lastMessageId: z
        .string()
        .nullable()
        .optional()
        .describe(
          'Provider continuation identifier; pass as lastMessageId when nextPage is true.'
        ),
      nextPage: z.boolean().describe('Whether the provider reports another page.')
    })
  )
  .handleInvocation(async ctx => {
    const { conversationId, ...query } = ctx.input;
    const client = createHighLevelClient(ctx.auth);
    const result = await client.request<{
      messages: {
        messages: z.infer<typeof messageSchema>[];
        lastMessageId?: string | null;
        nextPage: boolean;
      };
    }>({
      method: 'GET',
      path: `/conversations/${encodeURIComponent(conversationId)}/messages`,
      scope: 'conversations/message.readonly',
      query: pickDefined(query)
    });
    for (const message of result.messages.messages) client.assertLocation(message.locationId);
    return {
      output: {
        locationId: client.locationId,
        conversationId,
        messages: result.messages.messages,
        lastMessageId: result.messages.lastMessageId,
        nextPage: result.messages.nextPage
      },
      message: `Retrieved ${result.messages.messages.length} messages.`
    };
  })
  .build();

export const conversationsSendANewMessageTool = SlateTool.create(spec, {
  key: 'conversations_send_a_new_message',
  name: 'Send a New Message',
  description:
    'Send or schedule a message to a contact through an available HighLevel channel, or add an internal comment.',
  instructions: [
    'Discover the recipient with contacts_get_contacts. Scheduled timestamps are Unix seconds, not milliseconds. Email fields apply only to Email; whatsapp applies only to WhatsApp; mentions and userId apply only to InternalComment.'
  ],
  constraints: [
    'A successful request confirms provider acceptance, not delivery. Channel configuration, recipient consent, and provider messaging restrictions still apply.'
  ],
  tags: { readOnly: false }
})
  .scopes(highLevelScope('conversations/message.write'))
  .input(
    z.object({
      type: z
        .enum([
          'SMS',
          'Email',
          'WhatsApp',
          'IG',
          'FB',
          'Custom',
          'Live_Chat',
          'InternalComment'
        ])
        .describe('Channel or internal-comment type.'),
      contactId: z
        .string()
        .min(1)
        .describe('Recipient contact identifier from contacts_get_contacts.'),
      appointmentId: z.string().optional().describe('Associated appointment identifier.'),
      attachments: z
        .array(z.string().url())
        .optional()
        .describe('Publicly accessible media URLs for the message.'),
      emailFrom: z.string().optional().describe('Sender email address; Email only.'),
      emailTo: z
        .string()
        .email()
        .optional()
        .describe('Alternative recipient email associated with this contact; Email only.'),
      emailCc: z
        .array(z.string().email())
        .optional()
        .describe('CC email addresses; Email only.'),
      emailBcc: z
        .array(z.string().email())
        .optional()
        .describe('BCC email addresses; Email only.'),
      html: z.string().optional().describe('HTML message body; Email only.'),
      message: z
        .string()
        .optional()
        .describe(
          'Text message body. InternalComment mentions use @username<userId>id</userId> markup.'
        ),
      subject: z.string().optional().describe('Email subject; Email only.'),
      replyMessageId: z
        .string()
        .optional()
        .describe('Identifier of the message being replied to.'),
      templateId: z.string().optional().describe('Provider message-template identifier.'),
      threadId: z.string().optional().describe('Existing message-thread identifier.'),
      scheduledTimestamp: z
        .number()
        .int()
        .positive()
        .max(9_999_999_999)
        .optional()
        .describe(
          'UTC Unix timestamp in seconds at which to send the message; omit to send now.'
        ),
      conversationProviderId: z
        .string()
        .optional()
        .describe('Conversation-provider identifier, required for Custom messages.'),
      emailReplyMode: z
        .enum(['reply', 'reply_all'])
        .optional()
        .describe('Email reply mode; Email only.'),
      fromNumber: z
        .string()
        .optional()
        .describe('Sender phone number for an outbound phone-channel message.'),
      toNumber: z
        .string()
        .optional()
        .describe('Recipient phone number for an outbound phone-channel message.'),
      status: z
        .enum(['delivered', 'failed', 'pending', 'read'])
        .default('pending')
        .describe(
          'Provider-required message status field; defaults to pending and is not evidence of delivery.'
        ),
      mentions: z
        .array(z.string())
        .optional()
        .describe(
          'Mentioned team-member identifiers; required for InternalComment, use an empty array when there are no mentions.'
        ),
      userId: z
        .string()
        .optional()
        .describe(
          'Authoring user for InternalComment; omitted means provider default author.'
        ),
      whatsapp: z
        .object({
          type: z.literal('media').describe('WhatsApp media payload type.'),
          media: z
            .object({
              type: z
                .enum(['image', 'video', 'audio', 'document'])
                .describe('WhatsApp media kind.'),
              url: z.string().url().describe('Publicly accessible media URL.'),
              name: z.string().min(1).describe('Media filename displayed to the recipient.')
            })
            .describe('Media to send through WhatsApp.')
        })
        .optional()
        .describe('WhatsApp-specific media payload; only valid for WhatsApp.')
    })
  )
  .output(
    z.object({
      locationId: z.string().describe('Connected sub-account identifier.'),
      contactId: z.string().describe('Recipient contact identifier.'),
      conversationId: z.string().describe('Provider conversation identifier.'),
      messageId: z.string().optional().describe('Provider message identifier.'),
      messageIds: z
        .array(z.string())
        .optional()
        .describe('Provider message identifiers when the channel returns multiple.'),
      emailMessageId: z
        .string()
        .optional()
        .describe('Email-specific message identifier for threading.'),
      acceptanceState: z
        .literal('accepted')
        .describe('The provider accepted the request; delivery is not confirmed.'),
      scheduledTimestamp: z
        .number()
        .optional()
        .describe('Requested scheduled timestamp in Unix seconds.'),
      providerMessage: z
        .string()
        .optional()
        .describe('Additional message returned by HighLevel.')
    })
  )
  .handleInvocation(async ctx => {
    const input = ctx.input;
    const emailFields = [
      input.emailFrom,
      input.emailTo,
      input.emailCc,
      input.emailBcc,
      input.html,
      input.subject,
      input.emailReplyMode
    ];
    if (input.type !== 'Email' && emailFields.some(value => value !== undefined))
      throw createApiServiceError('Email fields can only be used when type is Email.');
    if (input.type !== 'WhatsApp' && input.whatsapp !== undefined)
      throw createApiServiceError(
        'The whatsapp payload can only be used when type is WhatsApp.'
      );
    if (
      input.type !== 'InternalComment' &&
      (input.mentions !== undefined || input.userId !== undefined)
    )
      throw createApiServiceError(
        'mentions and userId can only be used for InternalComment messages.'
      );
    if (input.type === 'InternalComment' && (!input.message || input.mentions === undefined))
      throw createApiServiceError(
        'InternalComment requires message text and a mentions array.'
      );
    if (input.type === 'Custom' && !input.conversationProviderId)
      throw createApiServiceError('Custom messages require conversationProviderId.');
    if (
      !input.message &&
      !input.html &&
      !input.templateId &&
      !input.attachments?.length &&
      !input.whatsapp
    )
      throw createApiServiceError('Provide message content, HTML, a template, or media.');
    const client = createHighLevelClient(ctx.auth);
    const result = await client.request<{
      conversationId: string;
      messageId?: string;
      messageIds?: string[];
      emailMessageId?: string;
      msg?: string;
    }>({
      method: 'POST',
      path: '/conversations/messages',
      scope: 'conversations/message.write',
      body: pickDefined(input)
    });
    return {
      output: {
        locationId: client.locationId,
        contactId: input.contactId,
        conversationId: result.conversationId,
        messageId: result.messageId,
        messageIds: result.messageIds,
        emailMessageId: result.emailMessageId,
        acceptanceState: 'accepted',
        scheduledTimestamp: input.scheduledTimestamp,
        providerMessage: result.msg
      },
      message: 'HighLevel accepted the message request; delivery is not confirmed.'
    };
  })
  .build();

export const conversationsTools = [
  conversationsSearchConversationTool,
  conversationsGetMessagesTool,
  conversationsSendANewMessageTool
];
