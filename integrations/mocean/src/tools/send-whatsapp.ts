import { SlateTool } from 'slates';
import { z } from 'zod';
import { MoceanClient } from '../lib/client';
import { spec } from '../spec';

let templateContent = z.object({
  type: z.literal('template'),
  waTemplate: z.object({
    name: z.string().describe('Template name'),
    language: z.string().describe('Template language code (e.g., "en")'),
    headerParams: z
      .array(
        z.object({
          type: z.enum(['text', 'image', 'video', 'document']).describe('Parameter type'),
          text: z.string().optional().describe('Text value (for type "text")'),
          richMediaUrl: z
            .string()
            .optional()
            .describe('Media URL (for image/video/document types)')
        })
      )
      .optional()
      .describe('Header parameter values'),
    bodyParams: z
      .array(
        z.object({
          type: z.literal('text'),
          text: z.string().describe('Parameter value filling {{1}}, {{2}}, etc. in order')
        })
      )
      .optional()
      .describe('Body parameter values'),
    waButtons: z
      .array(
        z.object({
          type: z.string().describe('Button type (e.g., "quick_reply")'),
          index: z.number().describe('Button index (0-based)'),
          payload: z.string().describe('Button payload value')
        })
      )
      .optional()
      .describe('Button parameter values')
  })
});

let textContent = z.object({
  type: z.literal('text'),
  text: z.string().describe('Text message content'),
  previewUrl: z.boolean().optional().describe('Enable URL preview in the message')
});

let mediaContent = z.object({
  type: z.enum(['image', 'video', 'audio', 'document']),
  richMediaUrl: z.string().describe('URL of the media file'),
  text: z.string().optional().describe('Caption for the media')
});

let locationContent = z.object({
  type: z.literal('location'),
  latitude: z.number().describe('Latitude coordinate'),
  longitude: z.number().describe('Longitude coordinate'),
  name: z.string().optional().describe('Location name'),
  address: z.string().optional().describe('Location address')
});

let reactionContent = z.object({
  type: z.literal('reaction'),
  emoji: z.string().describe('Emoji to react with'),
  replyToMessageId: z.string().describe('Message ID to react to')
});

export let sendWhatsApp = SlateTool.create(spec, {
  name: 'Send WhatsApp Message',
  key: 'send_whatsapp',
  description: `Send a WhatsApp message through a registered WhatsApp Business Account number. Supports multiple content types: **text**, **template**, **image**, **video**, **audio**, **document**, **location**, and **reaction**. Templates are required for initiating conversations outside the 24-hour messaging window.`,
  instructions: [
    'Use type "template" to send pre-approved templates (required outside 24-hour window)',
    'Use type "text" for simple text messages within an active conversation',
    'Use media types ("image", "video", "audio", "document") with a public URL'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      from: z
        .string()
        .describe('Registered WhatsApp Business sender phone number with country code'),
      to: z.string().describe('Recipient phone number with country code'),
      content: z
        .union([templateContent, textContent, mediaContent, locationContent, reactionContent])
        .describe('Message content'),
      deliveryReportUrl: z
        .string()
        .optional()
        .describe('Webhook URL for delivery status events')
    })
  )
  .output(
    z.object({
      status: z.number().describe('Status code (0 = success)'),
      messageId: z.string().optional().describe('Unique message identifier for tracking'),
      errorMessage: z.string().optional().describe('Error description if failed'),
      hint: z.string().optional().describe('Additional hint for resolving errors')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MoceanClient({
      token: ctx.auth.token,
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    let content: any;
    let inputContent = ctx.input.content;

    if (inputContent.type === 'template') {
      let tmpl = inputContent.waTemplate;
      content = {
        type: 'template',
        wa_template: {
          name: tmpl.name,
          language: tmpl.language,
          header_params: tmpl.headerParams?.map(p => ({
            type: p.type,
            text: p.text,
            rich_media_url: p.richMediaUrl
          })),
          body_params: tmpl.bodyParams?.map(p => ({
            type: p.type,
            text: p.text
          })),
          wa_buttons: tmpl.waButtons?.map(b => ({
            type: b.type,
            index: b.index,
            payload: b.payload
          }))
        }
      };
    } else if (inputContent.type === 'text') {
      content = {
        type: 'text',
        text: inputContent.text,
        preview_url: inputContent.previewUrl
      };
    } else if (inputContent.type === 'location') {
      content = {
        type: 'location',
        location: {
          latitude: inputContent.latitude,
          longitude: inputContent.longitude,
          name: inputContent.name,
          address: inputContent.address
        }
      };
    } else if (inputContent.type === 'reaction') {
      content = {
        type: 'reaction',
        text: inputContent.emoji,
        reply_to_msg_id: inputContent.replyToMessageId
      };
    } else {
      // media types: image, video, audio, document
      content = {
        type: inputContent.type,
        rich_media_url: inputContent.richMediaUrl,
        text: inputContent.text
      };
    }

    let result = await client.sendWhatsApp({
      from: ctx.input.from,
      to: ctx.input.to,
      content,
      eventUrl: ctx.input.deliveryReportUrl
    });

    return {
      output: {
        status: result.status,
        messageId: result.message_id,
        errorMessage: result.err_msg,
        hint: result.hint
      },
      message:
        result.status === 0
          ? `WhatsApp **${inputContent.type}** message sent to **${ctx.input.to}**. Message ID: **${result.message_id}**`
          : `Failed to send WhatsApp message: ${result.err_msg}${result.hint ? ` (${result.hint})` : ''}`
    };
  })
  .build();
