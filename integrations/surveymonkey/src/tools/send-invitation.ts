import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendInvitation = SlateTool.create(spec, {
  name: 'Send Survey Invitation',
  key: 'send_invitation',
  description: `Compose and send an email or SMS invitation message through a collector. This creates the message, adds contact list recipients, and sends it. The collector must be of type **email** or **sms**.`,
  instructions: [
    'The collector must be an email or SMS collector type.',
    'Email body must include [SurveyLink], [OptOutLink], [PrivacyLink], and [FooterLink] placeholders.',
    'SMS messages are limited to 30 characters excluding mandatory opt-out text.'
  ]
})
  .input(
    z.object({
      collectorId: z.string().describe('ID of the email or SMS collector'),
      messageType: z
        .enum(['invite', 'reminder', 'thank_you'])
        .default('invite')
        .describe('Type of message'),
      subject: z.string().optional().describe('Email subject line (email collectors only)'),
      bodyHtml: z
        .string()
        .optional()
        .describe('HTML body of the email. Must contain required link placeholders.'),
      bodyText: z.string().optional().describe('Plain text body for SMS messages'),
      contactListIds: z.array(z.string()).describe('IDs of contact lists to send to')
    })
  )
  .output(
    z.object({
      messageId: z.string(),
      messageType: z.string().optional(),
      status: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accessUrl: ctx.auth.accessUrl
    });

    // Create the message
    let message = await client.createMessage(ctx.input.collectorId, {
      type: ctx.input.messageType,
      subject: ctx.input.subject,
      bodyHtml: ctx.input.bodyHtml,
      bodyText: ctx.input.bodyText
    });

    ctx.info({ step: 'Message created', messageId: message.id });

    // Add recipients from contact lists
    await client.addMessageRecipients(
      ctx.input.collectorId,
      message.id,
      ctx.input.contactListIds
    );

    ctx.info({ step: 'Recipients added, sending message' });

    // Send the message
    let sent = await client.sendMessage(ctx.input.collectorId, message.id);

    return {
      output: {
        messageId: message.id,
        messageType: message.type,
        status: sent.status || 'sent'
      },
      message: `Sent **${ctx.input.messageType}** message \`${message.id}\` to ${ctx.input.contactListIds.length} contact list(s).`
    };
  })
  .build();
