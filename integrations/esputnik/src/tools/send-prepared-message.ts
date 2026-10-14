import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { messageResultSchema } from '../lib/schemas';
import { spec } from '../spec';

let recipientSchema = z.object({
  contactId: z.number().optional().describe('eSputnik internal contact ID'),
  externalCustomerId: z
    .string()
    .optional()
    .describe('External customer ID as an alternative to contactId or locator'),
  locator: z
    .string()
    .optional()
    .describe('Recipient identifier (email for email, phone for SMS/Viber)'),
  jsonParam: z
    .string()
    .optional()
    .describe('JSON string with dynamic parameters for Velocity template substitution'),
  languageCode: z.string().optional().describe('Language code for multilanguage messages'),
  email: z
    .boolean()
    .optional()
    .describe('Set true for email channel, false for other channels'),
  fromName: z.string().optional().describe('Sender name override'),
  externalRequestId: z
    .string()
    .optional()
    .describe('Custom ID to track message delivery status')
});

export let sendPreparedMessage = SlateTool.create(spec, {
  name: 'Send Prepared Message',
  key: 'send_prepared_message',
  description: `Send a pre-configured message template (SmartSend) to one or more recipients. Supports all channels: Email, SMS, Viber, Mobile Push, Web Push, Telegram, App Inbox.
Dynamic content can be injected via Velocity template parameters per recipient using the \`jsonParam\` field.`,
  constraints: [
    'Maximum 1,000 recipients per request',
    'Message template must be created in the eSputnik dashboard first'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      messageId: z.number().describe('ID of the message template to send'),
      recipients: z
        .array(recipientSchema)
        .min(1)
        .max(1000)
        .describe('Recipients to send the message to')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Status of the send request'),
      requestId: z
        .string()
        .optional()
        .describe('First request ID for tracking delivery status'),
      requestIds: z
        .array(z.string())
        .optional()
        .describe('All queued request IDs for get_message_status'),
      results: z
        .array(messageResultSchema)
        .optional()
        .describe('Queue outcome for each recipient')
    })
  )
  .handleInvocation(async ctx => {
    if (
      ctx.input.recipients.some(
        recipient =>
          recipient.contactId === undefined &&
          !recipient.locator &&
          !recipient.externalCustomerId
      )
    ) {
      throw createApiServiceError(
        'Each recipient must provide contactId, externalCustomerId, or locator.'
      );
    }
    let client = new Client({ token: ctx.auth.token });
    let result = await client.smartSend(ctx.input.messageId, ctx.input.recipients);
    if (!result.results.length)
      throw createApiServiceError(
        'eSputnik returned no message queue result. Check the account before retrying.'
      );
    let requestIds = result.results.flatMap(recipient =>
      recipient.requestId ? [recipient.requestId] : []
    );
    let failed = result.results.filter(recipient => recipient.status === 'ERROR').length;

    return {
      output: {
        status: failed ? 'ERROR' : 'OK',
        requestId: requestIds[0],
        requestIds,
        results: result.results
      },
      message: `Prepared message **${ctx.input.messageId}**: **${requestIds.length}** recipient(s) queued, **${failed}** rejected. Use get_message_status with the queued request IDs to check delivery.`
    };
  })
  .build();
