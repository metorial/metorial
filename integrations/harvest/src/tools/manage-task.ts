import { SlateTool } from 'slates';
import { z } from 'zod';
import { HarvestClient } from '../lib/client';
import { spec } from '../spec';

export let manageTask = SlateTool.create(spec, {
  name: 'Manage Task',
  key: 'manage_task',
  description: `Create, update, or delete a task type in Harvest. Tasks are reusable categories that can be assigned to projects. They can have default hourly rates and billable settings.`,
  constraints: ['Tasks cannot be deleted if they have associated time entries.'],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      taskId: z.number().optional().describe('Task ID (required for update/delete)'),
      name: z.string().optional().describe('Task name (required for create)'),
      billableByDefault: z.boolean().optional().describe('Whether billable by default'),
      defaultHourlyRate: z.number().optional().describe('Default hourly rate'),
      isDefault: z.boolean().optional().describe('Whether added to new projects by default'),
      isActive: z.boolean().optional().describe('Whether the task is active')
    })
  )
  .output(
    z.object({
      taskId: z.number().optional().describe('ID of the task'),
      name: z.string().optional().describe('Task name'),
      billableByDefault: z.boolean().optional().describe('Whether billable by default'),
      defaultHourlyRate: z.number().optional().nullable().describe('Default hourly rate'),
      isDefault: z.boolean().optional().describe('Whether added to new projects by default'),
      isActive: z.boolean().optional().describe('Whether active'),
      deleted: z.boolean().optional().describe('Whether the task was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HarvestClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    if (ctx.input.action === 'delete') {
      if (!ctx.input.taskId) throw new Error('taskId is required for delete');
      await client.deleteTask(ctx.input.taskId);
      return {
        output: { taskId: ctx.input.taskId, deleted: true },
        message: `Deleted task **#${ctx.input.taskId}**.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw new Error('name is required for create');
      let t = await client.createTask({
        name: ctx.input.name,
        billableByDefault: ctx.input.billableByDefault,
        defaultHourlyRate: ctx.input.defaultHourlyRate,
        isDefault: ctx.input.isDefault,
        isActive: ctx.input.isActive
      });
      return {
        output: {
          taskId: t.id,
          name: t.name,
          billableByDefault: t.billable_by_default,
          defaultHourlyRate: t.default_hourly_rate,
          isDefault: t.is_default,
          isActive: t.is_active
        },
        message: `Created task **${t.name}** (#${t.id}).`
      };
    }

    // update
    if (!ctx.input.taskId) throw new Error('taskId is required for update');
    let t = await client.updateTask(ctx.input.taskId, {
      name: ctx.input.name,
      billableByDefault: ctx.input.billableByDefault,
      defaultHourlyRate: ctx.input.defaultHourlyRate,
      isDefault: ctx.input.isDefault,
      isActive: ctx.input.isActive
    });
    return {
      output: {
        taskId: t.id,
        name: t.name,
        billableByDefault: t.billable_by_default,
        defaultHourlyRate: t.default_hourly_rate,
        isDefault: t.is_default,
        isActive: t.is_active
      },
      message: `Updated task **${t.name}** (#${t.id}).`
    };
  })
  .build();
