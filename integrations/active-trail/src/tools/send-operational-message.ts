import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { ActiveTrailClient, redactProviderData, requireInteger } from '../lib/client';
import { spec } from '../spec';

export let sendEmailOperationalMessage = SlateTool.create(spec, {
  name: 'Send Email Operational Message',
  key: 'send_email_operational_message',
  description: `Send a transactional/operational email message to individual recipients. Supports up to 500 recipients per call. Recipients are automatically created as contacts in your account. Use for order confirmations, password resets, and other one-to-one transactional emails.`,
  constraints: ['Maximum 500 recipients per call'],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      name: z.string().describe('Internal message name'),
      subject: z.string().describe('Email subject line'),
      userProfileId: z.number().describe('Sending profile ID'),
      htmlContent: z.string().describe('HTML content of the email'),
      emails: z
        .array(
          z.object({
            email: z.string().describe('Recipient email address'),
            pairs: z
              .array(
                z.object({
                  key: z.string().describe('Substitution key'),
                  value: z.string().describe('Substitution value')
                })
              )
              .optional()
              .describe('Key-value pairs for personalization')
          })
        )
        .describe('List of recipient email addresses with optional personalization'),
      classification: z.string().optional().describe('Message classification'),
      bccEmails: z.array(z.string()).optional().describe('BCC email addresses')
    })
  )
  .output(
    z.object({
      campaignId: z.number().describe('ID of the sent operational message campaign'),
      messageId: z.number().describe('Unique message ID'),
      emailSendCount: z.number().describe('Number of emails sent')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ActiveTrailClient(ctx.auth.token);
    if (!ctx.input.emails.length || ctx.input.emails.length > 500)
      throw createApiServiceError('Provide between 1 and 500 email recipients.');
    let data: Record<string, any> = {
      details: {
        name: ctx.input.name,
        subject: ctx.input.subject,
        user_profile_id: ctx.input.userProfileId,
        classification: ctx.input.classification
      },
      design: {
        content: ctx.input.htmlContent
      },
      email_package: ctx.input.emails.map(e => ({
        email: e.email,
        pairs: e.pairs?.map(p => ({ key: p.key, value: p.value }))
      }))
    };
    if (ctx.input.bccEmails?.length) {
      data.bcc = { bcc_emails: ctx.input.bccEmails };
    }

    let result = await client.sendOperationalMessage(data);
    return redactProviderData(
      {
        output: {
          campaignId: requireInteger(result.campaign_id, 'ActiveTrail campaign_id'),
          messageId: requireInteger(result.message_id, 'ActiveTrail message_id'),
          emailSendCount: requireInteger(result.email_send, 'ActiveTrail email_send', 0)
        },
        message: `Sent operational email to **${ctx.input.emails.length}** recipient(s). Message ID: **${result.message_id}**.`
      },
      ctx.auth.token
    );
  })
  .build();

export let sendSmsOperationalMessage = SlateTool.create(spec, {
  name: 'Send SMS Operational Message',
  key: 'send_sms_operational_message',
  description: `Send a transactional/operational SMS message to individual phone numbers. Use for OTP codes, appointment reminders, and other one-to-one SMS messages.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      content: z.string().describe('SMS message content'),
      phoneNumbers: z.array(z.string()).describe('List of recipient phone numbers'),
      fromName: z.string().optional().describe('Sender name (max 11 English letters)'),
      smsSendingProfileId: z.number().optional().describe('SMS sending profile ID'),
      name: z.string().optional().describe('Internal message name'),
      unsubscribeText: z.string().optional().describe('Unsubscribe wording'),
      canUnsubscribe: z.boolean().optional().describe('Include an unsubscribe link')
    })
  )
  .output(
    z.object({
      result: z.any().describe('API response with send results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ActiveTrailClient(ctx.auth.token);
    if (!ctx.input.phoneNumbers.length || ctx.input.phoneNumbers.some(phone => !phone.trim()))
      throw createApiServiceError('Provide at least one non-empty recipient phone number.');
    if (!ctx.input.fromName?.trim() && ctx.input.smsSendingProfileId === undefined)
      throw createApiServiceError('Provide a sender name or SMS sending profile ID.');
    let data: Record<string, any> = {
      details: {
        name: ctx.input.name ?? 'Operational SMS',
        content: ctx.input.content,
        from_name: ctx.input.fromName,
        sms_sending_profile_id: ctx.input.smsSendingProfileId,
        unsubscribe_text: ctx.input.unsubscribeText,
        can_unsubscribe: ctx.input.canUnsubscribe
      },
      scheduling: { send_now: true },
      mobiles: ctx.input.phoneNumbers.map(phone => ({ phone_number: phone }))
    };

    let result = await client.sendSmsOperationalMessage(data);
    return redactProviderData(
      {
        output: { result },
        message: `Sent operational SMS to **${ctx.input.phoneNumbers.length}** recipient(s).`
      },
      ctx.auth.token
    );
  })
  .build();
