import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listRules = SlateTool.create(spec, {
  name: 'List Rules',
  key: 'list_rules',
  description: `Retrieve a paginated list of automation rules. Rules trigger actions based on ticket events and conditions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: z.string().optional().describe('Pagination cursor'),
      limit: z.number().optional().describe('Number of rules to return')
    })
  )
  .output(
    z.object({
      rules: z.array(
        z.object({
          ruleId: z.number().describe('Rule ID'),
          name: z.string().describe('Rule name'),
          description: z.string().nullable().describe('Rule description'),
          enabled: z.boolean().describe('Whether the rule is enabled'),
          priority: z.number().nullable().describe('Execution priority'),
          createdDatetime: z.string().nullable().describe('When the rule was created')
        })
      ),
      nextCursor: z.string().nullable().describe('Cursor for the next page'),
      prevCursor: z.string().nullable().describe('Cursor for the previous page')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let result = await client.listRules({
      cursor: ctx.input.cursor,
      limit: ctx.input.limit
    });

    let rules = result.data.map((r: any) => ({
      ruleId: r.id,
      name: r.name,
      description: r.description || null,
      enabled: r.enabled ?? true,
      priority: r.priority ?? null,
      createdDatetime: r.created_datetime || null
    }));

    return {
      output: {
        rules,
        nextCursor: result.meta.next_cursor,
        prevCursor: result.meta.prev_cursor
      },
      message: `Found **${rules.length}** rule(s).`
    };
  })
  .build();

export let createRule = SlateTool.create(spec, {
  name: 'Create Rule',
  key: 'create_rule',
  description: `Create a new automation rule with events, conditions, and actions. Rules automate ticket handling based on configurable triggers.`
})
  .input(
    z.object({
      name: z.string().describe('Rule name'),
      description: z.string().optional().describe('Rule description'),
      events: z
        .array(
          z.object({
            type: z.string().describe('Event type that triggers the rule')
          })
        )
        .optional()
        .describe('Trigger events'),
      conditions: z
        .any()
        .optional()
        .describe('Conditions that must be met for the rule to fire'),
      actions: z
        .array(
          z.object({
            type: z.string().describe('Action type to execute'),
            args: z.any().optional().describe('Action arguments')
          })
        )
        .optional()
        .describe('Actions to perform'),
      enabled: z.boolean().default(true).describe('Whether the rule is enabled'),
      priority: z.number().optional().describe('Execution priority (lower = higher priority)')
    })
  )
  .output(
    z.object({
      ruleId: z.number().describe('ID of the created rule'),
      name: z.string().describe('Rule name'),
      enabled: z.boolean().describe('Whether the rule is enabled')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let rule = await client.createRule({
      name: ctx.input.name,
      description: ctx.input.description,
      events: ctx.input.events,
      conditions: ctx.input.conditions,
      actions: ctx.input.actions,
      enabled: ctx.input.enabled,
      priority: ctx.input.priority
    });

    return {
      output: {
        ruleId: rule.id,
        name: rule.name,
        enabled: rule.enabled ?? true
      },
      message: `Created rule **"${rule.name}"** (ID: ${rule.id}, ${rule.enabled ? 'enabled' : 'disabled'}).`
    };
  })
  .build();

export let updateRule = SlateTool.create(spec, {
  name: 'Update Rule',
  key: 'update_rule',
  description: `Update an existing automation rule. Can change name, conditions, actions, priority, or enable/disable the rule.`
})
  .input(
    z.object({
      ruleId: z.number().describe('ID of the rule to update'),
      name: z.string().optional().describe('New rule name'),
      description: z.string().optional().describe('New description'),
      events: z
        .array(
          z.object({
            type: z.string().describe('Event type')
          })
        )
        .optional()
        .describe('Updated trigger events'),
      conditions: z.any().optional().describe('Updated conditions'),
      actions: z
        .array(
          z.object({
            type: z.string().describe('Action type'),
            args: z.any().optional().describe('Action arguments')
          })
        )
        .optional()
        .describe('Updated actions'),
      enabled: z.boolean().optional().describe('Enable or disable the rule'),
      priority: z.number().optional().describe('New execution priority')
    })
  )
  .output(
    z.object({
      ruleId: z.number().describe('Rule ID'),
      name: z.string().describe('Updated rule name'),
      enabled: z.boolean().describe('Whether the rule is enabled')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let data: any = {};
    if (ctx.input.name !== undefined) data.name = ctx.input.name;
    if (ctx.input.description !== undefined) data.description = ctx.input.description;
    if (ctx.input.events !== undefined) data.events = ctx.input.events;
    if (ctx.input.conditions !== undefined) data.conditions = ctx.input.conditions;
    if (ctx.input.actions !== undefined) data.actions = ctx.input.actions;
    if (ctx.input.enabled !== undefined) data.enabled = ctx.input.enabled;
    if (ctx.input.priority !== undefined) data.priority = ctx.input.priority;

    let rule = await client.updateRule(ctx.input.ruleId, data);

    return {
      output: {
        ruleId: rule.id,
        name: rule.name,
        enabled: rule.enabled ?? true
      },
      message: `Updated rule **"${rule.name}"** (ID: ${rule.id}, ${rule.enabled ? 'enabled' : 'disabled'}).`
    };
  })
  .build();

export let deleteRule = SlateTool.create(spec, {
  name: 'Delete Rule',
  key: 'delete_rule',
  description: `Permanently delete an automation rule.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      ruleId: z.number().describe('ID of the rule to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the rule was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    await client.deleteRule(ctx.input.ruleId);

    return {
      output: { deleted: true },
      message: `Deleted rule **#${ctx.input.ruleId}**.`
    };
  })
  .build();
