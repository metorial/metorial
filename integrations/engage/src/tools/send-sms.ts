import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendSms = SlateTool.create(spec, {
  name: 'Send Transactional SMS',
  key: 'send_sms',
  description: `Sends a transactional SMS through a connected SMS provider. Supports Twilio, Termii, Africa's Talking, KudiSMS, and Hollatags. The source parameter specifies which provider to use.`,
  instructions: [
    'The "from" field must be a Sender ID registered with your SMS provider.',
    'The "to" field must include the country code (digits only, no + or spaces).',
    'For Termii and KudiSMS, use "channel" to specify message type: "generic" for promotional or "dnd" for transactional/OTP.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      from: z.string().describe('Sender ID registered with your SMS provider'),
      to: z.string().describe('Recipient phone number with country code (digits only)'),
      body: z.string().describe('SMS message content'),
      source: z
        .enum(['twilio', 'termii', 'at', 'kudisms', 'hollatags'])
        .describe('SMS provider to send through'),
      trackClicks: z
        .boolean()
        .optional()
        .describe('Enable click tracking for links in the message'),
      channel: z
        .enum(['generic', 'dnd'])
        .optional()
        .describe(
          'Message channel for Termii/KudiSMS (generic=promotional, dnd=transactional/OTP)'
        )
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('ID of the sent SMS message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      secret: ctx.auth.secret
    });

    let result = await client.sendSms({
      from: ctx.input.from,
      to: ctx.input.to,
      body: ctx.input.body,
      source: ctx.input.source,
      trackClicks: ctx.input.trackClicks,
      channel: ctx.input.channel
    });

    return {
      output: {
        messageId: result.id
      },
      message: `Sent SMS to **${ctx.input.to}** via **${ctx.input.source}** (ID: ${result.id}).`
    };
  })
  .build();
