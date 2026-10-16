import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createRocketadminClient } from '../lib/client';
import { spec } from '../spec';

const rulePayloadSchema = z
  .object({
    title: z.string().min(1).max(255),
    table_name: z.string().min(1).max(255),
    table_actions: z.array(
      z.object({ method: z.enum(['URL', 'EMAIL', 'SLACK', 'ZAPIER']) }).passthrough()
    ),
    events: z.array(
      z
        .object({
          event: z.enum(['ADD_ROW', 'UPDATE_ROW', 'DELETE_ROW', 'CUSTOM']),
          type: z.enum(['single', 'multiple']),
          title: z.string().min(1).max(255),
          require_confirmation: z.boolean()
        })
        .passthrough()
    )
  })
  .passthrough();

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
      masterPassword: z
        .string()
        .optional()
        .describe('Master password for an encrypted connection'),
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Action to perform'),
      connectionId: z
        .string()
        .describe(
          'Connection ID. Call list_connections to discover authorized connection IDs.'
        ),
      tableName: z.string().optional().describe('Table name (required for list and create)'),
      ruleId: z.string().optional().describe('Rule ID (required for update, delete)'),
      ruleTitle: z.string().optional().describe('Title of the rule'),
      ruleEvent: z
        .string()
        .optional()
        .describe(
          'Row event: created/updated/deleted or ADD_ROW/UPDATE_ROW/DELETE_ROW; custom events use CUSTOM'
        ),
      webhookUrl: z.string().optional().describe('Webhook URL to call when the rule triggers'),
      ruleData: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Provider rule configuration. Use table_actions and events arrays for full configuration; events require type, title, and require_confirmation.'
        )
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
    let client = createRocketadminClient(ctx.auth, ctx.config, ctx.input.masterPassword);

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
      if (!tableName) throw createApiServiceError('tableName is required for listing rules');
      let rules = await client.listActionRules(connectionId, tableName);
      return {
        output: { rules, success: true },
        message: `Found **${rules.length}** rule(s) for table **${tableName}**.`
      };
    }

    if (action === 'create' || action === 'update') {
      if (action === 'update' && !ruleId)
        throw createApiServiceError('ruleId is required for updating a rule.');
      let eventsByName: Record<string, string> = {
        created: 'ADD_ROW',
        updated: 'UPDATE_ROW',
        deleted: 'DELETE_ROW'
      };
      let event = ruleEvent === undefined ? undefined : (eventsByName[ruleEvent] ?? ruleEvent);
      let payload = {
        ...ruleData,
        ...(ruleTitle !== undefined ? { title: ruleTitle } : {}),
        ...(tableName !== undefined ? { table_name: tableName } : {}),
        ...(webhookUrl !== undefined
          ? { table_actions: [{ method: 'URL', url: webhookUrl }] }
          : {}),
        ...(event !== undefined
          ? {
              events: [{ event, type: 'single', title: ruleTitle, require_confirmation: true }]
            }
          : {})
      };
      let parsed = rulePayloadSchema.safeParse(payload);
      if (!parsed.success) {
        throw createApiServiceError(
          `Provide a complete action-rule configuration: ${parsed.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`
        );
      }
      let rule: Record<string, unknown>;
      if (action === 'create') {
        rule = await client.createActionRule(connectionId, parsed.data);
      } else {
        if (!ruleId) throw createApiServiceError('ruleId is required for updating a rule.');
        rule = await client.updateActionRule(connectionId, ruleId, parsed.data);
      }
      return {
        output: { rule, success: true },
        message: `Action rule ${action === 'create' ? 'created' : 'updated'}.`
      };
    }

    if (action === 'delete') {
      if (!ruleId) throw createApiServiceError('ruleId is required for deleting a rule');
      await client.deleteActionRule(connectionId, ruleId);
      return {
        output: { success: true },
        message: `Action rule **${ruleId}** deleted.`
      };
    }

    throw createApiServiceError(`Unknown action: ${action}`);
  })
  .build();
