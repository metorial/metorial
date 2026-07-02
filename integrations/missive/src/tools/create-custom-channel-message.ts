import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let addressFieldSchema = z.object({
  address: z.string().describe('Email or identifier'),
  name: z.string().optional().describe('Display name')
});

export let createCustomChannelMessage = SlateTool.create(spec, {
  name: 'Create Custom Channel Message',
  key: 'create_custom_channel_message',
  description: `Ingest an incoming message from an external system through a custom channel.
Use this to integrate message providers not natively built into Missive by creating incoming messages programmatically.
Also supports conversation actions (close, label, assign) as part of message creation.`,
  instructions: [
    'The account must be a custom channel account ID configured in Missive.',
    'Use references or conversationId to thread the message into an existing conversation.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      account: z.string().describe('Custom channel account ID'),
      body: z.string().describe('Message body (text or HTML depending on channel type)'),
      fromField: addressFieldSchema.describe('Sender address'),
      toFields: z.array(addressFieldSchema).describe('Recipient addresses'),
      subject: z.string().optional().describe('Subject line (email-type channels only)'),
      ccFields: z.array(addressFieldSchema).optional().describe('CC recipients'),
      bccFields: z.array(addressFieldSchema).optional().describe('BCC recipients'),
      deliveredAt: z
        .number()
        .optional()
        .describe('Unix timestamp for the message delivery time'),
      externalId: z.string().optional().describe('External message ID for reference'),
      conversationId: z.string().optional().describe('Existing conversation ID to append to'),
      references: z
        .array(z.string())
        .optional()
        .describe('Reference strings for conversation matching'),
      teamId: z.string().optional().describe('Team ID to link conversation to'),
      organizationId: z.string().optional().describe('Organization ID'),
      addAssignees: z.array(z.string()).optional().describe('User IDs to assign'),
      addSharedLabels: z.array(z.string()).optional().describe('Shared label IDs to add'),
      removeSharedLabels: z
        .array(z.string())
        .optional()
        .describe('Shared label IDs to remove'),
      addToInbox: z.boolean().optional().describe('Move to inbox'),
      addToTeamInbox: z.boolean().optional().describe('Move to team inbox'),
      close: z.boolean().optional().describe('Close conversation'),
      conversationSubject: z.string().optional().describe('Override conversation subject'),
      conversationColor: z.string().optional().describe('Hex color for conversation'),
      attachments: z
        .array(
          z.object({
            base64Data: z.string().describe('Base64-encoded file data'),
            filename: z.string().describe('Filename with extension')
          })
        )
        .optional()
        .describe('File attachments')
    })
  )
  .output(
    z.object({
      messageId: z.string().optional().describe('Created message ID'),
      conversationId: z.string().optional().describe('Conversation ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let message: Record<string, any> = {
      account: ctx.input.account,
      body: ctx.input.body,
      from_field: ctx.input.fromField,
      to_fields: ctx.input.toFields
    };

    if (ctx.input.subject) message.subject = ctx.input.subject;
    if (ctx.input.ccFields) message.cc_fields = ctx.input.ccFields;
    if (ctx.input.bccFields) message.bcc_fields = ctx.input.bccFields;
    if (ctx.input.deliveredAt) message.delivered_at = ctx.input.deliveredAt;
    if (ctx.input.externalId) message.external_id = ctx.input.externalId;
    if (ctx.input.conversationId) message.conversation = ctx.input.conversationId;
    if (ctx.input.references) message.references = ctx.input.references;
    if (ctx.input.teamId) message.team = ctx.input.teamId;
    if (ctx.input.organizationId) message.organization = ctx.input.organizationId;
    if (ctx.input.addAssignees) message.add_assignees = ctx.input.addAssignees;
    if (ctx.input.addSharedLabels) message.add_shared_labels = ctx.input.addSharedLabels;
    if (ctx.input.removeSharedLabels)
      message.remove_shared_labels = ctx.input.removeSharedLabels;
    if (ctx.input.addToInbox !== undefined) message.add_to_inbox = ctx.input.addToInbox;
    if (ctx.input.addToTeamInbox !== undefined)
      message.add_to_team_inbox = ctx.input.addToTeamInbox;
    if (ctx.input.close !== undefined) message.close = ctx.input.close;
    if (ctx.input.conversationSubject)
      message.conversation_subject = ctx.input.conversationSubject;
    if (ctx.input.conversationColor) message.conversation_color = ctx.input.conversationColor;
    if (ctx.input.attachments) {
      message.attachments = ctx.input.attachments.map(a => ({
        base64_data: a.base64Data,
        filename: a.filename
      }));
    }

    let data = await client.createMessage(message);

    return {
      output: {
        messageId: data.messages?.id,
        conversationId: data.conversations?.[0]?.id
      },
      message: `Created custom channel message.`
    };
  })
  .build();
