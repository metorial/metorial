import { SlateTool } from 'slates';
import { z } from 'zod';
import { CallPageClient } from '../lib/client';
import { spec } from '../spec';

let smsMessageIdEnum = z.enum([
  'post_call_visitor',
  'scheduled_call_reminder',
  'post_call_manager',
  'missed_call_notification'
]);

export let listSmsTemplates = SlateTool.create(spec, {
  name: 'List SMS Templates',
  key: 'list_sms_templates',
  description: `Retrieve all SMS templates configured for a widget. Templates include post-call messages, scheduled call reminders, and missed call notifications.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      widgetId: z.number().describe('The widget ID to list SMS templates for')
    })
  )
  .output(
    z.object({
      templates: z
        .array(z.any())
        .describe('List of SMS template objects with enabled status and text content')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CallPageClient({ token: ctx.auth.token });

    let templates = await client.getSmsMessages(ctx.input.widgetId);

    return {
      output: { templates },
      message: `Retrieved **${templates.length}** SMS templates for widget **#${ctx.input.widgetId}**.`
    };
  })
  .build();

export let upsertSmsTemplate = SlateTool.create(spec, {
  name: 'Upsert SMS Template',
  key: 'upsert_sms_template',
  description: `Create or update a custom SMS template for a widget. Supports four template types: post-call message to visitor, scheduled call reminder, post-call message to manager, and missed call notification. Templates support variables like \`:company_name\`, \`:name\`, \`:tel\`, and \`:url\`.`,
  instructions: [
    'SMS text is limited to 240 characters.',
    'Available variables: :company_name, :name, :tel, :url',
    'Use action "create" for new templates or "update" for existing ones.'
  ],
  constraints: ['SMS text must not exceed 240 characters.'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      widgetId: z.number().describe('The widget ID'),
      messageId: smsMessageIdEnum.describe('Template type identifier'),
      enabled: z.boolean().describe('Whether this SMS template is active'),
      text: z
        .string()
        .describe(
          'SMS text content (max 240 characters, supports :company_name, :name, :tel, :url variables)'
        ),
      action: z
        .enum(['create', 'update'])
        .default('create')
        .describe('Whether to create a new template or update an existing one')
    })
  )
  .output(
    z.object({
      smsId: z.number().describe('The ID of the created/updated SMS template')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CallPageClient({ token: ctx.auth.token });
    let result: { smsId: number };

    if (ctx.input.action === 'update') {
      result = await client.updateSmsMessage({
        widgetId: ctx.input.widgetId,
        messageId: ctx.input.messageId,
        enabled: ctx.input.enabled,
        text: ctx.input.text
      });
    } else {
      result = await client.createSmsMessage({
        widgetId: ctx.input.widgetId,
        messageId: ctx.input.messageId,
        enabled: ctx.input.enabled,
        text: ctx.input.text
      });
    }

    return {
      output: { smsId: result.smsId },
      message: `${ctx.input.action === 'update' ? 'Updated' : 'Created'} SMS template **${ctx.input.messageId}** for widget **#${ctx.input.widgetId}**.`
    };
  })
  .build();

export let resetSmsTemplate = SlateTool.create(spec, {
  name: 'Reset SMS Template',
  key: 'reset_sms_template',
  description: `Reset SMS templates for a widget back to defaults. Optionally reset only a specific template type, or all templates if no type is specified.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      widgetId: z.number().describe('The widget ID'),
      messageId: smsMessageIdEnum
        .optional()
        .describe('Specific template type to reset (omit to reset all)')
    })
  )
  .output(
    z.object({
      widgetId: z.number().describe('The widget ID that was reset')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CallPageClient({ token: ctx.auth.token });

    await client.resetSmsMessage(ctx.input.widgetId, ctx.input.messageId);

    return {
      output: { widgetId: ctx.input.widgetId },
      message: `Reset ${ctx.input.messageId ? `SMS template **${ctx.input.messageId}**` : 'all SMS templates'} for widget **#${ctx.input.widgetId}**.`
    };
  })
  .build();
