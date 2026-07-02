import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let ruleSchema = z.object({
  id: z.string().describe('Rule ID'),
  name: z.string().describe('Rule name'),
  active: z.boolean().optional().describe('Whether the rule is active'),
  order: z.number().optional().describe('Rule execution order'),
  triggers: z.array(z.any()).optional().describe('Rule trigger conditions'),
  actions: z.array(z.any()).optional().describe('Rule actions to execute'),
  createdAt: z.string().optional().describe('When the rule was created'),
  updatedAt: z.string().optional().describe('When the rule was last updated')
});

let mapRule = (rule: any) => ({
  id: rule.id,
  name: rule.name,
  active: rule.active,
  order: rule.order,
  triggers: rule.triggers,
  actions: rule.actions,
  createdAt: rule.createdAt,
  updatedAt: rule.updatedAt
});

export let manageRules = SlateTool.create(spec, {
  name: 'Manage Rules',
  key: 'manage_rules',
  description: `Manage HelpDesk automation rules. Supports listing all rules, getting a specific rule by ID, creating new rules, updating existing rules, and deleting rules. Rules define automated triggers and actions for ticket processing.`,
  tags: { readOnly: false }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('The action to perform on rules'),
      ruleId: z
        .string()
        .optional()
        .describe('Rule ID (required for get, update, and delete actions)'),
      name: z
        .string()
        .optional()
        .describe('Rule name (required for create, optional for update)'),
      active: z
        .boolean()
        .optional()
        .describe('Whether the rule is active (for create or update)'),
      triggers: z
        .array(z.any())
        .optional()
        .describe('Array of trigger condition objects (for create or update)'),
      actions: z
        .array(z.any())
        .optional()
        .describe('Array of action objects to execute when triggered (for create or update)'),
      order: z
        .number()
        .optional()
        .describe('Execution order of the rule (for create or update)')
    })
  )
  .output(
    z.object({
      rule: ruleSchema.optional().describe('A single rule (for get, create, update actions)'),
      rules: z.array(ruleSchema).optional().describe('List of rules (for list action)'),
      success: z.boolean().optional().describe('Whether the delete action succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action } = ctx.input;

    if (action === 'list') {
      let rules = await client.listRules();
      let mapped = rules.map(mapRule);
      return {
        output: { rules: mapped },
        message: `Found **${mapped.length}** automation rules.`
      };
    }

    if (action === 'get') {
      if (!ctx.input.ruleId) {
        throw new Error('ruleId is required for the get action.');
      }
      let rule = await client.getRule(ctx.input.ruleId);
      return {
        output: { rule: mapRule(rule) },
        message: `Retrieved rule **${rule.name}**.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.name) {
        throw new Error('name is required for the create action.');
      }
      let rule = await client.createRule({
        name: ctx.input.name,
        active: ctx.input.active,
        triggers: ctx.input.triggers,
        actions: ctx.input.actions,
        order: ctx.input.order
      });
      return {
        output: { rule: mapRule(rule) },
        message: `Created rule **${rule.name}**.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.ruleId) {
        throw new Error('ruleId is required for the update action.');
      }
      let input: Record<string, any> = {};
      if (ctx.input.name !== undefined) input.name = ctx.input.name;
      if (ctx.input.active !== undefined) input.active = ctx.input.active;
      if (ctx.input.triggers !== undefined) input.triggers = ctx.input.triggers;
      if (ctx.input.actions !== undefined) input.actions = ctx.input.actions;
      if (ctx.input.order !== undefined) input.order = ctx.input.order;

      let rule = await client.updateRule(ctx.input.ruleId, input);
      return {
        output: { rule: mapRule(rule) },
        message: `Updated rule **${rule.name}**.`
      };
    }

    // delete
    if (!ctx.input.ruleId) {
      throw new Error('ruleId is required for the delete action.');
    }
    await client.deleteRule(ctx.input.ruleId);
    return {
      output: { success: true },
      message: `Deleted rule **${ctx.input.ruleId}**.`
    };
  })
  .build();
