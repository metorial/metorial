import { SlateTool } from 'slates';
import { z } from 'zod';
import { RocketadminClient } from '../lib/client';
import { spec } from '../spec';

export let manageActionRules = SlateTool.create(spec, {
  name: 'Manage Action Rules',
  key: 'manage_action_rules',
  description: `List, create, update, or delete action rules for a table. Action rules define triggers and webhook-based actions that fire when table events occur (e.g., row created, updated, or deleted).`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Action to perform'),
      connectionId: z.string().describe('ID of the database connection'),
      tableName: z.string().optional().describe('Table name (required for list and create)'),
      ruleId: z.string().optional().describe('Rule ID (required for update, delete)'),
      ruleTitle: z.string().optional().describe('Title of the rule'),
      ruleEvent: z
        .string()
        .optional()
        .describe('Event type that triggers the rule (e.g., "created", "updated", "deleted")'),
      webhookUrl: z.string().optional().describe('Webhook URL to call when the rule triggers'),
      ruleData: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Additional rule configuration')
    })
  )
  .output(
    z.object({
      rules: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of action rules'),
      rule: z.record(z.string(), z.unknown()).optional().describe('Action rule details'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RocketadminClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let {
      action,
      connectionId,
      tableName,
      ruleId,
      ruleTitle,
      ruleEvent,
      webhookUrl,
      ruleData
    } = ctx.input;

    if (action === 'list') {
      if (!tableName) throw new Error('tableName is required for listing rules');
      let rules = await client.listActionRules(connectionId, tableName);
      return {
        output: { rules, success: true },
        message: `Found **${rules.length}** rule(s) for table **${tableName}**.`
      };
    }

    if (action === 'create') {
      if (!tableName) throw new Error('tableName is required for creating a rule');
      let rule = await client.createActionRule(connectionId, tableName, {
        ...(ruleTitle ? { title: ruleTitle } : {}),
        ...(ruleEvent ? { event: ruleEvent } : {}),
        ...(webhookUrl ? { webhookUrl } : {}),
        ...(ruleData || {})
      });
      return {
        output: { rule, success: true },
        message: `Action rule created for table **${tableName}**.`
      };
    }

    if (action === 'update') {
      if (!ruleId) throw new Error('ruleId is required for updating a rule');
      let rule = await client.updateActionRule(ruleId, {
        ...(ruleTitle ? { title: ruleTitle } : {}),
        ...(ruleEvent ? { event: ruleEvent } : {}),
        ...(webhookUrl ? { webhookUrl } : {}),
        ...(ruleData || {})
      });
      return {
        output: { rule, success: true },
        message: `Action rule **${ruleId}** updated.`
      };
    }

    if (action === 'delete') {
      if (!ruleId) throw new Error('ruleId is required for deleting a rule');
      await client.deleteActionRule(connectionId, ruleId);
      return {
        output: { success: true },
        message: `Action rule **${ruleId}** deleted.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
