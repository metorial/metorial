import { isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { TelTelClient } from '../lib/client';
import { spec } from '../spec';

export let sendSmsTool = SlateTool.create(spec, {
  name: 'Send SMS',
  key: 'send_sms',
  description: `Send an SMS message to one or multiple recipients. Supports single messages, 2-factor authentication codes, and bulk marketing campaigns.
For bulk sending, provide an array of phone numbers in the "recipients" field.`,
  instructions: [
    'If only some messages are accepted, review failedRecipients and retry only rejected recipients after correcting their errors. Preserve accepted message IDs to avoid duplicate sending.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      recipients: z
        .union([
          z.string().describe('Single phone number'),
          z.array(z.string()).describe('Array of phone numbers for bulk sending')
        ])
        .describe('Phone number(s) to send the SMS to'),
      text: z.string().describe('SMS message content'),
      senderId: z
        .string()
        .optional()
        .describe(
          'Sender ID or phone number to send from. Required by TelTel when sending a message.'
        )
    })
  )
  .output(
    z.object({
      success: z
        .boolean()
        .describe('Whether every requested SMS message was accepted for sending'),
      response: z.any().optional().describe('Raw API response with message details'),
      acceptedCount: z.number().optional().describe('Number of messages accepted for sending'),
      rejectedCount: z.number().optional().describe('Number of messages rejected by TelTel'),
      failedRecipients: z
        .array(
          z.object({
            index: z
              .number()
              .optional()
              .describe('Zero-based recipient index in the submitted request'),
            recipient: z
              .string()
              .optional()
              .describe('Recipient phone number rejected by TelTel'),
            error: z.string().describe('Reason the message was rejected')
          })
        )
        .optional()
        .describe('Rejected recipients that may be retried after correcting their errors')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TelTelClient(ctx.auth.token);
    let result: any;

    if (Array.isArray(ctx.input.recipients)) {
      result = await client.sendBulkSms({
        to: ctx.input.recipients,
        text: ctx.input.text,
        from: ctx.input.senderId
      });
    } else {
      result = await client.sendSms({
        to: ctx.input.recipients,
        text: ctx.input.text,
        from: ctx.input.senderId
      });
    }

    let recipients = Array.isArray(ctx.input.recipients)
      ? ctx.input.recipients
      : [ctx.input.recipients];
    let data = result?.data;
    let accepted =
      isApiErrorRecord(data) && Array.isArray(data.success) ? data.success : undefined;
    let errors = isApiErrorRecord(data) && Array.isArray(data.errors) ? data.errors : [];
    let acceptedCount =
      accepted?.length ??
      (Array.isArray(data)
        ? data.length
        : isApiErrorRecord(data) && typeof data.id === 'string'
          ? 1
          : undefined);
    let failedRecipients = errors.map(error => {
      let index =
        isApiErrorRecord(error) && typeof error.index === 'number' ? error.index : undefined;
      let submittedRecipient =
        index !== undefined && Number.isInteger(index) && index >= 0
          ? recipients[index]
          : undefined;
      let errorData =
        isApiErrorRecord(error) && isApiErrorRecord(error.data) ? error.data : undefined;
      return {
        index,
        recipient:
          submittedRecipient ?? (typeof errorData?.to === 'string' ? errorData.to : undefined),
        error:
          isApiErrorRecord(error) && typeof error.title === 'string'
            ? error.title
            : 'TelTel rejected this message.'
      };
    });
    let success = errors.length === 0 && acceptedCount === recipients.length;
    let message = success
      ? `SMS accepted for sending to **${acceptedCount}** recipient(s).`
      : `TelTel accepted **${acceptedCount}** message(s) and rejected **${errors.length}**. Review the returned recipient errors before retrying; do not resend accepted messages.`;
    if (acceptedCount === undefined) {
      message = `TelTel rejected **${errors.length}** message(s). Review the raw response and recipient errors to confirm other outcomes before retrying; do not resend accepted messages.`;
    } else if (!success && errors.length === 0) {
      message = `TelTel confirmed **${acceptedCount}** of **${recipients.length}** messages. Review the raw response before retrying any recipient with an unconfirmed outcome; do not resend accepted messages.`;
    }

    return {
      output: {
        success,
        response: result,
        acceptedCount,
        rejectedCount: errors.length,
        failedRecipients
      },
      message
    };
  })
  .build();
