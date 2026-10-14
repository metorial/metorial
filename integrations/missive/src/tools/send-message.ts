import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let addressFieldSchema = z.object({
  address: z
    .string()
    .optional()
    .describe(
      'Email address; also accepts a phone number or participant ID when channelType selects that channel'
    ),
  phoneNumber: z
    .string()
    .optional()
    .describe('SMS or WhatsApp phone number, starting with + and followed by digits'),
  id: z
    .string()
    .optional()
    .describe('Messenger, Instagram, Live Chat, or custom channel participant ID'),
  username: z.string().optional().describe('Live Chat or custom channel participant username'),
  name: z.string().optional().describe('Display name')
});

let attachmentSchema = z.object({
  base64Data: z.string().describe('Base64-encoded file data'),
  filename: z.string().describe('File name with extension')
});

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Send a message or create a draft across email, SMS, WhatsApp, Messenger, Instagram, Live Chat, or custom channels.
Can send immediately, schedule for later, or save as a draft. Also supports conversation actions like closing, labeling, and assigning.`,
  instructions: [
    'Set send=true to send immediately, or provide sendAt as a Unix timestamp to schedule.',
    'Omit both send and sendAt to save as a draft for manual review.',
    'For WhatsApp templates, select channelType=whatsapp and provide the externalResponseId, externalResponseVariables, and matching body.',
    'channelType defaults to email. Use sms/whatsapp for phone numbers, or messenger/instagram/live_chat/custom for participant IDs. Select email for custom email channels.'
  ],
  constraints: ['Maximum 25 attachments, 10MB total payload.'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      channelType: z
        .enum(['email', 'sms', 'whatsapp', 'messenger', 'instagram', 'live_chat', 'custom'])
        .optional()
        .describe(
          'Channel participant format; defaults to email. custom uses IDs for text/HTML channels.'
        ),
      senderAccountType: z
        .enum(['signalwire', 'twilio', 'twilio_whatsapp', 'whatsapp'])
        .optional()
        .describe(
          'SMS or WhatsApp sender account type, needed when the same phone number matches multiple account types'
        ),
      subject: z.string().optional().describe('Email subject line'),
      body: z.string().optional().describe('HTML body content'),
      fromField: addressFieldSchema.optional().describe('Sender address'),
      toFields: z.array(addressFieldSchema).optional().describe('Recipients'),
      ccFields: z.array(addressFieldSchema).optional().describe('CC recipients'),
      bccFields: z.array(addressFieldSchema).optional().describe('BCC recipients'),
      account: z.string().optional().describe('Account ID (for custom/live chat channels)'),
      conversationId: z.string().optional().describe('Existing conversation ID to reply in'),
      references: z
        .array(z.string())
        .optional()
        .describe('Reference strings for conversation matching'),
      send: z.boolean().optional().describe('Send immediately when true'),
      sendAt: z.number().optional().describe('Unix timestamp to schedule the message'),
      quotePreviousMessage: z.boolean().optional().describe('Include quoted reply'),
      externalResponseId: z.string().optional().describe('WhatsApp template ID'),
      externalResponseVariables: z
        .array(z.string())
        .optional()
        .describe('WhatsApp template variables'),
      teamId: z.string().optional().describe('Team ID to assign conversation to'),
      organizationId: z.string().optional().describe('Organization ID'),
      addAssignees: z
        .array(z.string())
        .optional()
        .describe('User IDs to assign to the conversation'),
      addSharedLabels: z.array(z.string()).optional().describe('Shared label IDs to add'),
      removeSharedLabels: z
        .array(z.string())
        .optional()
        .describe('Shared label IDs to remove'),
      addToInbox: z.boolean().optional().describe('Move conversation to inbox'),
      addToTeamInbox: z.boolean().optional().describe('Move to team inbox'),
      close: z.boolean().optional().describe('Close the conversation after sending'),
      conversationSubject: z.string().optional().describe('Override the conversation subject'),
      conversationColor: z.string().optional().describe('Hex color for the conversation'),
      attachments: z
        .array(attachmentSchema)
        .optional()
        .describe('File attachments (max 25, 10MB total)')
    })
  )
  .output(
    z.object({
      draftId: z.string().optional().describe('ID of the created draft'),
      conversationId: z.string().optional().describe('Conversation ID')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.send === true && ctx.input.sendAt !== undefined) {
      throw createApiServiceError(
        'Use send=true for immediate delivery or sendAt for scheduled delivery, not both.'
      );
    }
    let channelType = ctx.input.channelType ?? 'email';
    if (
      (channelType === 'sms' || channelType === 'whatsapp' || channelType === 'live_chat') &&
      (ctx.input.toFields?.length ?? 0) > 1
    ) {
      throw createApiServiceError(
        'SMS, WhatsApp, and Live Chat drafts accept only one recipient.'
      );
    }
    let mapParticipant = (
      field: z.infer<typeof addressFieldSchema>,
      sender = false,
      emailOnly = false
    ) => {
      if (
        !emailOnly &&
        (channelType === 'sms' ||
          channelType === 'whatsapp' ||
          field.phoneNumber !== undefined)
      ) {
        let phoneNumber = field.phoneNumber ?? field.address;
        if (!phoneNumber || !/^\+\d+$/.test(phoneNumber)) {
          throw createApiServiceError(
            'Provide a phone number starting with + and followed by digits only.'
          );
        }
        return {
          phone_number: phoneNumber,
          ...(sender && ctx.input.senderAccountType
            ? { type: ctx.input.senderAccountType }
            : {})
        };
      }
      if (!emailOnly && (channelType !== 'email' || field.id !== undefined)) {
        let id = field.id ?? field.address;
        if (!id?.trim())
          throw createApiServiceError('Provide an id for each channel participant.');
        return channelType === 'messenger' || channelType === 'instagram'
          ? { id }
          : { id, username: field.username, name: field.name };
      }
      if (!field.address?.trim())
        throw createApiServiceError('Provide an address for each email participant.');
      return { address: field.address, name: field.name };
    };
    let client = new Client({ token: ctx.auth.token });
    let draft: Record<string, any> = {};

    if (ctx.input.subject) draft.subject = ctx.input.subject;
    if (ctx.input.body) draft.body = ctx.input.body;
    if (ctx.input.fromField) draft.from_field = mapParticipant(ctx.input.fromField, true);
    if (ctx.input.toFields)
      draft.to_fields = ctx.input.toFields.map(field => mapParticipant(field));
    if (ctx.input.ccFields)
      draft.cc_fields = ctx.input.ccFields.map(field => mapParticipant(field, false, true));
    if (ctx.input.bccFields)
      draft.bcc_fields = ctx.input.bccFields.map(field => mapParticipant(field, false, true));
    if (ctx.input.account) draft.account = ctx.input.account;
    if (ctx.input.conversationId) draft.conversation = ctx.input.conversationId;
    if (ctx.input.references) draft.references = ctx.input.references;
    if (ctx.input.send !== undefined) draft.send = ctx.input.send;
    if (ctx.input.sendAt !== undefined) draft.send_at = ctx.input.sendAt;
    if (ctx.input.quotePreviousMessage !== undefined)
      draft.quote_previous_message = ctx.input.quotePreviousMessage;
    if (ctx.input.externalResponseId)
      draft.external_response_id = ctx.input.externalResponseId;
    if (ctx.input.externalResponseVariables)
      draft.external_response_variables = Object.fromEntries(
        ctx.input.externalResponseVariables.map((value, index) => [String(index + 1), value])
      );
    if (ctx.input.teamId) draft.team = ctx.input.teamId;
    if (ctx.input.organizationId) draft.organization = ctx.input.organizationId;
    if (ctx.input.addAssignees) draft.add_assignees = ctx.input.addAssignees;
    if (ctx.input.addSharedLabels) draft.add_shared_labels = ctx.input.addSharedLabels;
    if (ctx.input.removeSharedLabels)
      draft.remove_shared_labels = ctx.input.removeSharedLabels;
    if (ctx.input.addToInbox !== undefined) draft.add_to_inbox = ctx.input.addToInbox;
    if (ctx.input.addToTeamInbox !== undefined)
      draft.add_to_team_inbox = ctx.input.addToTeamInbox;
    if (ctx.input.close !== undefined) draft.close = ctx.input.close;
    if (ctx.input.conversationSubject)
      draft.conversation_subject = ctx.input.conversationSubject;
    if (ctx.input.conversationColor) draft.conversation_color = ctx.input.conversationColor;
    if (ctx.input.attachments) {
      draft.attachments = ctx.input.attachments.map(a => ({
        base64_data: a.base64Data,
        filename: a.filename
      }));
    }

    let data = await client.createDraft(draft);

    let draftId = data.drafts?.id;
    let conversationId = data.drafts?.conversation ?? data.conversations?.[0]?.id;

    let action = ctx.input.send ? 'Sent' : ctx.input.sendAt ? 'Scheduled' : 'Created draft';

    return {
      output: {
        draftId,
        conversationId
      },
      message: `${action} message${conversationId ? ` in conversation **${conversationId}**` : ''}.`
    };
  })
  .build();
