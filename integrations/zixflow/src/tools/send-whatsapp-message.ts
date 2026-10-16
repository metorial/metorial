import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { ZixflowClient } from '../lib/client';
import { operationOutput, requireInput } from '../lib/response';
import { spec } from '../spec';

export let sendWhatsAppMessage = SlateTool.create(spec, {
  name: 'Send WhatsApp Message',
  key: 'send_whatsapp_message',
  description: `Send a WhatsApp message to a recipient. Supports two modes:
- **Template message**: Send a pre-approved WhatsApp template with variable substitution.
- **Direct message**: Send a free-form text, image, video, document, audio, or location message (requires an active 24-hour session with the recipient).`,
  instructions: [
    'For template messages, provide templateName and language. Use list_whatsapp_resources to find available templates.',
    'For direct messages, set messageType to the desired type (text, image, video, document, audio, location) and provide the corresponding content.',
    'Discover phoneId with list_whatsapp_resources using resourceType accounts.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      reportUrl: z.string().optional().describe('URL to receive provider delivery reports'),
      to: z
        .string()
        .describe('Recipient phone number in international format (e.g., "13023895111")'),
      phoneId: z
        .string()
        .describe(
          'WhatsApp phone ID. Discover it with list_whatsapp_resources using resourceType accounts.'
        ),
      mode: z
        .enum(['template', 'direct'])
        .describe(
          'Message mode: "template" for approved templates, "direct" for free-form messages'
        ),
      templateName: z
        .string()
        .optional()
        .describe('Template name (required for template mode)'),
      language: z
        .string()
        .optional()
        .describe(
          'Template language code, e.g., "en" or "en_US" (required for template mode)'
        ),
      variables: z
        .record(z.string(), z.any())
        .optional()
        .describe('Template variables as key-value pairs'),
      messageType: z
        .enum(['text', 'image', 'video', 'document', 'audio', 'location'])
        .optional()
        .describe('Direct message type (required for direct mode)'),
      text: z
        .object({
          body: z.string().describe('Text message body (max 4096 chars)'),
          previewUrl: z.boolean().optional().describe('Enable URL preview rendering')
        })
        .optional()
        .describe('Text message content (for direct/text mode)'),
      mediaUrl: z
        .string()
        .optional()
        .describe('URL of the media file (for image, video, document, audio)'),
      caption: z.string().optional().describe('Caption for media messages'),
      filename: z.string().optional().describe('Filename for document messages'),
      location: z
        .object({
          latitude: z.number().describe('Latitude'),
          longitude: z.number().describe('Longitude'),
          name: z.string().optional().describe('Location name'),
          address: z.string().optional().describe('Location address')
        })
        .optional()
        .describe('Location details (for direct/location mode)'),
      linkWithRecord: z.boolean().optional().describe('Associate message with a CRM record')
    })
  )
  .output(
    z.object({
      raw: z.unknown().optional().describe('Complete response returned by Zixflow'),
      messageId: z.string().optional().describe('Message ID when returned by Zixflow'),
      campaignId: z.string().optional().describe('Campaign ID when returned by Zixflow'),
      success: z
        .boolean()
        .describe('Whether Zixflow acknowledged successful message submission'),
      responseMessage: z.string().describe('Response message from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZixflowClient({ token: ctx.auth.token });
    let result: any;

    requireInput(ctx.input.to, 'to');
    requireInput(ctx.input.phoneId, 'phoneId');
    if (ctx.input.mode === 'template') {
      requireInput(ctx.input.templateName, 'templateName');
      requireInput(ctx.input.language, 'language');
      result = await client.sendWhatsAppTemplate({
        reportUrl: ctx.input.reportUrl,
        to: ctx.input.to,
        phoneId: ctx.input.phoneId,
        templateName: ctx.input.templateName!,
        language: ctx.input.language!,
        variables: ctx.input.variables,
        linkWithRecord: ctx.input.linkWithRecord
      });
    } else {
      let messageType = requireInput(ctx.input.messageType, 'messageType');
      if (messageType === 'text') requireInput(ctx.input.text?.body, 'text.body');
      else if (messageType === 'location' && !ctx.input.location)
        throw createApiServiceError('location is required for a location message.', {
          reason: 'zixflow_invalid_input'
        });
      else if (['image', 'video', 'document', 'audio'].includes(messageType))
        requireInput(ctx.input.mediaUrl, 'mediaUrl');
      let content: Record<string, any> = {};

      if (messageType === 'text' && ctx.input.text) {
        content.text = {
          body: ctx.input.text.body,
          preview_url: ctx.input.text.previewUrl ?? false
        };
      } else if (['image', 'video', 'document', 'audio'].includes(messageType)) {
        content[messageType] = { link: ctx.input.mediaUrl };
        if (ctx.input.caption && messageType !== 'audio')
          content[messageType].caption = ctx.input.caption;
        if (ctx.input.filename && messageType === 'document')
          content[messageType].filename = ctx.input.filename;
      } else if (messageType === 'location' && ctx.input.location) {
        content.location = {
          ...ctx.input.location,
          latitude: String(ctx.input.location.latitude),
          longitude: String(ctx.input.location.longitude)
        };
      }

      result = await client.sendWhatsAppDirectMessage({
        reportUrl: ctx.input.reportUrl,
        to: ctx.input.to,
        phoneId: ctx.input.phoneId,
        type: messageType,
        content,
        linkWithRecord: ctx.input.linkWithRecord
      });
    }

    return {
      output: {
        ...operationOutput(result),
        messageId: typeof result.messageId === 'string' ? result.messageId : undefined,
        campaignId: typeof result.campaignId === 'string' ? result.campaignId : undefined
      },
      message:
        'Zixflow accepted the message request; use a delivery report to check recipient delivery.'
    };
  })
  .build();
