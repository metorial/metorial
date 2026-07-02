import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendSms = SlateTool.create(spec, {
  name: 'Send SMS',
  key: 'send_sms',
  description: `Send an SMS or MMS message via RingCentral. Supports person-to-person (P2P) messaging for individual conversations and application-to-person (A2P) high-volume batch messaging for bulk notifications or campaigns.`,
  instructions: [
    'Provide **fromNumber** as the RingCentral phone number to send from (E.164 format, e.g., +15551234567).',
    'Provide one or more **recipientNumbers** in E.164 format.',
    'Use **mode** "p2p" (default) for standard person-to-person SMS, or "a2p" for high-volume application-to-person batch messaging.',
    'A2P mode is intended for bulk notifications, alerts, or campaigns and may have different rate limits and compliance requirements.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      fromNumber: z
        .string()
        .describe(
          'Sender phone number in E.164 format (e.g., +15551234567). Must be a RingCentral number assigned to the account.'
        ),
      recipientNumbers: z
        .array(z.string())
        .min(1)
        .describe('List of recipient phone numbers in E.164 format.'),
      text: z.string().describe('Text content of the SMS message.'),
      mode: z
        .enum(['p2p', 'a2p'])
        .optional()
        .default('p2p')
        .describe(
          'Messaging mode: "p2p" for person-to-person (default), "a2p" for application-to-person bulk messaging.'
        )
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Unique identifier of the sent message or batch.'),
      status: z.string().describe('Delivery status of the message or batch.'),
      fromNumber: z.string().describe('Phone number the message was sent from.'),
      recipientCount: z.number().describe('Number of recipients the message was sent to.'),
      mode: z.enum(['p2p', 'a2p']).describe('Messaging mode that was used.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    let mode = ctx.input.mode || 'p2p';

    if (mode === 'a2p') {
      let result = await client.sendA2pSms(
        ctx.input.fromNumber,
        ctx.input.recipientNumbers,
        ctx.input.text
      );

      return {
        output: {
          messageId: String(result.id || result.batchId || ''),
          status: result.status || 'Queued',
          fromNumber: ctx.input.fromNumber,
          recipientCount: ctx.input.recipientNumbers.length,
          mode: 'a2p' as const
        },
        message: `Sent A2P batch SMS from \`${ctx.input.fromNumber}\` to ${ctx.input.recipientNumbers.length} recipient(s).`
      };
    }

    let result = await client.sendSms(
      ctx.input.fromNumber,
      ctx.input.recipientNumbers,
      ctx.input.text
    );

    return {
      output: {
        messageId: String(result.id || ''),
        status: result.messageStatus || result.status || 'Sent',
        fromNumber: ctx.input.fromNumber,
        recipientCount: ctx.input.recipientNumbers.length,
        mode: 'p2p' as const
      },
      message: `Sent P2P SMS from \`${ctx.input.fromNumber}\` to ${ctx.input.recipientNumbers.length} recipient(s).`
    };
  })
  .build();
