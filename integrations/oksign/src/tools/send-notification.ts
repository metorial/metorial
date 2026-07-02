import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let languageEnum = z
  .enum(['nl', 'fr', 'en', 'da', 'de', 'pl', 'es', 'it', 'pt'])
  .optional()
  .describe('Language code for the notification');

export let sendNotification = SlateTool.create(spec, {
  name: 'Send Notification',
  key: 'send_notification',
  description: `Send email and/or SMS notifications to signers informing them a document is ready for signing. Supports HTML email body, configurable reminders, CC recipients, and sequential signing workflows. Replaces any previously pending notifications for the document.`,
  instructions: [
    'The "to" arrays should contain signer IDs (not email addresses).',
    'For email body, HTML formatting is supported.',
    'Sending a new notification replaces any pending notifications for the same document.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      documentId: z
        .string()
        .describe('Document ID or briefcase token to send notifications for'),
      email: z
        .object({
          senderName: z.string().optional().describe('Display name of the sender'),
          toSignerIds: z
            .array(z.string())
            .describe('Array of signer IDs to send the email to'),
          ccEmails: z.array(z.string()).optional().describe('Array of CC email addresses'),
          replyTo: z.string().optional().describe('Reply-to email address'),
          subject: z.string().describe('Email subject line'),
          body: z.string().optional().describe('HTML email body content'),
          language: languageEnum,
          delayMinutes: z.number().optional().describe('Delay in minutes before sending'),
          reminderRepeatCount: z
            .number()
            .optional()
            .describe('Number of reminder repetitions'),
          reminderIntervalDays: z.number().optional().describe('Days between reminders'),
          attachmentIds: z
            .array(z.string())
            .optional()
            .describe('IDs of previously uploaded email attachments')
        })
        .optional()
        .describe('Email notification configuration'),
      sms: z
        .object({
          toSignerIds: z.array(z.string()).describe('Array of signer IDs to send SMS to'),
          message: z.string().describe('SMS message text'),
          language: languageEnum,
          delayMinutes: z.number().optional().describe('Delay in minutes before sending'),
          reminderRepeatCount: z
            .number()
            .optional()
            .describe('Number of reminder repetitions'),
          reminderIntervalDays: z.number().optional().describe('Days between reminders')
        })
        .optional()
        .describe('SMS notification configuration'),
      signers: z
        .array(
          z.object({
            signerId: z.string().describe('Signer ID'),
            name: z.string().describe('Signer full name'),
            email: z.string().optional().describe('Signer email'),
            mobile: z.string().optional().describe('Signer mobile in E.164 format')
          })
        )
        .optional()
        .describe('Signer details (only needed if not previously set)'),
      workflow: z
        .array(
          z.object({
            signerId: z.string().describe('Signer ID'),
            sequence: z.number().describe('Sequence number (lowest goes first)')
          })
        )
        .optional()
        .describe('Sequential signing order')
    })
  )
  .output(
    z.object({
      sent: z.boolean().describe('Whether the notification was sent successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let payload: any = {
      notifications: {}
    };

    if (ctx.input.email) {
      payload.notifications.smtp = {
        sender: ctx.input.email.senderName,
        to: ctx.input.email.toSignerIds,
        cc: ctx.input.email.ccEmails,
        replyto: ctx.input.email.replyTo,
        subject: ctx.input.email.subject,
        body: ctx.input.email.body,
        delay: ctx.input.email.delayMinutes,
        repeat: ctx.input.email.reminderRepeatCount,
        reminder_days: ctx.input.email.reminderIntervalDays,
        language: ctx.input.email.language,
        attachments: ctx.input.email.attachmentIds
      };
    }

    if (ctx.input.sms) {
      payload.notifications.sms = {
        to: ctx.input.sms.toSignerIds,
        subject: ctx.input.sms.message,
        delay: ctx.input.sms.delayMinutes,
        repeat: ctx.input.sms.reminderRepeatCount,
        reminder_days: ctx.input.sms.reminderIntervalDays,
        language: ctx.input.sms.language
      };
    }

    if (ctx.input.signers) {
      payload.signersinfo = ctx.input.signers.map(s => ({
        id: s.signerId,
        name: s.name,
        email: s.email,
        mobile: s.mobile
      }));
    }

    if (ctx.input.workflow) {
      payload.workflow = ctx.input.workflow.map(w => ({
        id: w.signerId,
        sequence: w.sequence
      }));
    }

    await client.uploadNotifications(ctx.input.documentId, payload);

    let channels: string[] = [];
    if (ctx.input.email) channels.push('email');
    if (ctx.input.sms) channels.push('SMS');

    return {
      output: { sent: true },
      message: `Notification sent via **${channels.join(' and ')}** for document \`${ctx.input.documentId}\`.`
    };
  })
  .build();
