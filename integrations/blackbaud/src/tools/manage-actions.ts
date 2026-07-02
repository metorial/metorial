import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listActions = SlateTool.create(spec, {
  name: 'List Actions',
  key: 'list_actions',
  description: `List actions (interactions and tasks) with optional filtering by constituent, date, or list. Actions track interactions required to secure gifts and cultivate relationships.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      constituentId: z.string().optional().describe('Filter by constituent system record ID.'),
      dateAdded: z
        .string()
        .optional()
        .describe('Filter actions created on or after this date (ISO 8601).'),
      lastModified: z
        .string()
        .optional()
        .describe('Filter actions modified on or after this date (ISO 8601).'),
      listId: z.string().optional().describe('Filter by list ID.'),
      sort: z.string().optional().describe('Sort fields (comma-separated).'),
      limit: z
        .number()
        .optional()
        .describe('Number of records to return (default 500, max 5000).'),
      offset: z.number().optional().describe('Number of records to skip for pagination.')
    })
  )
  .output(
    z.object({
      count: z.number().describe('Total number of matching actions.'),
      actions: z.array(z.any()).describe('Array of action records.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subscriptionKey: ctx.auth.subscriptionKey
    });

    let result = await client.listActions({
      constituentId: ctx.input.constituentId,
      dateAdded: ctx.input.dateAdded,
      lastModified: ctx.input.lastModified,
      listId: ctx.input.listId,
      sort: ctx.input.sort,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let actions = result?.value || [];
    let count = result?.count || 0;

    return {
      output: { count, actions },
      message: `Retrieved **${actions.length}** of ${count} action(s).`
    };
  })
  .build();

export let createAction = SlateTool.create(spec, {
  name: 'Create Action',
  key: 'create_action',
  description: `Create a new action (interaction or task) for a constituent. Actions track meetings, calls, emails, and other interactions required to cultivate relationships and secure gifts.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      constituentId: z.string().describe('System record ID of the constituent.'),
      category: z
        .string()
        .describe(
          'Action category (e.g., "Phone Call", "Meeting", "Email", "Task", "Letter").'
        ),
      date: z.string().describe('Action date (YYYY-MM-DD).'),
      type: z.string().optional().describe('Action type.'),
      summary: z.string().optional().describe('Brief summary of the action.'),
      description: z.string().optional().describe('Detailed description of the action.'),
      status: z
        .string()
        .optional()
        .describe('Action status (e.g., "Completed", "Open", "Pending").'),
      priority: z.string().optional().describe('Priority level.'),
      direction: z.string().optional().describe('Direction (e.g., "Inbound", "Outbound").'),
      outcome: z.string().optional().describe('Outcome of the action.'),
      startTime: z.string().optional().describe('Start time of the action.'),
      endTime: z.string().optional().describe('End time of the action.'),
      location: z.string().optional().describe('Location of the action.'),
      fundraiserIds: z
        .array(z.string())
        .optional()
        .describe('IDs of fundraisers associated with this action.')
    })
  )
  .output(
    z.object({
      actionId: z.string().describe('System record ID of the newly created action.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subscriptionKey: ctx.auth.subscriptionKey
    });

    let actionData: Record<string, any> = {
      constituent_id: ctx.input.constituentId,
      category: ctx.input.category,
      date: ctx.input.date
    };

    if (ctx.input.type) actionData.type = ctx.input.type;
    if (ctx.input.summary) actionData.summary = ctx.input.summary;
    if (ctx.input.description) actionData.description = ctx.input.description;
    if (ctx.input.status) actionData.status = ctx.input.status;
    if (ctx.input.priority) actionData.priority = ctx.input.priority;
    if (ctx.input.direction) actionData.direction = ctx.input.direction;
    if (ctx.input.outcome) actionData.outcome = ctx.input.outcome;
    if (ctx.input.startTime) actionData.start_time = ctx.input.startTime;
    if (ctx.input.endTime) actionData.end_time = ctx.input.endTime;
    if (ctx.input.location) actionData.location = ctx.input.location;
    if (ctx.input.fundraiserIds?.length) {
      actionData.fundraisers = ctx.input.fundraiserIds.map(id => ({ fundraiser_id: id }));
    }

    let result = await client.createAction(actionData);
    let actionId = String(result?.id || result);

    return {
      output: { actionId },
      message: `Created **${ctx.input.category}** action for constituent ${ctx.input.constituentId}. Action ID: ${actionId}.`
    };
  })
  .build();

export let updateAction = SlateTool.create(spec, {
  name: 'Update Action',
  key: 'update_action',
  description: `Update an existing action. Only provided fields are updated; omitted fields remain unchanged.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      actionId: z.string().describe('System record ID of the action to update.'),
      category: z.string().optional().describe('Updated category.'),
      date: z.string().optional().describe('Updated date (YYYY-MM-DD).'),
      type: z.string().optional().describe('Updated type.'),
      summary: z.string().optional().describe('Updated summary.'),
      description: z.string().optional().describe('Updated description.'),
      status: z.string().optional().describe('Updated status.'),
      priority: z.string().optional().describe('Updated priority.'),
      direction: z.string().optional().describe('Updated direction.'),
      outcome: z.string().optional().describe('Updated outcome.'),
      completedDate: z.string().optional().describe('Completed date (YYYY-MM-DD).'),
      location: z.string().optional().describe('Updated location.')
    })
  )
  .output(
    z.object({
      actionId: z.string().describe('System record ID of the updated action.'),
      updated: z.boolean().describe('Whether the action was updated.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subscriptionKey: ctx.auth.subscriptionKey
    });

    let updateData: Record<string, any> = {};
    if (ctx.input.category) updateData.category = ctx.input.category;
    if (ctx.input.date) updateData.date = ctx.input.date;
    if (ctx.input.type) updateData.type = ctx.input.type;
    if (ctx.input.summary) updateData.summary = ctx.input.summary;
    if (ctx.input.description) updateData.description = ctx.input.description;
    if (ctx.input.status) updateData.status = ctx.input.status;
    if (ctx.input.priority) updateData.priority = ctx.input.priority;
    if (ctx.input.direction) updateData.direction = ctx.input.direction;
    if (ctx.input.outcome) updateData.outcome = ctx.input.outcome;
    if (ctx.input.completedDate) updateData.completed_date = ctx.input.completedDate;
    if (ctx.input.location) updateData.location = ctx.input.location;

    await client.updateAction(ctx.input.actionId, updateData);

    return {
      output: {
        actionId: ctx.input.actionId,
        updated: true
      },
      message: `Updated action **${ctx.input.actionId}**.`
    };
  })
  .build();
