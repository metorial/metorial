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
  description: `List follow-up action items across all incidents or a selected incident. Status filtering and sorting are provider-wide for the organization collection, and apply within the returned page when an incident is selected. Text search applies to the returned provider page.
Action items track post-incident follow-up tasks.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      incidentId: z
        .string()
        .optional()
        .describe('Incident ID or slug; omit to inspect the organization-wide collection'),
      search: z
        .string()
        .optional()
        .describe('Search summaries and descriptions within the returned provider page'),
      status: z
        .string()
        .optional()
        .describe(
          'Filter by status (e.g., open, done); within the returned page for a selected incident'
        ),
      sort: z
        .string()
        .optional()
        .describe(
          'Provider sort field; selected incidents support page-local created_at or updated_at, optionally prefixed with -'
        ),
      pageNumber: z.number().optional().describe('Page number'),
      pageSize: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      returnedCount: z.number().describe('Number of records returned in this response'),
      currentPage: z.number().optional().describe('Provider page number, when supplied'),
      totalPages: z.number().optional().describe('Provider page count, when supplied'),
      nextCursor: z
        .string()
        .optional()
        .describe('Provider continuation cursor, when supplied'),
      included: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Requested related resources'),
      actionItems: z.array(z.record(z.string(), z.any())).describe('List of action items'),
      totalCount: z.number().optional().describe('Total count')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listActionItems({
      search: ctx.input.search,
      incidentId: ctx.input.incidentId,
      status: ctx.input.status,
      sort: ctx.input.sort,
      pageNumber: ctx.input.pageNumber,
      pageSize: ctx.input.pageSize
    });

    let actionItems = flattenResources(result.data as JsonApiResource[]);

    return {
      output: {
        returnedCount: actionItems.length,
        currentPage: result.meta?.current_page,
        totalPages: result.meta?.total_pages,
        nextCursor: result.meta?.next_cursor,
        included: result.included ? flattenResources(result.included) : undefined,
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
      priority: z.string().optional().describe('Priority: high, medium or low'),
      assignedToUserId: z
        .string()
        .optional()
        .describe('Numeric user ID returned by list_users, supplied as a string'),
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
      assignedToUserId: z
        .string()
        .optional()
        .describe('Numeric user ID returned by list_users, supplied as a string'),
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
