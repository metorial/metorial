import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let messageRowSchema = z.object({
  messageId: z.string(),
  subject: z.string().optional(),
  bodyPreview: z.string().optional(),
  bodyContentType: z.string().optional(),
  bodyContent: z.string().optional(),
  fromAddress: z.string().optional(),
  fromName: z.string().optional(),
  toRecipients: z
    .array(
      z.object({
        address: z.string(),
        name: z.string().optional()
      })
    )
    .optional(),
  receivedDateTime: z.string().optional(),
  sentDateTime: z.string().optional(),
  isRead: z.boolean().optional(),
  isDraft: z.boolean().optional(),
  importance: z.string().optional(),
  hasAttachments: z.boolean().optional(),
  parentFolderId: z.string().optional(),
  webLink: z.string().optional(),
  categories: z.array(z.string()).optional(),
  flagStatus: z.string().optional()
});

export let getConversationContext = SlateTool.create(spec, {
  name: 'Get Conversation Context',
  key: 'get_conversation_context',
  description:
    'Load full thread context for a **conversationId**: every message in the thread (paginated server-side), ordered chronologically. Use after **Search Conversations** or when you already know the thread id.',
  instructions: [
    'Set **includeFullBody** to true when you need quoted history or HTML for drafting; otherwise previews are faster and smaller.',
    'The newest message in a triage flow is often the last in the list (chronological ascending).'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      conversationId: z.string().describe('Microsoft Graph conversationId for the thread'),
      includeFullBody: z
        .boolean()
        .optional()
        .describe('Include full body content (default false: bodyPreview only)')
    })
  )
  .output(
    z.object({
      conversationId: z.string(),
      messageCount: z.number(),
      messages: z.array(messageRowSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let select = ctx.input.includeFullBody
      ? [
          'id',
          'subject',
          'body',
          'bodyPreview',
          'from',
          'toRecipients',
          'receivedDateTime',
          'sentDateTime',
          'isRead',
          'isDraft',
          'importance',
          'hasAttachments',
          'parentFolderId',
          'webLink',
          'categories',
          'flag'
        ]
      : [
          'id',
          'subject',
          'bodyPreview',
          'from',
          'toRecipients',
          'receivedDateTime',
          'sentDateTime',
          'isRead',
          'isDraft',
          'importance',
          'hasAttachments',
          'parentFolderId',
          'webLink',
          'categories',
          'flag'
        ];

    let raw = await client.listMessagesByConversation(ctx.input.conversationId, {
      select,
      orderby: 'receivedDateTime asc'
    });

    let mapRecipients = (
      recipients?: { emailAddress: { address: string; name?: string } }[]
    ) =>
      recipients?.map(r => ({ address: r.emailAddress.address, name: r.emailAddress.name }));

    let messages = raw.map(msg => ({
      messageId: msg.id,
      subject: msg.subject,
      bodyPreview: msg.bodyPreview,
      bodyContentType: msg.body?.contentType,
      bodyContent: msg.body?.content,
      fromAddress: msg.from?.emailAddress?.address,
      fromName: msg.from?.emailAddress?.name,
      toRecipients: mapRecipients(msg.toRecipients),
      receivedDateTime: msg.receivedDateTime,
      sentDateTime: msg.sentDateTime,
      isRead: msg.isRead,
      isDraft: msg.isDraft,
      importance: msg.importance,
      hasAttachments: msg.hasAttachments,
      parentFolderId: msg.parentFolderId,
      webLink: msg.webLink,
      categories: msg.categories,
      flagStatus: msg.flag?.flagStatus
    }));

    return {
      output: {
        conversationId: ctx.input.conversationId,
        messageCount: messages.length,
        messages
      },
      message: `Loaded **${messages.length}** message(s) in conversation **${ctx.input.conversationId}**.`
    };
  })
  .build();
