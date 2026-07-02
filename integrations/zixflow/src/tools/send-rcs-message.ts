import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZixflowClient } from '../lib/client';
import { spec } from '../spec';

export let sendRcsMessage = SlateTool.create(spec, {
  name: 'Send RCS Message',
  key: 'send_rcs_message',
  description: `Send an RCS (Rich Communication Services) message. Supports two modes:
- **Template message**: Send a pre-approved RCS template with variable substitution.
- **Direct message**: Send a free-form text, image, video, document, or audio message.

Requires an RCS bot ID configured in your Zixflow settings.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      to: z.string().describe('Recipient phone number in international format'),
      botId: z.string().describe('RCS bot ID from your Zixflow settings'),
      mode: z.enum(['template', 'direct']).describe('Message mode: "template" or "direct"'),
      templateName: z
        .string()
        .optional()
        .describe('Template name (required for template mode)'),
      variables: z
        .record(z.string(), z.any())
        .optional()
        .describe('Template variables as key-value pairs'),
      messageType: z
        .enum(['text', 'image', 'video', 'document', 'audio'])
        .optional()
        .describe('Direct message type (required for direct mode)'),
      text: z
        .string()
        .optional()
        .describe('Text message content (max 4096 chars, for direct/text mode)'),
      mediaUrl: z
        .string()
        .optional()
        .describe('URL of the media file (for image, video, document, audio)'),
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
      result = await client.sendRcsTemplate({
        to: ctx.input.to,
        botId: ctx.input.botId,
        templateName: ctx.input.templateName!,
        variables: ctx.input.variables,
        linkWithRecord: ctx.input.linkWithRecord
      });
    } else {
      let messageType = ctx.input.messageType!;
      let content: Record<string, any> = {};

      if (messageType === 'text') {
        content.text = ctx.input.text;
      } else {
        content[messageType] = { url: ctx.input.mediaUrl };
      }

      result = await client.sendRcsDirectMessage({
        to: ctx.input.to,
        botId: ctx.input.botId,
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
        ? `RCS ${ctx.input.mode} message sent to ${ctx.input.to}.`
        : `Failed to send RCS message: ${result.message}`
    };
  })
  .build();
