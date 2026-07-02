import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let ruleActionSchema = z.object({
  group: z.string().describe('Action group (e.g., "default", "recovered")'),
  connectorId: z.string().describe('ID of the connector to use'),
  actionParams: z.record(z.string(), z.any()).describe('Parameters for the connector action'),
  frequency: z
    .object({
      summary: z.boolean().describe('Whether to send a summary'),
      notifyWhen: z
        .string()
        .describe(
          'When to notify: "onActionGroupChange", "onActiveAlert", "onThrottleInterval"'
        ),
      throttle: z.string().optional().describe('Throttle interval (e.g., "5m", "1h")')
    })
    .optional()
    .describe('Action frequency configuration')
});

let ruleOutputSchema = z.object({
  ruleId: z.string().describe('Unique ID of the rule'),
  name: z.string().describe('Name of the rule'),
  ruleTypeId: z.string().describe('Type of the rule'),
  consumer: z.string().describe('Application that owns the rule'),
  enabled: z.boolean().describe('Whether the rule is enabled'),
  tags: z.array(z.string()).describe('Tags assigned to the rule'),
  schedule: z
    .object({
      interval: z.string().describe('Check interval')
    })
    .describe('Rule check schedule'),
  ruleParams: z.record(z.string(), z.any()).optional().describe('Rule-specific parameters'),
  actions: z.array(z.any()).optional().describe('Configured actions'),
  updatedAt: z.string().optional().describe('Last update timestamp'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  deleted: z.boolean().optional().describe('Whether the rule was deleted')
});

let mapRule = (r: any) => ({
  ruleId: r.id,
  name: r.name,
  ruleTypeId: r.rule_type_id,
  consumer: r.consumer,
  enabled: r.enabled,
  tags: r.tags ?? [],
  schedule: r.schedule,
  ruleParams: r.params,
  actions: r.actions,
  updatedAt: r.updated_at,
  createdAt: r.created_at
});

export let manageRule = SlateTool.create(spec, {
  name: 'Manage Alerting Rule',
  key: 'manage_rule',
  description: `Create, get, update, delete, enable, disable, or mute/unmute a Kibana alerting rule.
Rules monitor conditions and trigger actions via connectors when thresholds are met.
Supports Elasticsearch query, index threshold, metric threshold, log threshold, and more.`,
  instructions: [
    'To create a rule, provide name, ruleTypeId, consumer, schedule, and ruleParams.',
    'Use "enable" / "disable" actions to toggle rule execution.',
    'Use "mute" / "unmute" to suppress or restore alert notifications.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['get', 'create', 'update', 'delete', 'enable', 'disable', 'mute', 'unmute'])
        .describe('Action to perform on the rule'),
      ruleId: z
        .string()
        .optional()
        .describe('ID of the rule (required for all actions except create)'),
      name: z.string().optional().describe('Name of the rule (required for create)'),
      ruleTypeId: z
        .string()
        .optional()
        .describe(
          'Rule type ID (e.g., ".index-threshold", ".es-query"). Required for create.'
        ),
      consumer: z
        .string()
        .optional()
        .describe(
          'Consumer application (e.g., "alerts", "infrastructure", "siem"). Required for create.'
        ),
      schedule: z
        .object({
          interval: z.string().describe('Check interval (e.g., "1m", "5m", "1h")')
        })
        .optional()
        .describe('Rule check schedule (required for create)'),
      ruleParams: z
        .record(z.string(), z.any())
        .optional()
        .describe('Rule-specific parameters (required for create)'),
      actions: z
        .array(ruleActionSchema)
        .optional()
        .describe('Actions to execute when rule fires'),
      tags: z.array(z.string()).optional().describe('Tags for the rule'),
      enabled: z
        .boolean()
        .optional()
        .describe('Whether the rule should be enabled on creation'),
      throttle: z.string().optional().describe('Global throttle interval (e.g., "5m", "1h")'),
      notifyWhen: z
        .string()
        .optional()
        .describe(
          'When to notify: "onActionGroupChange", "onActiveAlert", "onThrottleInterval"'
        )
    })
  )
  .output(ruleOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let {
      action,
      ruleId,
      name,
      ruleTypeId,
      consumer,
      schedule,
      ruleParams,
      actions,
      tags,
      enabled,
      throttle,
      notifyWhen
    } = ctx.input;

    let mappedActions = actions?.map(a => ({
      group: a.group,
      id: a.connectorId,
      params: a.actionParams,
      frequency: a.frequency
        ? {
            summary: a.frequency.summary,
            notify_when: a.frequency.notifyWhen,
            throttle: a.frequency.throttle ?? null
          }
        : undefined
    }));

    if (action === 'get') {
      if (!ruleId) throw new Error('ruleId is required for get action');
      let rule = await client.getRule(ruleId);
      return {
        output: mapRule(rule),
        message: `Retrieved rule \`${rule.name}\`.`
      };
    }

    if (action === 'create') {
      if (!name) throw new Error('name is required for create action');
      if (!ruleTypeId) throw new Error('ruleTypeId is required for create action');
      if (!consumer) throw new Error('consumer is required for create action');
      if (!schedule) throw new Error('schedule is required for create action');
      if (!ruleParams) throw new Error('ruleParams is required for create action');

      let rule = await client.createRule({
        name,
        ruleTypeId,
        consumer,
        schedule,
        params: ruleParams,
        actions: mappedActions,
        tags,
        enabled,
        throttle: throttle ?? null,
        notify_when: notifyWhen
      });
      return {
        output: mapRule(rule),
        message: `Created rule \`${rule.name}\` with ID \`${rule.id}\`.`
      };
    }

    if (action === 'update') {
      if (!ruleId) throw new Error('ruleId is required for update action');
      let rule = await client.updateRule(ruleId, {
        name,
        schedule,
        params: ruleParams,
        actions: mappedActions,
        tags,
        throttle: throttle ?? null,
        notify_when: notifyWhen
      });
      return {
        output: mapRule(rule),
        message: `Updated rule \`${ruleId}\`.`
      };
    }

    if (action === 'delete') {
      if (!ruleId) throw new Error('ruleId is required for delete action');
      await client.deleteRule(ruleId);
      return {
        output: {
          ruleId,
          name: '',
          ruleTypeId: '',
          consumer: '',
          enabled: false,
          tags: [],
          schedule: { interval: '' },
          deleted: true
        },
        message: `Deleted rule \`${ruleId}\`.`
      };
    }

    if (action === 'enable') {
      if (!ruleId) throw new Error('ruleId is required for enable action');
      await client.enableRule(ruleId);
      let rule = await client.getRule(ruleId);
      return {
        output: mapRule(rule),
        message: `Enabled rule \`${rule.name}\`.`
      };
    }

    if (action === 'disable') {
      if (!ruleId) throw new Error('ruleId is required for disable action');
      await client.disableRule(ruleId);
      let rule = await client.getRule(ruleId);
      return {
        output: mapRule(rule),
        message: `Disabled rule \`${rule.name}\`.`
      };
    }

    if (action === 'mute') {
      if (!ruleId) throw new Error('ruleId is required for mute action');
      await client.muteAllAlerts(ruleId);
      let rule = await client.getRule(ruleId);
      return {
        output: mapRule(rule),
        message: `Muted all alerts for rule \`${rule.name}\`.`
      };
    }

    if (action === 'unmute') {
      if (!ruleId) throw new Error('ruleId is required for unmute action');
      await client.unmuteAllAlerts(ruleId);
      let rule = await client.getRule(ruleId);
      return {
        output: mapRule(rule),
        message: `Unmuted all alerts for rule \`${rule.name}\`.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
