import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZixflowClient } from '../lib/client';
import { spec } from '../spec';

export let sendWhatsAppMessage = SlateTool.create(spec, {
  name: 'Send WhatsApp Message',
  key: 'send_whatsapp_message',
  description: `Send a WhatsApp message to a recipient. Supports two modes:
- **Template message**: Send a pre-approved WhatsApp template with variable substitution.
- **Direct message**: Send a free-form text, image, video, document, audio, or location message (requires an active 24-hour session with the recipient).`,
  instructions: [
    'For template messages, provide templateName and language. Use getWhatsAppTemplates to find available templates.',
    'For direct messages, set messageType to the desired type (text, image, video, document, audio, location) and provide the corresponding content.',
    'The phoneId can be found using the List WhatsApp Accounts tool.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      to: z
        .string()
        .describe('Recipient phone number in international format (e.g., "13023895111")'),
      phoneId: z.string().describe('WhatsApp phone ID from your connected WABA account'),
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
      success: z.boolean().describe('Whether the message was sent successfully'),
      responseMessage: z.string().describe('Response message from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZixflowClient({ token: ctx.auth.token });
    let result: any;

    if (ctx.input.mode === 'template') {
      result = await client.sendWhatsAppTemplate({
        to: ctx.input.to,
        phoneId: ctx.input.phoneId,
        templateName: ctx.input.templateName!,
        language: ctx.input.language!,
        variables: ctx.input.variables,
        linkWithRecord: ctx.input.linkWithRecord
      });
    } else {
      let messageType = ctx.input.messageType!;
      let content: Record<string, any> = {};

      if (messageType === 'text' && ctx.input.text) {
        content.text = {
          body: ctx.input.text.body,
          preview_url: ctx.input.text.previewUrl ?? false
        };
      } else if (['image', 'video', 'document', 'audio'].includes(messageType)) {
        content[messageType] = { link: ctx.input.mediaUrl };
        if (ctx.input.caption) content[messageType].caption = ctx.input.caption;
        if (ctx.input.filename && messageType === 'document')
          content[messageType].filename = ctx.input.filename;
      } else if (messageType === 'location' && ctx.input.location) {
        content.location = ctx.input.location;
      }

      result = await client.sendWhatsAppDirectMessage({
        to: ctx.input.to,
        phoneId: ctx.input.phoneId,
        type: messageType,
        content,
        linkWithRecord: ctx.input.linkWithRecord
      });
    }

    return {
      output: {
        success: result.status === true,
        responseMessage: result.message ?? 'Unknown response'
      },
      message: result.status
        ? `WhatsApp ${ctx.input.mode} message sent to ${ctx.input.to}.`
        : `Failed to send WhatsApp message: ${result.message}`
    };
  })
  .build();
