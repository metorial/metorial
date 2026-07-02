import { SlateTool } from 'slates';
import { z } from 'zod';
import { MagneticClient } from '../lib/client';
import { spec } from '../spec';

let taskSchema = z.object({
  taskId: z.string().describe('ID of the task'),
  taskName: z.string().optional().describe('Name of the task'),
  taskCode: z.string().optional().describe('Code identifier of the task'),
  description: z.string().optional().describe('Description of the task'),
  billable: z.boolean().optional().describe('Whether the task is billable'),
  timeMinutes: z.number().optional().describe('Total time tracked in minutes'),
  effortMinutes: z.number().optional().describe('Estimated effort in minutes'),
  startDate: z.string().optional().describe('Start date of the task'),
  endDate: z.string().optional().describe('End/due date of the task'),
  status: z.string().optional().describe('Current status of the task'),
  ownerName: z.string().optional().describe('Full name of the task owner'),
  groupingName: z.string().optional().describe('Name of the linked opportunity/job')
});

export let findTask = SlateTool.create(spec, {
  name: 'Find Tasks',
  key: 'find_task',
  description: `Search for tasks by name or description. Returns matching tasks with their details including status, time tracking, and linked opportunity/job.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      searchField: z
        .enum(['name', 'description'])
        .describe('Field to search by: "name" or "description"'),
      searchValue: z.string().describe('Text to search for')
    })
  )
  .output(
    z.object({
      tasks: z.array(taskSchema).describe('List of matching tasks'),
      totalCount: z.number().describe('Number of tasks found')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MagneticClient({ token: ctx.auth.token });

    let apiSearchField = ctx.input.searchField === 'name' ? 'task' : 'description';
    let results = await client.findTasks(apiSearchField, ctx.input.searchValue);

    let tasks = (results || []).map((t: any) => ({
      taskId: String(t.id),
      taskName: t.task,
      taskCode: t.code,
      description: t.description,
      billable: t.billable,
      timeMinutes: t.timeMinutes,
      effortMinutes: t.effortMinutes,
      startDate: t.startDate,
      endDate: t.endDate,
      status: t.status,
      ownerName: t.user?.fullName,
      groupingName: t.grouping?.name
    }));

    return {
      output: {
        tasks,
        totalCount: tasks.length
      },
      message: `Found **${tasks.length}** task${tasks.length === 1 ? '' : 's'} matching "${ctx.input.searchValue}".`
    };
  })
  .build();
