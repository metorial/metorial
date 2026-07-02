import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let recipientSchema = z.object({
  contactId: z.number().optional().describe('eSputnik internal contact ID'),
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
      requestId: z.string().optional().describe('Request ID for tracking delivery status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.smartSend(ctx.input.messageId, ctx.input.recipients);

    return {
      output: {
        status: result.status || 'OK',
        requestId: result.requestId
      },
      message: `Prepared message **${ctx.input.messageId}** sent to **${ctx.input.recipients.length}** recipient(s). Request ID: ${result.requestId || 'N/A'}.`
    };
  })
  .build();
