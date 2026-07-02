import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendSms = SlateTool.create(spec, {
  name: 'Send SMS',
  key: 'send_sms',
  description: `Send an SMS or MMS text message through a connected Android device. The message is queued and sent when the phone syncs. Supports sending to multiple phone numbers for group MMS.
Requires Pushbullet Pro for more than 100 messages per month.`,
  constraints: [
    'Queued messages are automatically deleted after 1 hour if not sent.',
    'Pushbullet Pro is required to send more than 100 messages per month.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      targetDeviceIden: z
        .string()
        .describe('Identifier of the Android device to send the SMS from'),
      phoneNumbers: z
        .array(z.string())
        .describe(
          'Phone number(s) to send the message to. Multiple numbers create a group MMS.'
        ),
      message: z.string().describe('Text message content'),
      fileType: z
        .string()
        .optional()
        .describe('MIME type of attached image for MMS (e.g., "image/jpeg")'),
      fileUrl: z.string().optional().describe('URL of uploaded image for MMS')
    })
  )
  .output(
    z.object({
      textIden: z.string().describe('Unique identifier of the queued text'),
      status: z.string().optional().describe('Status of the text (typically "queued")'),
      targetDeviceIden: z.string().describe('Device the SMS will be sent from'),
      phoneNumbers: z.array(z.string()).describe('Recipient phone numbers'),
      message: z.string().describe('Message content')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let text = await client.createText({
      targetDeviceIden: ctx.input.targetDeviceIden,
      addresses: ctx.input.phoneNumbers,
      message: ctx.input.message,
      fileType: ctx.input.fileType,
      fileUrl: ctx.input.fileUrl
    });

    let recipients = ctx.input.phoneNumbers.join(', ');

    return {
      output: {
        textIden: text.iden,
        status: text.data.status,
        targetDeviceIden: text.data.target_device_iden,
        phoneNumbers: text.data.addresses,
        message: text.data.message
      },
      message: `SMS queued to **${recipients}** via device \`${ctx.input.targetDeviceIden}\`. Status: ${text.data.status || 'queued'}.`
    };
  })
  .build();
