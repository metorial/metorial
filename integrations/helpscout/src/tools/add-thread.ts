import { SlateTool } from 'slates';
import { z } from 'zod';
import { HelpScoutClient } from '../lib/client';
import { helpscoutServiceError } from '../lib/errors';
import { spec } from '../spec';

export let addThread = SlateTool.create(spec, {
  name: 'Add Thread',
  key: 'add_thread',
  description: `Add a reply, note, phone, or chat thread to an existing conversation. Agent replies send actual emails to the customer. Notes are internal-only. Phone and chat threads log non-email customer interactions. Files can be attached as base64-encoded content.`,
  instructions: [
    'Use "reply" to send an email reply to the customer. Requires customer email or ID. Set draft to true to save it without sending.',
    'Use "note" for internal-only comments not visible to the customer.',
    'Use "phone" to log a phone call. Requires customer email or ID.',
    'Use "chat" to log a chat transcript. Requires customer email or ID.',
    'A reply reopens the conversation unless status is set.'
  ]
})
  .input(
    z.object({
      conversationId: z.number().describe('Conversation ID to add the thread to'),
      type: z.enum(['reply', 'note', 'phone', 'chat']).describe('Type of thread to add'),
      text: z.string().describe('Thread content (HTML supported)'),
      customerEmail: z
        .string()
        .optional()
        .describe('Customer email (required for reply, phone, and chat threads)'),
      customerId: z
        .number()
        .optional()
        .describe('Customer ID (alternative to customerEmail for reply, phone, and chat)'),
      draft: z
        .boolean()
        .optional()
        .describe('If true, save as draft instead of sending (reply only)'),
      status: z
        .enum(['active', 'pending', 'closed'])
        .optional()
        .describe('Set conversation status after adding this thread (reply and note only)'),
      assignTo: z
        .number()
        .optional()
        .describe(
          'User or team ID to assign the conversation to once the reply is published (reply only)'
        ),
      cc: z.array(z.string()).optional().describe('CC email addresses (reply only)'),
      bcc: z.array(z.string()).optional().describe('BCC email addresses (reply only)'),
      attachments: z
        .array(
          z.object({
            fileName: z.string().describe('File name, e.g. invoice.pdf'),
            mimeType: z.string().describe('MIME type, e.g. application/pdf'),
            data: z.string().describe('Base64-encoded file content')
          })
        )
        .optional()
        .describe('Files to attach to the thread')
    })
  )
  .output(
    z.object({
      conversationId: z.number().describe('Conversation ID'),
      threadType: z.string().describe('Type of thread that was added'),
      threadId: z.string().nullable().optional().describe('ID of the created thread')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HelpScoutClient(ctx.auth.token);
    let { type, conversationId } = ctx.input;

    let customer: { email?: string; id?: number } = {};
    if (ctx.input.customerId) {
      customer.id = ctx.input.customerId;
    } else if (ctx.input.customerEmail) {
      customer.email = ctx.input.customerEmail;
    }

    if (type !== 'note' && !customer.id && !customer.email) {
      throw helpscoutServiceError(
        'Customer ID or customer email is required for reply, phone, and chat threads.'
      );
    }

    // draft and status were historically ignored where Help Scout does not accept
    // them, so only the newer reply-only fields are rejected on other thread types.
    let replyOnly = [
      ctx.input.assignTo !== undefined ? 'assignTo' : undefined,
      ctx.input.cc?.length ? 'cc' : undefined,
      ctx.input.bcc?.length ? 'bcc' : undefined
    ].filter(Boolean);
    if (type !== 'reply' && replyOnly.length > 0) {
      throw helpscoutServiceError(
        `${replyOnly.join(', ')} can only be used with reply threads.`
      );
    }

    let attachments = ctx.input.attachments?.length ? ctx.input.attachments : undefined;
    let result: { threadId?: string };

    if (type === 'reply') {
      result = await client.createReply(conversationId, {
        text: ctx.input.text,
        customer,
        draft: ctx.input.draft,
        status: ctx.input.status,
        assignTo: ctx.input.assignTo,
        cc: ctx.input.cc,
        bcc: ctx.input.bcc,
        attachments
      });
    } else if (type === 'note') {
      result = await client.createNote(conversationId, {
        text: ctx.input.text,
        status: ctx.input.status,
        attachments
      });
    } else if (type === 'phone') {
      result = await client.createPhoneThread(conversationId, {
        text: ctx.input.text,
        customer,
        attachments
      });
    } else {
      result = await client.createChatThread(conversationId, {
        text: ctx.input.text,
        customer,
        attachments
      });
    }

    return {
      output: {
        conversationId,
        threadType: type,
        threadId: result.threadId ?? null
      },
      message: `Added **${type}** thread to conversation **#${conversationId}**.`
    };
  })
  .build();
