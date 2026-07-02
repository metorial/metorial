import { SlateTool } from 'slates';
import { z } from 'zod';
import { HelpScoutClient } from '../lib/client';
import { spec } from '../spec';

export let createConversation = SlateTool.create(spec, {
  name: 'Create Conversation',
  key: 'create_conversation',
  description: `Create a new support conversation in a mailbox. You must specify the customer (by email or ID), the mailbox, and at least one thread (the initial message). Optionally assign it to a user, add tags, or set status.`,
  instructions: [
    'The type should be "email" for standard email conversations, "chat" for live chat, or "phone" for phone conversations.',
    'Thread type should be "customer" for a customer-initiated message or "reply" for an agent reply.'
  ]
})
  .input(
    z.object({
      subject: z.string().describe('Conversation subject line'),
      type: z.enum(['email', 'chat', 'phone']).default('email').describe('Conversation type'),
      mailboxId: z.number().describe('ID of the mailbox to create the conversation in'),
      customerEmail: z
        .string()
        .optional()
        .describe('Customer email address (provide email or customerId)'),
      customerId: z.number().optional().describe('Customer ID (provide email or customerId)'),
      message: z.string().describe('Initial message text (HTML supported)'),
      threadType: z
        .enum(['customer', 'reply'])
        .default('customer')
        .describe('Type of the initial thread'),
      tags: z.array(z.string()).optional().describe('Tags to add to the conversation'),
      status: z
        .enum(['active', 'pending', 'closed'])
        .optional()
        .describe('Initial conversation status'),
      assignTo: z.number().optional().describe('User ID to assign the conversation to'),
      autoReply: z.boolean().optional().describe('Whether to send auto-reply to the customer')
    })
  )
  .output(
    z.object({
      conversationId: z
        .string()
        .nullable()
        .describe('ID of the created conversation (from response header)')
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

    let result = await client.createConversation({
      subject: ctx.input.subject,
      type: ctx.input.type,
      mailboxId: ctx.input.mailboxId,
      customer,
      threads: [
        {
          type: ctx.input.threadType,
          text: ctx.input.message,
          customer: ctx.input.threadType === 'customer' ? customer : undefined
        }
      ],
      tags: ctx.input.tags,
      status: ctx.input.status,
      assignTo: ctx.input.assignTo,
      autoReply: ctx.input.autoReply
    });

    return {
      output: {
        conversationId: result.conversationId ?? null
      },
      message: `Created conversation "${ctx.input.subject}" in mailbox ${ctx.input.mailboxId}.`
    };
  })
  .build();
