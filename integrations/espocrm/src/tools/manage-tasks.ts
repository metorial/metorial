import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageTasks = SlateTool.create(spec, {
  name: 'Manage Tasks',
  key: 'manage_tasks',
  description: `Create, update, or delete Task records in EspoCRM. Tasks represent to-do items and can be linked to contacts, accounts, leads, and other entities.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      taskId: z.string().optional().describe('Task ID (required for update and delete)'),
      name: z.string().optional().describe('Task name'),
      status: z
        .string()
        .optional()
        .describe('Task status (e.g., Not Started, Started, Completed, Canceled, Deferred)'),
      priority: z.string().optional().describe('Priority (e.g., Low, Normal, High, Urgent)'),
      dateStart: z.string().optional().describe('Start date (YYYY-MM-DD HH:mm:ss)'),
      dateEnd: z.string().optional().describe('Due date (YYYY-MM-DD HH:mm:ss)'),
      parentType: z
        .string()
        .optional()
        .describe('Parent entity type (e.g., Account, Contact, Lead, Opportunity, Case)'),
      parentId: z.string().optional().describe('Parent record ID'),
      description: z.string().optional().describe('Task description'),
      assignedUserId: z.string().optional().describe('ID of the assigned user'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional custom fields as key-value pairs')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('ID of the task'),
      name: z.string().optional().describe('Task name'),
      status: z.string().optional().describe('Task status'),
      priority: z.string().optional().describe('Priority'),
      dateStart: z.string().optional().describe('Start date'),
      dateEnd: z.string().optional().describe('Due date'),
      parentType: z.string().optional().describe('Parent entity type'),
      parentId: z.string().optional().describe('Parent record ID'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      modifiedAt: z.string().optional().describe('Last modification timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { action, taskId, customFields, ...fields } = ctx.input;

    if (action === 'create') {
      let data: Record<string, any> = { ...fields, ...customFields };
      let result = await client.createRecord('Task', data);
      return {
        output: {
          taskId: result.id,
          name: result.name,
          status: result.status,
          priority: result.priority,
          dateStart: result.dateStart,
          dateEnd: result.dateEnd,
          parentType: result.parentType,
          parentId: result.parentId,
          createdAt: result.createdAt,
          modifiedAt: result.modifiedAt
        },
        message: `Task **${result.name || ''}** created successfully.`
      };
    }

    if (action === 'update') {
      if (!taskId) throw new Error('taskId is required for update');
      let data: Record<string, any> = { ...fields, ...customFields };
      Object.keys(data).forEach(key => {
        if (data[key] === undefined) delete data[key];
      });
      let result = await client.updateRecord('Task', taskId, data);
      return {
        output: {
          taskId: result.id,
          name: result.name,
          status: result.status,
          priority: result.priority,
          dateStart: result.dateStart,
          dateEnd: result.dateEnd,
          parentType: result.parentType,
          parentId: result.parentId,
          createdAt: result.createdAt,
          modifiedAt: result.modifiedAt
        },
        message: `Task **${result.name || ''}** updated successfully.`
      };
    }

    if (action === 'delete') {
      if (!taskId) throw new Error('taskId is required for delete');
      await client.deleteRecord('Task', taskId);
      return {
        output: {
          taskId
        },
        message: `Task **${taskId}** deleted successfully.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
