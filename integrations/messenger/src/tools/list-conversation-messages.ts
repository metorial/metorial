import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createMessengerClient } from '../lib/client';
import { spec } from '../spec';

export let listConversationMessages = SlateTool.create(spec, {
  name: 'List Conversation Messages',
  key: 'list_conversation_messages',
  description: `List messages in a Messenger conversation, newest first, with sender, recipients, text, reply target, and attachment details.`,
  instructions: [
    'Get conversationId from List Conversations.',
    'Pass nextCursor back as cursor to load older messages.'
  ],
  constraints: [
    'Requires the pages_messaging and pages_manage_metadata permissions.',
    'Messenger only returns details for the 20 most recent messages in a conversation; older messages may be missing or reported as deleted.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      conversationId: z
        .string()
        .min(1)
        .describe('Conversation ID. Call List Conversations to find it.'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of messages to return (1-100)'),
      cursor: z
        .string()
        .min(1)
        .optional()
        .describe('nextCursor from a previous List Conversation Messages result')
    })
  )
  .output(
    z.object({
      conversationId: z.string().describe('Conversation ID'),
      messages: z
        .array(
          z.object({
            messageId: z.string().describe('Message ID (mid)'),
            createdTime: z.string().optional().describe('Time the message was sent'),
            fromId: z
              .string()
              .optional()
              .describe('Sender ID: the person’s PSID or the Page ID'),
            fromName: z.string().optional().describe('Sender name'),
            toIds: z.array(z.string()).describe('Recipient IDs'),
            text: z.string().optional().describe('Text content, if any'),
            replyToMessageId: z
              .string()
              .optional()
              .describe('Message ID this message replies to'),
            attachments: z
              .array(
                z.object({
                  attachmentId: z.string().optional().describe('Attachment ID'),
                  name: z.string().optional().describe('File name'),
                  mimeType: z.string().optional().describe('MIME type'),
                  size: z.number().optional().describe('Size in bytes')
                })
              )
              .describe('Files attached to the message')
          })
        )
        .describe('Messages, newest first'),
      nextCursor: z
        .string()
        .optional()
        .describe('Cursor for older messages; absent when there are no more')
    })
  )
  .handleInvocation(async ctx => {
    let client = createMessengerClient(ctx);
    let page = await client.listConversationMessages({
      conversationId: ctx.input.conversationId,
      limit: ctx.input.limit,
      after: ctx.input.cursor
    });

    return {
      output: {
        conversationId: ctx.input.conversationId,
        messages: page.items,
        ...(page.nextCursor ? { nextCursor: page.nextCursor } : {})
      },
      message: `Retrieved **${page.items.length}** message${page.items.length === 1 ? '' : 's'} from conversation \`${ctx.input.conversationId}\`${page.nextCursor ? ' (more available)' : ''}.`
    };
  })
  .build();
