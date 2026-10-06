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
  description: `List a page of webhook rules configured for your account. Rules intercept real-time events (email sent, opened, clicked, etc.) and route them to webhooks or trigger actions. Use nextCursor while hasNext is true to read more results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum results in one page, from 1 to 300.'),
      cursor: z.string().optional().describe('Cursor returned as nextCursor on a prior page.')
    })
  )
  .output(
    z.object({
      rules: z.array(ruleSchema).describe('List of rules'),
      nextCursor: z.string().optional().describe('Provider cursor for the next page'),
      hasNext: z.boolean().optional().describe('Whether another page currently exists')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.listRules({ limit: ctx.input.limit, next: ctx.input.cursor });
    let results = data.results;
    let rules = results.map(r => ({
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
      output: { rules, nextCursor: data.next, hasNext: data.hasNext },
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
  description: `Create a rule with an event or recurring trigger and an optional JSON Sift filter. Set enabled false to keep it paused. Inline actions are unsupported; configure actions separately in the Rules Dashboard.`,
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
      actions: z
        .array(z.any())
        .optional()
        .describe('Legacy field; inline rule actions are unsupported.'),
      enabled: z.boolean().optional().describe('Whether the rule is active (default: true)')
    })
  )
  .output(ruleSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let rule: Record<string, unknown> = {
      trigger: ctx.input.trigger
    };
    if (ctx.input.name !== undefined) rule.name = ctx.input.name;
    if (ctx.input.filter !== undefined) rule.filter = ctx.input.filter;
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
  description: `Update a rule's name, trigger, JSON Sift filter, or enabled status. Inline actions are unsupported; use the Rules Dashboard to manage them.`,
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
      actions: z
        .array(z.any())
        .optional()
        .describe('Legacy field; inline rule actions are unsupported.'),
      enabled: z.boolean().optional().describe('Enable or disable the rule')
    })
  )
  .output(ruleSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let updates: Record<string, unknown> = {};
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
