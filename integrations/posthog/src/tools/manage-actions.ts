import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let actionOutput = z.object({
  actionId: z.string().describe('Action ID'),
  name: z.string().optional().describe('Action name'),
  description: z.string().optional().describe('Action description'),
  tags: z.array(z.string()).optional().describe('Action tags'),
  steps: z.array(z.record(z.string(), z.any())).optional().describe('Action step rules'),
  deleted: z.boolean().optional().describe('Whether the action is deleted'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  createdBy: z.string().optional().describe('Creator user ID or email')
});

let mapAction = (action: any) => ({
  actionId: String(action.id),
  name: action.name ?? undefined,
  description: action.description,
  tags: Array.isArray(action.tags)
    ? action.tags.filter((tag: unknown): tag is string => typeof tag === 'string')
    : undefined,
  steps: action.steps,
  deleted: action.deleted,
  createdAt: action.created_at,
  createdBy: action.created_by ? String(action.created_by.id || action.created_by) : undefined
});

export let listActionsTool = SlateTool.create(spec, {
  name: 'List Actions',
  key: 'list_actions',
  description: `List PostHog actions. Actions group one or more event patterns into reusable analytics definitions.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search by action name'),
      limit: z.number().optional().describe('Maximum number of results'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      actions: z.array(actionOutput),
      totalCount: z.number().optional().describe('Total count of matching actions'),
      hasMore: z.boolean().describe('Whether there are more results')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let data = await client.listActions({
      search: ctx.input.search,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let actions = (data.results || []).map(mapAction);

    return {
      output: {
        actions,
        totalCount: data.count,
        hasMore: !!data.next
      },
      message: `Found **${actions.length}** action(s).`
    };
  })
  .build();

export let getActionTool = SlateTool.create(spec, {
  name: 'Get Action',
  key: 'get_action',
  description: `Retrieve a specific PostHog action by ID, including its step rules.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      actionId: z.string().describe('Action ID')
    })
  )
  .output(actionOutput)
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let action = await client.getAction(ctx.input.actionId);

    return {
      output: mapAction(action),
      message: `Retrieved action **${action.name || action.id}**.`
    };
  })
  .build();

export let createActionTool = SlateTool.create(spec, {
  name: 'Create Action',
  key: 'create_action',
  description: `Create a PostHog action from event, selector, URL, or property matching steps.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      name: z.string().describe('Action name'),
      description: z.string().optional().describe('Action description'),
      tags: z.array(z.string()).optional().describe('Action tags'),
      steps: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('PostHog action step objects, such as event and property matchers')
    })
  )
  .output(actionOutput)
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let payload: Record<string, any> = { name: ctx.input.name };
    if (ctx.input.description !== undefined) payload.description = ctx.input.description;
    if (ctx.input.tags !== undefined) payload.tags = ctx.input.tags;
    if (ctx.input.steps !== undefined) payload.steps = ctx.input.steps;

    let action = await client.createAction(payload);

    return {
      output: mapAction(action),
      message: `Created action **${action.name || action.id}** (ID: ${action.id}).`
    };
  })
  .build();

export let updateActionTool = SlateTool.create(spec, {
  name: 'Update Action',
  key: 'update_action',
  description: `Update a PostHog action's metadata, tags, deletion state, or step rules.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      actionId: z.string().describe('Action ID to update'),
      name: z.string().optional().describe('Updated action name'),
      description: z.string().optional().describe('Updated action description'),
      tags: z.array(z.string()).optional().describe('Updated tags'),
      steps: z.array(z.record(z.string(), z.any())).optional().describe('Updated step rules'),
      deleted: z.boolean().optional().describe('Soft-delete or restore the action')
    })
  )
  .output(actionOutput)
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let payload: Record<string, any> = {};
    if (ctx.input.name !== undefined) payload.name = ctx.input.name;
    if (ctx.input.description !== undefined) payload.description = ctx.input.description;
    if (ctx.input.tags !== undefined) payload.tags = ctx.input.tags;
    if (ctx.input.steps !== undefined) payload.steps = ctx.input.steps;
    if (ctx.input.deleted !== undefined) payload.deleted = ctx.input.deleted;

    let action = await client.updateAction(ctx.input.actionId, payload);

    return {
      output: mapAction(action),
      message: `Updated action **${action.name || action.id}**.`
    };
  })
  .build();

export let deleteActionTool = SlateTool.create(spec, {
  name: 'Delete Action',
  key: 'delete_action',
  description: `Delete a PostHog action.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      actionId: z.string().describe('Action ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the action was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    await client.deleteAction(ctx.input.actionId);

    return {
      output: { deleted: true },
      message: `Deleted action **${ctx.input.actionId}**.`
    };
  })
  .build();
