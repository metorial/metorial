import { SlateTool } from 'slates';
import { z } from 'zod';
import { DriftClient } from '../lib/client';
import { spec } from '../spec';

export let createConversation = SlateTool.create(spec, {
  name: 'Create Conversation',
  key: 'create_conversation',
  description: `Start a new conversation in Drift with a contact. Creates a conversation using an email address and an initial message. If no contact exists with the given email, one will be created.`,
  instructions: [
    'The message body supports HTML tags such as <a>, <p>, and <b>.',
    'You can optionally assign a specific Drift user to the conversation.'
  ]
})
  .input(
    z.object({
      email: z.string().describe('Email of the contact to start a conversation with'),
      body: z.string().describe('Initial message body (supports HTML)'),
      integrationSource: z
        .string()
        .optional()
        .describe('Source identifier displayed in the conversation header'),
      assigneeUserId: z
        .number()
        .optional()
        .describe('Drift user ID to auto-assign the conversation to')
    })
  )
  .output(
    z.object({
      conversationId: z.number().describe('ID of the created conversation'),
      status: z.string().optional().describe('Conversation status'),
      contactId: z.number().optional().describe('Associated contact ID'),
      createdAt: z.number().optional().describe('Unix timestamp of creation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DriftClient(ctx.auth.token);

    let messageAttributes: Record<string, any> = {};
    if (ctx.input.integrationSource)
      messageAttributes.integrationSource = ctx.input.integrationSource;
    if (ctx.input.assigneeUserId) messageAttributes.autoAssigneeId = ctx.input.assigneeUserId;

    let conversation = await client.createConversation(ctx.input.email, {
      body: ctx.input.body,
      attributes: Object.keys(messageAttributes).length > 0 ? messageAttributes : undefined
    });

    return {
      output: {
        conversationId: conversation.id,
        status: conversation.status,
        contactId: conversation.contactId,
        createdAt: conversation.createdAt
      },
      message: `Created conversation \`${conversation.id}\` with **${ctx.input.email}**.`
    };
  })
  .build();
