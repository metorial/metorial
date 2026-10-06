import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, type Rule } from '../lib/client';
import { spec } from '../spec';

export let manageNotificationRules = SlateTool.create(spec, {
  name: 'Manage Notification Rules',
  key: 'manage_notification_rules',
  description: `Create, list, update, or delete notification rules for a Rollbar project. Supports Webhook, Slack, PagerDuty, and Email channels.
Each rule defines which events trigger a notification, with optional filters and custom configuration.`,
  instructions: [
    'Use action "list" with a channel to see all rules for that channel.',
    'Use action "create" with channel and ruleConfig to create a new rule.',
    'Use action "update" with channel, ruleId, and ruleConfig to update an existing rule.',
    'Use action "delete" with channel and ruleId to delete a rule.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      projectId: z
        .number()
        .optional()
        .describe('Project ID from manage_project; required with an account token.'),
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Operation to perform'),
      channel: z
        .enum(['webhook', 'slack', 'pagerduty', 'email'])
        .describe('Notification channel'),
      ruleId: z
        .number()
        .optional()
        .describe('Rule ID (required for "get", "update" and "delete" actions)'),
      ruleConfig: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Rule configuration object (required for "create" and "update"). Structure varies by channel — typically includes trigger, filters, and channel-specific config.'
        )
    })
  )
  .output(
    z.object({
      rule: z
        .object({
          ruleId: z.number().describe('Rule ID'),
          trigger: z.string().optional().describe('Event trigger type'),
          enabled: z.boolean().optional().describe('Whether the rule is enabled'),
          config: z.any().optional().describe('Full rule configuration')
        })
        .optional()
        .describe('Single rule (for create/update)'),
      rules: z
        .array(
          z.object({
            ruleId: z.number().describe('Rule ID'),
            trigger: z.string().optional().describe('Event trigger type'),
            enabled: z.boolean().optional().describe('Whether the rule is enabled'),
            config: z.any().optional().describe('Full rule configuration')
          })
        )
        .optional()
        .describe('List of rules (for list action)'),
      deleted: z.boolean().optional().describe('Whether the rule was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let mapRule = (r: Rule) => ({
      ruleId: r.id,
      trigger: r.trigger,
      enabled: r.status === undefined ? r.enabled : r.status === 'enabled',
      config: r
    });

    if (ctx.input.action === 'list') {
      let result = await client.listNotificationRules(ctx.input.channel);
      let rules = (result?.result || []).map(mapRule);
      return {
        output: { rules },
        message: `Found **${rules.length}** ${ctx.input.channel} notification rules.`
      };
    }

    if (ctx.input.action === 'get') {
      if (ctx.input.ruleId === undefined)
        throw createApiServiceError('ruleId is required for "get".');
      const rule = mapRule(
        (await client.getNotificationRule(ctx.input.channel, ctx.input.ruleId)).result
      );
      return { output: { rule }, message: `Retrieved notification rule ${rule.ruleId}.` };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.ruleConfig)
        throw createApiServiceError('ruleConfig is required for "create" action');
      let result = await client.createNotificationRule(
        ctx.input.channel,
        ctx.input.ruleConfig
      );
      let rule = mapRule(result?.result);
      return {
        output: { rule },
        message: `Created ${ctx.input.channel} notification rule **${rule.ruleId}**${rule.trigger ? ` for trigger "${rule.trigger}"` : ''}.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.ruleId)
        throw createApiServiceError('ruleId is required for "update" action');
      if (!ctx.input.ruleConfig)
        throw createApiServiceError('ruleConfig is required for "update" action');
      let result = await client.updateNotificationRule(
        ctx.input.channel,
        ctx.input.ruleId,
        ctx.input.ruleConfig
      );
      let rule = mapRule(result?.result);
      return {
        output: { rule },
        message: `Updated ${ctx.input.channel} notification rule **${rule.ruleId}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.ruleId)
        throw createApiServiceError('ruleId is required for "delete" action');
      await client.deleteNotificationRule(ctx.input.channel, ctx.input.ruleId);
      return {
        output: { deleted: true },
        message: `Deleted ${ctx.input.channel} notification rule **${ctx.input.ruleId}**.`
      };
    }

    throw createApiServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
