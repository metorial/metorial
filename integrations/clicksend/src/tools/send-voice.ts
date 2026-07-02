import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClickSendClient } from '../lib/client';
import { spec } from '../spec';

export let sendVoiceTool = SlateTool.create(spec, {
  name: 'Send Voice Message',
  key: 'send_voice',
  description: `Send text-to-speech voice calls to phone numbers. The text message is converted to speech and delivered as a phone call. Supports configurable voice gender, language, and scheduling.`,
  instructions: [
    'The body text will be converted to speech and delivered as a voice call',
    'Supported languages include en-us, en-gb, en-au, de-de, es-es, fr-fr, it-it, ja-jp, ko-kr, pt-br, zh-cn, and more'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      messages: z
        .array(
          z.object({
            to: z.string().describe('Recipient phone number in E.164 format'),
            body: z.string().describe('Text message to be converted to speech'),
            voiceGender: z
              .enum(['female', 'male'])
              .optional()
              .describe('Voice gender for text-to-speech (default: female)'),
            voiceLang: z
              .string()
              .optional()
              .describe('Language code for text-to-speech (e.g., en-us, en-gb, de-de)'),
            schedule: z.number().optional().describe('Unix timestamp for scheduled delivery'),
            customString: z
              .string()
              .optional()
              .describe('Custom reference string for tracking'),
            country: z.string().optional().describe('ISO country code for number formatting'),
            from: z.string().optional().describe('Caller ID phone number')
          })
        )
        .min(1)
        .describe('List of voice messages to send')
    })
  )
  .output(
    z.object({
      totalPrice: z.number().describe('Total cost of all voice calls'),
      queuedCount: z.number().describe('Number of voice calls queued'),
      messages: z
        .array(
          z.object({
            messageId: z.string().describe('Unique message identifier'),
            to: z.string().describe('Recipient phone number'),
            from: z.string().describe('Caller ID used'),
            body: z.string().describe('Message body text'),
            status: z.string().describe('Delivery status')
          })
        )
        .describe('Details for each voice message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickSendClient({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    ctx.progress('Sending voice messages...');

    let result = await client.sendVoice(ctx.input.messages);

    let sentMessages = result.data?.messages || [];
    let mappedMessages = sentMessages.map((msg: any) => ({
      messageId: msg.message_id || '',
      to: msg.to || '',
      from: msg.from || '',
      body: msg.body || '',
      status: msg.status || ''
    }));

    let totalPrice = sentMessages.reduce(
      (sum: number, msg: any) => sum + (Number.parseFloat(msg.message_price) || 0),
      0
    );

    return {
      output: {
        totalPrice,
        queuedCount: mappedMessages.length,
        messages: mappedMessages
      },
      message: `Queued **${mappedMessages.length}** voice call(s). Total cost: **$${totalPrice.toFixed(4)}**`
    };
  })
  .build();
