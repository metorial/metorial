import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendTemplateMessage = SlateTool.create(spec, {
  name: 'Send Template Message',
  key: 'send_template_message',
  description: `Send a pre-approved WhatsApp template message to a contact, immediately or at a scheduled UTC time. Wati acceptance does not confirm delivery.`,
  instructions: [
    'Use list_templates to find the template ID. Its name is resolved before sending.',
    'Use customParams to substitute template placeholders with dynamic values.',
    'Set scheduledAt to schedule delivery using an ISO 8601 timestamp with a timezone.',
    'A contact ID is resolved to its phone number before sending. Template and contact lookup require read permissions.'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      templateId: z
        .string()
        .describe('ID of the pre-approved message template from list_templates.'),
      target: z
        .string()
        .describe(
          'Recipient phone number with country code, contact ID, or Channel:PhoneNumber.'
        ),
      customParams: z
        .array(
          z.object({
            name: z.string().describe('Parameter name matching the template placeholder.'),
            value: z.string().describe('Value to substitute for the placeholder.')
          })
        )
        .optional()
        .describe('Dynamic parameter values for template placeholders.'),
      channel: z
        .string()
        .optional()
        .describe(
          'Channel name or phone number to send from. Defaults to the target channel or primary channel.'
        ),
      scheduledAt: z
        .string()
        .optional()
        .describe(
          'ISO 8601 timestamp with a timezone for future delivery. If omitted, sends immediately.'
        ),
      broadcastName: z
        .string()
        .optional()
        .describe('Name for grouping and analytics in Wati. Defaults to the template name.')
    })
  )
  .output(
    z.object({
      result: z.boolean().optional().describe('Whether Wati accepted the request.'),
      messageId: z
        .string()
        .optional()
        .describe('Local ID of the accepted message, when returned.'),
      broadcastId: z
        .string()
        .optional()
        .describe('Created broadcast ID. Use get_campaign to inspect its status.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, apiEndpoint: ctx.config.apiEndpoint });
    let { templateId, target, customParams, broadcastName } = ctx.input;
    if (!templateId.trim() || !target.trim()) {
      throw createApiServiceError('templateId and target must not be blank.');
    }
    let scheduledAt: string | undefined;
    if (ctx.input.scheduledAt) {
      if (
        !/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/i.test(ctx.input.scheduledAt) ||
        !Number.isFinite(Date.parse(ctx.input.scheduledAt))
      ) {
        throw createApiServiceError(
          'scheduledAt must be an ISO 8601 timestamp with a timezone.'
        );
      }
      scheduledAt = new Date(ctx.input.scheduledAt).toISOString();
    }
    let template = await client.getTemplate(templateId);
    if (typeof template?.name !== 'string' || !template.name.trim()) {
      throw createApiServiceError(
        'Wati returned no name for this template. Select an approved template from list_templates.'
      );
    }
    let separator = target.lastIndexOf(':');
    let targetChannel = separator >= 0 ? target.slice(0, separator) : undefined;
    let recipient = separator >= 0 ? target.slice(separator + 1) : target;
    if (targetChannel && ctx.input.channel && targetChannel !== ctx.input.channel) {
      throw createApiServiceError('The target channel and channel input must match.');
    }
    let channel = ctx.input.channel ?? targetChannel;
    let phoneNumber = recipient;
    if (!/^\+?\d+$/.test(phoneNumber)) {
      let contact = await client.getContact(target);
      phoneNumber = contact?.phone || contact?.wa_id;
    }
    if (typeof phoneNumber !== 'string' || !/^\+?\d+$/.test(phoneNumber)) {
      throw createApiServiceError(
        'The recipient must resolve to a WhatsApp phone number with country code.'
      );
    }
    if (broadcastName !== undefined && !broadcastName.trim()) {
      throw createApiServiceError('broadcastName must not be blank.');
    }
    let data = {
      templateName: template.name,
      broadcastName: broadcastName ?? template.name,
      phoneNumber: phoneNumber.replace(/^\+/, ''),
      customParams,
      channel
    };
    let result = scheduledAt
      ? await client.scheduleTemplateMessage({ ...data, scheduledAt })
      : await client.sendTemplateMessage(data);
    let receipt = result?.recipients?.[0];
    if (receipt?.errors?.length) {
      throw createApiServiceError(`Wati rejected the recipient: ${receipt.errors.join('; ')}`);
    }
    if (result?.success !== true) {
      throw createApiServiceError(
        'Wati returned no confirmation. Check the campaign before sending again.'
      );
    }
    return {
      output: {
        result: result.success,
        messageId: receipt?.local_message_id ?? undefined,
        broadcastId: result.broadcast_id ?? undefined
      },
      message: scheduledAt
        ? `Template message scheduled for **${target}** at ${scheduledAt}.`
        : `Template message accepted for **${target}**.`
    };
  })
  .build();
