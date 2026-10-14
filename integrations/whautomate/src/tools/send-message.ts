import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Send a message across WhatsApp, Instagram, Telegram, or Messenger channels. Supports text messages, media messages (images, documents, audio, video), and template messages.
For WhatsApp, text and media messages require an active 24-hour session; template messages can be sent anytime. Messages can be scheduled for future delivery.`,
  instructions: [
    'For WhatsApp text/media messages, ensure there is an active 24-hour session with the contact.',
    'Use template messages to reach WhatsApp contacts outside the session window.',
    'Provide locationId from list_locations. WhatsApp accepts contactId, clientId or phoneNumber; other channels require contactId.'
  ],
  constraints: [
    'WhatsApp text and media messages can only be sent during an active 24-hour session.'
  ]
})
  .input(
    z.object({
      channel: z
        .enum(['whatsapp', 'telegram', 'instagram', 'messenger'])
        .describe('Messaging channel to send on'),
      messageType: z
        .enum(['sendtext', 'sendmedia', 'sendtemplate'])
        .describe('Type of message to send'),
      locationId: z
        .string()
        .optional()
        .describe(
          'Sending location ID. Call list_locations to discover locations; required for every channel.'
        ),
      contactId: z.string().optional().describe('Contact ID to send to'),
      clientId: z.string().optional().describe('Client ID to send to'),
      phoneNumber: z
        .string()
        .optional()
        .describe('Recipient phone number (alternative to contactId/clientId)'),
      recipientName: z.string().optional().describe('Recipient name (used with phoneNumber)'),
      text: z.string().optional().describe('Text message content (for sendtext)'),
      mediaUrl: z.string().optional().describe('URL of media to send (for sendmedia)'),
      mimeType: z
        .string()
        .optional()
        .describe(
          'Media MIME type, such as image/jpeg or application/pdf (required for sendmedia)'
        ),
      buttons: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Telegram interactive template buttons'),
      elements: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Instagram or Messenger interactive template elements'),
      mediaType: z
        .string()
        .optional()
        .describe(
          'Legacy media type; provide mimeType for the MIME value required by sendmedia'
        ),
      caption: z.string().optional().describe('Caption for media (for sendmedia)'),
      fileName: z.string().optional().describe('Filename for document media'),
      templateName: z.string().optional().describe('Template name (for sendtemplate)'),
      templateLanguage: z
        .string()
        .optional()
        .describe('Template language code (for sendtemplate)'),
      templateParameters: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Documented template fields: headerMediaUrl, headerTextParameters, bodyTextParameters, buttonUrlParameters, locationParameters, flowParameters; Telegram headerType/buttons/textMessage; Instagram/Messenger elements'
        ),
      scheduleDateTime: z
        .string()
        .optional()
        .describe('ISO 8601 UTC datetime to schedule message delivery')
    })
  )
  .output(
    z.object({
      messageId: z.string().optional().describe('ID of the sent message'),
      success: z.boolean().describe('Whether the message was sent successfully'),
      status: z.string().optional().describe('Message delivery status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiHost: ctx.config.apiHost
    });

    if (!ctx.input.locationId) {
      throw createApiServiceError(
        'locationId is required. Call list_locations to discover the sending location.'
      );
    }
    let recipients = [ctx.input.contactId, ctx.input.clientId, ctx.input.phoneNumber].filter(
      Boolean
    );
    if (recipients.length !== 1)
      throw createApiServiceError(
        'Provide exactly one of contactId, clientId or phoneNumber.'
      );
    if (ctx.input.channel !== 'whatsapp' && !ctx.input.contactId) {
      throw createApiServiceError('Telegram, Instagram and Messenger require contactId.');
    }
    let payload: Record<string, any> = pickDefined({
      location: { id: ctx.input.locationId },
      contact: ctx.input.contactId ? { id: ctx.input.contactId } : undefined,
      client: ctx.input.clientId ? { id: ctx.input.clientId } : undefined,
      recepient: ctx.input.phoneNumber
        ? pickDefined({ phoneNumber: ctx.input.phoneNumber, name: ctx.input.recipientName })
        : undefined,
      scheduleDateTime: ctx.input.scheduleDateTime
    });

    if (ctx.input.messageType === 'sendtext') {
      if (!ctx.input.text?.trim())
        throw createApiServiceError('text is required for sendtext.');
      payload.textMessage = ctx.input.text;
    } else if (ctx.input.messageType === 'sendmedia') {
      let mimeType =
        ctx.input.mimeType ??
        (ctx.input.mediaType?.includes('/') ? ctx.input.mediaType : undefined);
      if (!ctx.input.mediaUrl || !mimeType)
        throw createApiServiceError('mediaUrl and mimeType are required for sendmedia.');
      Object.assign(
        payload,
        pickDefined({
          mediaUrl: ctx.input.mediaUrl,
          mimeType,
          caption: ctx.input.caption,
          fileName: ctx.input.fileName
        })
      );
    } else {
      let parameters = ctx.input.templateParameters ?? {};
      if (ctx.input.channel === 'whatsapp') {
        if (!ctx.input.templateName || !ctx.input.templateLanguage) {
          throw createApiServiceError(
            'templateName and templateLanguage are required for WhatsApp templates.'
          );
        }
        Object.assign(
          payload,
          pickDefined({
            template: { name: ctx.input.templateName, language: ctx.input.templateLanguage },
            headerMediaUrl: parameters.headerMediaUrl,
            headerTextParameters: parameters.headerTextParameters,
            bodyTextParameters: parameters.bodyTextParameters,
            buttonUrlParameters: parameters.buttonUrlParameters,
            locationParameters: parameters.locationParameters,
            flowParameters: parameters.flowParameters
          })
        );
      } else if (ctx.input.channel === 'telegram') {
        let textMessage = ctx.input.text ?? parameters.textMessage;
        let buttons = ctx.input.buttons ?? parameters.buttons;
        if (
          typeof textMessage !== 'string' ||
          !textMessage.trim() ||
          !Array.isArray(buttons) ||
          !buttons.length
        ) {
          throw createApiServiceError(
            'Telegram templates require text and a nonempty buttons array.'
          );
        }
        Object.assign(
          payload,
          pickDefined({
            textMessage,
            buttons,
            headerType: parameters.headerType,
            mimeType: ctx.input.mimeType ?? parameters.mimeType,
            mediaUrl: ctx.input.mediaUrl ?? parameters.mediaUrl
          })
        );
      } else {
        let elements = ctx.input.elements ?? parameters.elements;
        if (!Array.isArray(elements) || !elements.length)
          throw createApiServiceError(
            'Instagram and Messenger templates require a nonempty elements array.'
          );
        payload.elements = elements;
      }
    }

    let result = await client.sendMessage(ctx.input.channel, ctx.input.messageType, payload);

    return {
      output: {
        messageId: result.id ?? result._id ?? result.messageId ?? undefined,
        success: true,
        status: result.status ?? undefined
      },
      message: `Sent **${ctx.input.messageType.replace('send', '')}** message on **${ctx.input.channel}**.`
    };
  })
  .build();
