import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageManualTasks = SlateTool.create(spec, {
  name: 'Manage Manual Tasks',
  key: 'manage_manual_tasks',
  description: `List manual tasks or update their status. Manual tasks are created for prospects within campaigns and can be marked as done or ignored.
- Use **list** action to retrieve pending tasks
- Use **done** or **ignored** action with a taskId to update a specific task`
})
  .input(
    z.object({
      action: z
        .enum(['list', 'done', 'ignored'])
        .describe('Action to perform: list tasks, or mark a task as done/ignored'),
      taskId: z
        .number()
        .optional()
        .describe('Task ID to update (required for done/ignored actions)'),
      campaignId: z
        .number()
        .optional()
        .describe('Filter tasks by campaign ID (for list action)')
    })
  )
  .output(
    z.object({
      tasks: z
        .array(
          z.object({
            taskId: z.number().optional().describe('Task ID'),
            prospectEmail: z.string().optional().describe('Prospect email'),
            taskType: z.string().optional().describe('Type of manual task'),
            taskName: z.string().optional().describe('Task name'),
            taskMessage: z.string().optional().describe('Task description/message'),
            dueDate: z.string().optional().describe('Task due date'),
            campaignId: z.number().optional().describe('Campaign ID'),
            campaignName: z.string().optional().describe('Campaign name'),
            status: z.string().optional().describe('Task status')
          })
        )
        .optional()
        .describe('List of tasks (for list action)'),
      updated: z
        .boolean()
        .optional()
        .describe('Whether the task was successfully updated (for done/ignored actions)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companyId: ctx.config.companyId
    });

    if (ctx.input.action === 'list') {
      let params: Record<string, any> = {};
      if (ctx.input.campaignId) params.campaign_id = ctx.input.campaignId;

      let data = await client.getManualTasks(params);
      let tasks = Array.isArray(data) ? data : (data?.tasks ?? []);

      let mapped = tasks.map((t: any) => ({
        taskId: t.id,
        prospectEmail: t.prospect_email ?? t.email,
        taskType: t.type,
        taskName: t.name,
        taskMessage: t.message,
        dueDate: t.due_date,
        campaignId: t.campaign_id,
        campaignName: t.campaign_name,
        status: t.status
      }));

      return {
        output: { tasks: mapped },
        message: `Found **${mapped.length}** manual task(s).`
      };
    }

    if (!ctx.input.taskId) {
      throw new Error('taskId is required for done/ignored actions');
    }

    await client.updateManualTask(ctx.input.taskId, ctx.input.action);

    return {
      output: { updated: true },
      message: `Task ${ctx.input.taskId} marked as **${ctx.input.action}**.`
    };
  })
  .build();
