import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClickUpClient } from '../lib/client';
import { clickupServiceError } from '../lib/errors';
import { spec } from '../spec';

let checklistItemOutput = z.object({
  itemId: z.string(),
  itemName: z.string(),
  resolved: z.boolean().optional(),
  assigneeUserId: z.string().optional(),
  parentItemId: z.string().optional(),
  dateCreated: z.string().optional()
});

let checklistOutput = z.object({
  checklistId: z.string(),
  taskId: z.string().optional(),
  checklistName: z.string().optional(),
  resolvedCount: z.number().optional(),
  unresolvedCount: z.number().optional(),
  items: z.array(checklistItemOutput).optional()
});

let formatChecklistItem = (item: any) => ({
  itemId: String(item.id),
  itemName: item.name,
  resolved: item.resolved,
  assigneeUserId:
    item.assignee && typeof item.assignee === 'object'
      ? String(item.assignee.id)
      : item.assignee
        ? String(item.assignee)
        : undefined,
  parentItemId: item.parent ? String(item.parent) : undefined,
  dateCreated: item.date_created
});

let formatChecklist = (checklist: any) => ({
  checklistId: String(checklist.id),
  taskId: checklist.task_id ? String(checklist.task_id) : undefined,
  checklistName: checklist.name,
  resolvedCount: checklist.resolved !== undefined ? Number(checklist.resolved) : undefined,
  unresolvedCount:
    checklist.unresolved !== undefined ? Number(checklist.unresolved) : undefined,
  items: Array.isArray(checklist.items) ? checklist.items.map(formatChecklistItem) : []
});

let findChecklistItem = (checklist: any, itemName?: string) => {
  let items = Array.isArray(checklist?.items) ? checklist.items : [];
  if (itemName) {
    let match = items.find((item: any) => item.name === itemName);
    if (match) return match;
  }

  return items[items.length - 1];
};

export let createChecklist = SlateTool.create(spec, {
  name: 'Create Checklist',
  key: 'create_checklist',
  description: `Create a checklist on a ClickUp task.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      taskId: z.string().describe('The task ID to add the checklist to'),
      name: z.string().describe('Checklist name')
    })
  )
  .output(checklistOutput)
  .handleInvocation(async ctx => {
    let client = new ClickUpClient(ctx.auth.token);
    let checklist = await client.createChecklist(ctx.input.taskId, ctx.input.name);

    return {
      output: formatChecklist(checklist),
      message: `Created checklist **${checklist.name}** on task ${ctx.input.taskId}.`
    };
  })
  .build();

export let updateChecklist = SlateTool.create(spec, {
  name: 'Update Checklist',
  key: 'update_checklist',
  description: `Rename a ClickUp task checklist or change its position on the task.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      checklistId: z.string().describe('The checklist ID to update'),
      name: z.string().optional().describe('New checklist name'),
      position: z.number().optional().describe('Checklist display position on the task')
    })
  )
  .output(
    z.object({
      checklistId: z.string(),
      updated: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickUpClient(ctx.auth.token);
    await client.updateChecklist(ctx.input.checklistId, {
      name: ctx.input.name,
      position: ctx.input.position
    });

    return {
      output: {
        checklistId: ctx.input.checklistId,
        updated: true
      },
      message: `Updated checklist ${ctx.input.checklistId}.`
    };
  })
  .build();

export let deleteChecklist = SlateTool.create(spec, {
  name: 'Delete Checklist',
  key: 'delete_checklist',
  description: `Delete a checklist from a ClickUp task.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      checklistId: z.string().describe('The checklist ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickUpClient(ctx.auth.token);
    await client.deleteChecklist(ctx.input.checklistId);

    return {
      output: { deleted: true },
      message: `Deleted checklist ${ctx.input.checklistId}.`
    };
  })
  .build();

export let createChecklistItem = SlateTool.create(spec, {
  name: 'Create Checklist Item',
  key: 'create_checklist_item',
  description: `Create an item inside a ClickUp task checklist.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      checklistId: z.string().describe('The checklist ID to add an item to'),
      name: z.string().describe('Checklist item name'),
      assignee: z.number().optional().describe('User ID to assign the checklist item to')
    })
  )
  .output(
    z.object({
      checklist: checklistOutput,
      item: checklistItemOutput
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickUpClient(ctx.auth.token);
    let checklist = await client.createChecklistItem(
      ctx.input.checklistId,
      ctx.input.name,
      ctx.input.assignee
    );
    let item = findChecklistItem(checklist, ctx.input.name);
    if (!item?.id) {
      throw clickupServiceError('ClickUp did not return the created checklist item.');
    }

    return {
      output: {
        checklist: formatChecklist(checklist),
        item: formatChecklistItem(item)
      },
      message: `Created checklist item **${ctx.input.name}** in checklist ${ctx.input.checklistId}.`
    };
  })
  .build();

export let updateChecklistItem = SlateTool.create(spec, {
  name: 'Update Checklist Item',
  key: 'update_checklist_item',
  description: `Update a ClickUp checklist item name, assignee, resolved state, or parent item.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      checklistId: z.string().describe('The checklist ID that owns the item'),
      checklistItemId: z.string().describe('The checklist item ID to update'),
      name: z.string().optional().describe('New checklist item name'),
      resolved: z.boolean().optional().describe('Mark the item resolved or unresolved'),
      assignee: z
        .number()
        .nullable()
        .optional()
        .describe('User ID to assign, or null to clear the assignee'),
      parentItemId: z
        .string()
        .nullable()
        .optional()
        .describe('Parent checklist item ID for nesting, or null to unnest')
    })
  )
  .output(
    z.object({
      checklist: checklistOutput,
      item: checklistItemOutput
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickUpClient(ctx.auth.token);
    let checklist = await client.updateChecklistItem(
      ctx.input.checklistId,
      ctx.input.checklistItemId,
      {
        name: ctx.input.name,
        resolved: ctx.input.resolved,
        assignee: ctx.input.assignee,
        parent: ctx.input.parentItemId
      }
    );
    let item = (Array.isArray(checklist.items) ? checklist.items : []).find(
      (candidate: any) => String(candidate.id) === ctx.input.checklistItemId
    );
    if (!item?.id) {
      throw clickupServiceError('ClickUp did not return the updated checklist item.');
    }

    return {
      output: {
        checklist: formatChecklist(checklist),
        item: formatChecklistItem(item)
      },
      message: `Updated checklist item ${ctx.input.checklistItemId}.`
    };
  })
  .build();

export let deleteChecklistItem = SlateTool.create(spec, {
  name: 'Delete Checklist Item',
  key: 'delete_checklist_item',
  description: `Delete an item from a ClickUp task checklist.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      checklistId: z.string().describe('The checklist ID that owns the item'),
      checklistItemId: z.string().describe('The checklist item ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickUpClient(ctx.auth.token);
    await client.deleteChecklistItem(ctx.input.checklistId, ctx.input.checklistItemId);

    return {
      output: { deleted: true },
      message: `Deleted checklist item ${ctx.input.checklistItemId}.`
    };
  })
  .build();
