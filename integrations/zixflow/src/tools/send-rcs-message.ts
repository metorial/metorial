import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { ZixflowClient } from '../lib/client';
import { operationOutput, requireInput } from '../lib/response';
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
      suggestions: z
        .array(
          z.object({
            type: z.enum(['reply', 'open-url', 'dialer', 'location', 'calendar-event']),
            text: z.string(),
            postback: z.string().optional(),
            url: z.string().optional(),
            phoneNumber: z.string().optional(),
            label: z.string().optional(),
            latitude: z.number().optional(),
            longitude: z.number().optional(),
            title: z.string().optional(),
            description: z.string().optional(),
            startTime: z.string().optional(),
            endTime: z.string().optional()
          })
        )
        .optional()
        .describe('Optional direct-message reply or action suggestions'),
      reportUrl: z.string().optional().describe('URL to receive provider delivery reports'),
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
    for (let suggestion of ctx.input.suggestions ?? []) {
      if (suggestion.type === 'open-url') requireInput(suggestion.url, 'suggestion.url');
      if (suggestion.type === 'dialer')
        requireInput(suggestion.phoneNumber, 'suggestion.phoneNumber');
      if (suggestion.type === 'location') {
        requireInput(suggestion.label, 'suggestion.label');
        if (suggestion.latitude === undefined || suggestion.longitude === undefined)
          throw createApiServiceError('Location suggestions require latitude and longitude.', {
            reason: 'zixflow_invalid_input'
          });
      }
      if (suggestion.type === 'calendar-event') {
        requireInput(suggestion.title, 'suggestion.title');
        requireInput(suggestion.description, 'suggestion.description');
        requireInput(suggestion.startTime, 'suggestion.startTime');
        requireInput(suggestion.endTime, 'suggestion.endTime');
      }
    }
    let result: any;

    requireInput(ctx.input.to, 'to');
    requireInput(ctx.input.botId, 'botId');
    if (ctx.input.mode === 'template') {
      requireInput(ctx.input.templateName, 'templateName');
      result = await client.sendRcsTemplate({
        reportUrl: ctx.input.reportUrl,
        to: ctx.input.to,
        botId: ctx.input.botId,
        templateName: ctx.input.templateName!,
        variables: ctx.input.variables,
        linkWithRecord: ctx.input.linkWithRecord
      });
    } else {
      let messageType = requireInput(ctx.input.messageType, 'messageType');
      if (messageType === 'text') requireInput(ctx.input.text, 'text');
      else requireInput(ctx.input.mediaUrl, 'mediaUrl');
      let content: Record<string, any> = {};

      if (messageType === 'text') {
        content.text = ctx.input.text;
      } else {
        let field = messageType === 'document' ? 'fileUrl' : `${messageType}Url`;
        content[field] = ctx.input.mediaUrl;
      }

      result = await client.sendRcsDirectMessage({
        reportUrl: ctx.input.reportUrl,
        to: ctx.input.to,
        botId: ctx.input.botId,
        type: messageType,
        content,
        suggestions: ctx.input.suggestions,
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
