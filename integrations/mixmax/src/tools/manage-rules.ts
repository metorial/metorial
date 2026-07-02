import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let ruleSchema = z.object({
  ruleId: z.string().describe('Rule ID'),
  name: z.string().optional().describe('Rule name'),
  enabled: z.boolean().optional().describe('Whether the rule is active'),
  trigger: z.any().optional().describe('Rule trigger configuration'),
  filter: z.any().optional().describe('Rule filter (Sift DSL)'),
  actions: z.array(z.any()).optional().describe('Rule actions'),
  createdAt: z.string().optional().describe('When the rule was created'),
  updatedAt: z.string().optional().describe('When the rule was last updated')
});

export let listRules = SlateTool.create(spec, {
  name: 'List Rules',
  key: 'list_rules',
  description: `List all webhook rules configured for your account. Rules intercept real-time events (email sent, opened, clicked, etc.) and route them to webhooks or trigger actions.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      rules: z.array(ruleSchema).describe('List of rules')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.listRules();
    let results = data.results || data || [];
    let rules = results.map((r: any) => ({
      ruleId: r._id,
      name: r.name,
      enabled: r.enabled,
      trigger: r.trigger,
      filter: r.filter,
      actions: r.actions,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    }));

    return {
      output: { rules },
      message: `Found ${rules.length} rule(s).`
    };
  })
  .build();

export let getRule = SlateTool.create(spec, {
  name: 'Get Rule',
  key: 'get_rule',
  description: `Retrieve a specific rule by its ID, including its trigger, filter, and actions configuration.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ruleId: z.string().describe('ID of the rule to retrieve')
    })
  )
  .output(ruleSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let r = await client.getRule(ctx.input.ruleId);

    return {
      output: {
        ruleId: r._id,
        name: r.name,
        enabled: r.enabled,
        trigger: r.trigger,
        filter: r.filter,
        actions: r.actions,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt
      },
      message: `Retrieved rule "${r.name}".`
    };
  })
  .build();

export let createRule = SlateTool.create(spec, {
  name: 'Create Rule',
  key: 'create_rule',
  description: `Create a new webhook rule. Rules consist of a trigger (event type), optional filter, and one or more actions. Use this to set up automated workflows triggered by Mixmax events like email opens, clicks, or meeting confirmations.`,
  instructions: [
    'The rule format is complex. Create a rule in the Mixmax Rules Dashboard first, then use List Rules to see the format, and replicate it here.',
    'Filters use the Sift DSL (MongoDB-like query syntax) serialized as JSON.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('Rule name'),
      trigger: z.any().describe('Rule trigger configuration'),
      filter: z.any().optional().describe('Filter condition using Sift DSL'),
      actions: z.array(z.any()).optional().describe('Actions to perform when triggered'),
      enabled: z.boolean().optional().describe('Whether the rule is active (default: true)')
    })
  )
  .output(ruleSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let rule: Record<string, any> = {
      trigger: ctx.input.trigger
    };
    if (ctx.input.name) rule.name = ctx.input.name;
    if (ctx.input.filter) rule.filter = ctx.input.filter;
    if (ctx.input.actions) rule.actions = ctx.input.actions;
    if (ctx.input.enabled !== undefined) rule.enabled = ctx.input.enabled;

    let r = await client.createRule(rule);

    return {
      output: {
        ruleId: r._id,
        name: r.name,
        enabled: r.enabled,
        trigger: r.trigger,
        filter: r.filter,
        actions: r.actions,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt
      },
      message: `Rule "${r.name || r._id}" created.`
    };
  })
  .build();

export let updateRule = SlateTool.create(spec, {
  name: 'Update Rule',
  key: 'update_rule',
  description: `Update an existing rule's trigger, filter, actions, or enabled status.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      ruleId: z.string().describe('ID of the rule to update'),
      name: z.string().optional().describe('New rule name'),
      trigger: z.any().optional().describe('New trigger configuration'),
      filter: z.any().optional().describe('New filter condition'),
      actions: z.array(z.any()).optional().describe('New actions'),
      enabled: z.boolean().optional().describe('Enable or disable the rule')
    })
  )
  .output(ruleSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let updates: Record<string, any> = {};
    if (ctx.input.name !== undefined) updates.name = ctx.input.name;
    if (ctx.input.trigger !== undefined) updates.trigger = ctx.input.trigger;
    if (ctx.input.filter !== undefined) updates.filter = ctx.input.filter;
    if (ctx.input.actions !== undefined) updates.actions = ctx.input.actions;
    if (ctx.input.enabled !== undefined) updates.enabled = ctx.input.enabled;

    let r = await client.updateRule(ctx.input.ruleId, updates);

    return {
      output: {
        ruleId: r._id,
        name: r.name,
        enabled: r.enabled,
        trigger: r.trigger,
        filter: r.filter,
        actions: r.actions,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt
      },
      message: `Rule ${ctx.input.ruleId} updated.`
    };
  })
  .build();

export let deleteRule = SlateTool.create(spec, {
  name: 'Delete Rule',
  key: 'delete_rule',
  description: `Permanently delete a webhook rule.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      ruleId: z.string().describe('ID of the rule to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the rule was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteRule(ctx.input.ruleId);

    return {
      output: { success: true },
      message: `Rule ${ctx.input.ruleId} deleted.`
    };
  })
  .build();
