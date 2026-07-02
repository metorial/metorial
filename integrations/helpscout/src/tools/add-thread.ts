import { SlateTool } from 'slates';
import { z } from 'zod';
import { HelpScoutClient } from '../lib/client';
import { helpscoutServiceError } from '../lib/errors';
import { spec } from '../spec';

export let addThread = SlateTool.create(spec, {
  name: 'Add Thread',
  key: 'add_thread',
  description: `Add a reply, note, phone, or chat thread to an existing conversation. Agent replies send actual emails to the customer. Notes are internal-only. Phone and chat threads log non-email customer interactions.`,
  instructions: [
    'Use "reply" to send an email reply to the customer. Requires customer email or ID.',
    'Use "note" for internal-only comments not visible to the customer.',
    'Use "phone" to log a phone call. Requires customer email or ID.',
    'Use "chat" to log a chat transcript. Requires customer email or ID.'
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
        .describe('Set conversation status after adding this thread')
    })
  )
  .output(
    z.object({
      conversationId: z.number().describe('Conversation ID'),
      threadType: z.string().describe('Type of thread that was added')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HelpScoutClient(ctx.auth.token);

    let customer: { email?: string; id?: number } = {};
    if (ctx.input.customerId) {
      customer.id = ctx.input.customerId;
    } else if (ctx.input.customerEmail) {
      customer.email = ctx.input.customerEmail;
    }

    if (ctx.input.type !== 'note' && !customer.id && !customer.email) {
      throw helpscoutServiceError(
        'Customer ID or customer email is required for reply, phone, and chat threads.'
      );
    }

    if (ctx.input.type === 'reply') {
      await client.createReply(ctx.input.conversationId, {
        text: ctx.input.text,
        customer,
        draft: ctx.input.draft,
        status: ctx.input.status
      });
    } else if (ctx.input.type === 'note') {
      await client.createNote(ctx.input.conversationId, {
        text: ctx.input.text
      });
    } else if (ctx.input.type === 'phone') {
      await client.createPhoneThread(ctx.input.conversationId, {
        text: ctx.input.text,
        customer
      });
    } else if (ctx.input.type === 'chat') {
      await client.createChatThread(ctx.input.conversationId, {
        text: ctx.input.text,
        customer
      });
    }

    return {
      output: {
        conversationId: ctx.input.conversationId,
        threadType: ctx.input.type
      },
      message: `Added **${ctx.input.type}** thread to conversation **#${ctx.input.conversationId}**.`
    };
  })
  .build();
