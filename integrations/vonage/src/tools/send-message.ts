import { SlateTool } from 'slates';
import { z } from 'zod';
import { VonageRestClient } from '../lib/client';
import { spec } from '../spec';

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Send a message across multiple channels including SMS, MMS, WhatsApp, Facebook Messenger, Viber, and RCS using the Vonage Messages API.
Supports text, image, audio, video, file, and template message types depending on the channel.
Requires the **API Key, Secret & Application JWT** auth method.`,
  instructions: [
    'For SMS, use channel "sms" and messageType "text".',
    'For WhatsApp, use channel "whatsapp". The "from" must be a WhatsApp Business number.',
    'For WhatsApp templates, use messageType "template" and provide templateName and templateParameters.',
    'Phone numbers must be in E.164 format (e.g., "14155550100") without the + prefix.'
  ],
  constraints: [
    'MMS is only supported in the US.',
    'WhatsApp template messages require pre-approved templates.',
    'Some message types are channel-specific (e.g., template is WhatsApp only, MMS image is sms channel with mms enabled).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      channel: z
        .enum(['sms', 'mms', 'whatsapp', 'messenger', 'viber_service', 'rcs'])
        .describe('The messaging channel to use'),
      messageType: z
        .enum(['text', 'image', 'audio', 'video', 'file', 'template'])
        .describe('Type of message to send'),
      to: z
        .string()
        .describe(
          'Recipient identifier (phone number in E.164 format for SMS/WhatsApp/Viber/RCS, or PSID for Messenger)'
        ),
      from: z
        .string()
        .describe(
          'Sender identifier (phone number, WhatsApp Business number, Messenger Page ID, or Viber Service ID)'
        ),
      text: z
        .string()
        .optional()
        .describe('Text content of the message (required for messageType "text")'),
      imageUrl: z
        .string()
        .optional()
        .describe('URL of the image to send (for messageType "image")'),
      imageCaption: z.string().optional().describe('Caption for the image'),
      audioUrl: z
        .string()
        .optional()
        .describe('URL of the audio file (for messageType "audio")'),
      videoUrl: z
        .string()
        .optional()
        .describe('URL of the video file (for messageType "video")'),
      fileUrl: z
        .string()
        .optional()
        .describe('URL of the file to send (for messageType "file")'),
      fileCaption: z.string().optional().describe('Caption for the file'),
      templateName: z
        .string()
        .optional()
        .describe('WhatsApp template name (for messageType "template")'),
      templateParameters: z
        .array(z.string())
        .optional()
        .describe('Parameters for the WhatsApp template'),
      whatsappLocale: z
        .string()
        .optional()
        .describe('Locale for WhatsApp template (default: "en")'),
      clientRef: z
        .string()
        .optional()
        .describe('Client reference for tracking (up to 100 characters)')
    })
  )
  .output(
    z.object({
      messageUuid: z.string().describe('Unique identifier for the sent message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new VonageRestClient({
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret,
      applicationId: ctx.auth.applicationId,
      privateKey: ctx.auth.privateKey
    });

    let result = await client.sendMessage({
      channel: ctx.input.channel,
      messageType: ctx.input.messageType,
      to: ctx.input.to,
      from: ctx.input.from,
      text: ctx.input.text,
      imageUrl: ctx.input.imageUrl,
      imageCaption: ctx.input.imageCaption,
      audioUrl: ctx.input.audioUrl,
      videoUrl: ctx.input.videoUrl,
      fileUrl: ctx.input.fileUrl,
      fileCaption: ctx.input.fileCaption,
      templateName: ctx.input.templateName,
      templateParameters: ctx.input.templateParameters,
      whatsappLocale: ctx.input.whatsappLocale,
      clientRef: ctx.input.clientRef
    });

    return {
      output: result,
      message: `Message sent via **${ctx.input.channel}** to **${ctx.input.to}**. Message UUID: \`${result.messageUuid}\``
    };
  })
  .build();
