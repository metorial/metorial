import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageAlertRuleTool = SlateTool.create(spec, {
  name: 'Manage Alert Rule',
  key: 'manage_alert_rule',
  description: `List, create, update, or delete issue alert rules and metric alert rules. Issue alerts are per-project and trigger on specific error conditions. Metric alerts are organization-wide and trigger on aggregate thresholds.`,
  instructions: [
    'For issue alerts, projectSlug is required for all operations',
    'For metric alerts, projectSlug is not needed (they are org-level)',
    'Use ruleType "issue" for issue alert rules and "metric" for metric alert rules',
    "The ruleConfig object follows Sentry's alert rule format with conditions, actions, and filters"
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      ruleType: z.enum(['issue', 'metric']).describe('Type of alert rule'),
      projectSlug: z
        .string()
        .optional()
        .describe('Project slug (required for issue alert rules)'),
      ruleId: z.string().optional().describe('Alert rule ID (required for get/update/delete)'),
      ruleConfig: z
        .record(z.string(), z.any())
        .optional()
        .describe('Alert rule configuration object (required for create/update)')
    })
  )
  .output(
    z.object({
      rule: z.any().optional().describe('Alert rule data'),
      rules: z.array(z.any()).optional().describe('List of alert rules'),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.ruleType === 'issue') {
      if (!ctx.input.projectSlug)
        throw new Error('projectSlug is required for issue alert rules');

      if (ctx.input.action === 'list') {
        let rules = await client.listIssueAlertRules(ctx.input.projectSlug);
        return {
          output: { rules },
          message: `Found **${(rules || []).length}** issue alert rules for project ${ctx.input.projectSlug}.`
        };
      }

      if (ctx.input.action === 'get') {
        if (!ctx.input.ruleId) throw new Error('ruleId is required');
        let rule = await client.getIssueAlertRule(ctx.input.projectSlug, ctx.input.ruleId);
        return {
          output: { rule },
          message: `Retrieved issue alert rule **${rule.name || ctx.input.ruleId}**.`
        };
      }

      if (ctx.input.action === 'create') {
        if (!ctx.input.ruleConfig) throw new Error('ruleConfig is required');
        let rule = await client.createIssueAlertRule(
          ctx.input.projectSlug,
          ctx.input.ruleConfig
        );
        return {
          output: { rule },
          message: `Created issue alert rule **${rule.name}** for project ${ctx.input.projectSlug}.`
        };
      }

      if (ctx.input.action === 'update') {
        if (!ctx.input.ruleId) throw new Error('ruleId is required');
        if (!ctx.input.ruleConfig) throw new Error('ruleConfig is required');
        let rule = await client.updateIssueAlertRule(
          ctx.input.projectSlug,
          ctx.input.ruleId,
          ctx.input.ruleConfig
        );
        return {
          output: { rule },
          message: `Updated issue alert rule **${rule.name || ctx.input.ruleId}**.`
        };
      }

      if (ctx.input.action === 'delete') {
        if (!ctx.input.ruleId) throw new Error('ruleId is required');
        await client.deleteIssueAlertRule(ctx.input.projectSlug, ctx.input.ruleId);
        return {
          output: { deleted: true },
          message: `Deleted issue alert rule **${ctx.input.ruleId}** from project ${ctx.input.projectSlug}.`
        };
      }
    }

    if (ctx.input.ruleType === 'metric') {
      if (ctx.input.action === 'list') {
        let rules = await client.listMetricAlertRules();
        return {
          output: { rules },
          message: `Found **${(rules || []).length}** metric alert rules.`
        };
      }

      if (ctx.input.action === 'get') {
        if (!ctx.input.ruleId) throw new Error('ruleId is required');
        let rule = await client.getMetricAlertRule(ctx.input.ruleId);
        return {
          output: { rule },
          message: `Retrieved metric alert rule **${rule.name || ctx.input.ruleId}**.`
        };
      }

      if (ctx.input.action === 'create') {
        if (!ctx.input.ruleConfig) throw new Error('ruleConfig is required');
        let rule = await client.createMetricAlertRule(ctx.input.ruleConfig);
        return {
          output: { rule },
          message: `Created metric alert rule **${rule.name}**.`
        };
      }

      if (ctx.input.action === 'update') {
        if (!ctx.input.ruleId) throw new Error('ruleId is required');
        if (!ctx.input.ruleConfig) throw new Error('ruleConfig is required');
        let rule = await client.updateMetricAlertRule(ctx.input.ruleId, ctx.input.ruleConfig);
        return {
          output: { rule },
          message: `Updated metric alert rule **${rule.name || ctx.input.ruleId}**.`
        };
      }

      if (ctx.input.action === 'delete') {
        if (!ctx.input.ruleId) throw new Error('ruleId is required');
        await client.deleteMetricAlertRule(ctx.input.ruleId);
        return {
          output: { deleted: true },
          message: `Deleted metric alert rule **${ctx.input.ruleId}**.`
        };
      }
    }

    throw new Error(
      `Unknown action/ruleType combination: ${ctx.input.action}/${ctx.input.ruleType}`
    );
  })
  .build();
