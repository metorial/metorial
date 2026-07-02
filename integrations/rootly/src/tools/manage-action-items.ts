import { SlateTool } from 'slates';
import { z } from 'zod';
import {
  Client,
  flattenResource,
  flattenResources,
  type JsonApiResource
} from '../lib/client';
import { spec } from '../spec';

export let listActionItems = SlateTool.create(spec, {
  name: 'List Action Items',
  key: 'list_action_items',
  description: `List follow-up action items across all incidents. Filter by status to find open or completed items.
Action items track post-incident follow-up tasks.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search action items'),
      status: z.string().optional().describe('Filter by status (e.g., open, done)'),
      sort: z.string().optional().describe('Sort field'),
      pageNumber: z.number().optional().describe('Page number'),
      pageSize: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      actionItems: z.array(z.record(z.string(), z.any())).describe('List of action items'),
      totalCount: z.number().optional().describe('Total count')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listActionItems({
      search: ctx.input.search,
      status: ctx.input.status,
      sort: ctx.input.sort,
      pageNumber: ctx.input.pageNumber,
      pageSize: ctx.input.pageSize
    });

    let actionItems = flattenResources(result.data as JsonApiResource[]);

    return {
      output: {
        actionItems,
        totalCount: result.meta?.total_count
      },
      message: `Found **${actionItems.length}** action items.`
    };
  })
  .build();

export let createActionItem = SlateTool.create(spec, {
  name: 'Create Action Item',
  key: 'create_action_item',
  description: `Create a follow-up action item for an incident. Action items track tasks that need to be completed after an incident.
Assign to a user, set priority, and optionally set a due date.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      incidentId: z.string().describe('Incident ID to attach the action item to'),
      summary: z.string().describe('Action item summary'),
      description: z.string().optional().describe('Detailed description'),
      status: z.string().optional().describe('Initial status (e.g., open, in_progress, done)'),
      priority: z.string().optional().describe('Priority level'),
      assignedToUserId: z.string().optional().describe('User ID to assign the action item to'),
      dueDate: z.string().optional().describe('Due date in ISO 8601 format')
    })
  )
  .output(
    z.object({
      actionItem: z.record(z.string(), z.any()).describe('Created action item details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createActionItem(ctx.input.incidentId, {
      summary: ctx.input.summary,
      description: ctx.input.description,
      status: ctx.input.status,
      priority: ctx.input.priority,
      assignedToUserId: ctx.input.assignedToUserId,
      dueDate: ctx.input.dueDate
    });

    let actionItem = flattenResource(result.data as JsonApiResource);

    return {
      output: {
        actionItem
      },
      message: `Created action item: "${ctx.input.summary}" for incident ${ctx.input.incidentId}.`
    };
  })
  .build();

export let updateActionItem = SlateTool.create(spec, {
  name: 'Update Action Item',
  key: 'update_action_item',
  description: `Update an existing action item. Change status, reassign, update priority or due date.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      incidentId: z.string().describe('Incident ID the action item belongs to'),
      actionItemId: z.string().describe('Action item ID to update'),
      summary: z.string().optional().describe('Updated summary'),
      description: z.string().optional().describe('Updated description'),
      status: z.string().optional().describe('Updated status'),
      priority: z.string().optional().describe('Updated priority'),
      assignedToUserId: z.string().optional().describe('New assignee user ID'),
      dueDate: z.string().optional().describe('Updated due date in ISO 8601 format')
    })
  )
  .output(
    z.object({
      actionItem: z.record(z.string(), z.any()).describe('Updated action item details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.updateActionItem(ctx.input.incidentId, ctx.input.actionItemId, {
      summary: ctx.input.summary,
      description: ctx.input.description,
      status: ctx.input.status,
      priority: ctx.input.priority,
      assignedToUserId: ctx.input.assignedToUserId,
      dueDate: ctx.input.dueDate
    });

    let actionItem = flattenResource(result.data as JsonApiResource);

    return {
      output: {
        actionItem
      },
      message: `Updated action item ${ctx.input.actionItemId}.`
    };
  })
  .build();
