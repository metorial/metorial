import { SlateTool } from 'slates';
import { z } from 'zod';
import { FirmaoClient } from '../lib/client';
import { spec } from '../spec';

export let listTasks = SlateTool.create(spec, {
  name: 'List Tasks',
  key: 'list_tasks',
  description: `Search and list tasks from Firmao. Supports filtering by name, status, priority, project, and responsible user. Tasks can belong to projects or exist independently.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      start: z.number().optional().describe('Offset for pagination'),
      limit: z.number().optional().describe('Maximum results to return'),
      sort: z.string().optional().describe('Field to sort by'),
      dir: z.enum(['ASC', 'DESC']).optional().describe('Sort direction'),
      nameContains: z
        .string()
        .optional()
        .describe('Filter tasks whose name contains this value'),
      status: z
        .string()
        .optional()
        .describe('Filter by status (e.g., WAITING, IN_PROGRESS, DONE)'),
      projectId: z.number().optional().describe('Filter tasks by project ID')
    })
  )
  .output(
    z.object({
      tasks: z.array(
        z.object({
          taskId: z.number(),
          name: z.string(),
          description: z.string().optional(),
          taskType: z.string().optional(),
          status: z.string().optional(),
          priority: z.string().optional(),
          plannedStartDate: z.string().optional(),
          plannedEndDate: z.string().optional(),
          estimatedHours: z.number().optional(),
          projectId: z.number().optional(),
          projectName: z.string().optional(),
          creationDate: z.string().optional(),
          lastModificationDate: z.string().optional()
        })
      ),
      totalSize: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FirmaoClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let filters: Record<string, string> = {};
    if (ctx.input.nameContains) filters['name(contains)'] = ctx.input.nameContains;
    if (ctx.input.status) filters['status(eq)'] = ctx.input.status;
    if (ctx.input.projectId !== undefined)
      filters['project(eq)'] = String(ctx.input.projectId);

    let result = await client.list('tasks', {
      start: ctx.input.start,
      limit: ctx.input.limit,
      sort: ctx.input.sort,
      dir: ctx.input.dir,
      filters
    });

    let tasks = result.data.map((t: any) => ({
      taskId: t.id,
      name: t.name,
      description: t.description,
      taskType: t.taskType,
      status: t.status,
      priority: t.priority,
      plannedStartDate: t.plannedStartDate,
      plannedEndDate: t.plannedEndDate,
      estimatedHours: t.estimatedHours,
      projectId: typeof t.project === 'object' ? t.project?.id : t.project,
      projectName: typeof t.project === 'object' ? t.project?.name : undefined,
      creationDate: t.creationDate,
      lastModificationDate: t.lastModificationDate
    }));

    return {
      output: { tasks, totalSize: result.totalSize },
      message: `Found **${tasks.length}** task(s) (total: ${result.totalSize}).`
    };
  })
  .build();
