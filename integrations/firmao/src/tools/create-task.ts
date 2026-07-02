import { SlateTool } from 'slates';
import { z } from 'zod';
import { FirmaoClient } from '../lib/client';
import { spec } from '../spec';

export let createTask = SlateTool.create(spec, {
  name: 'Create Task',
  key: 'create_task',
  description: `Create a new task in Firmao, optionally within a project. Tasks support priority levels, status tracking, date planning, time estimation, and assignment to responsible users.`
})
  .input(
    z.object({
      name: z.string().describe('Task name'),
      description: z.string().optional().describe('Task description'),
      taskType: z.string().optional().describe('Task type (e.g., PROJECT)'),
      priority: z
        .string()
        .optional()
        .describe('Priority level (e.g., 100=low, 200=normal, 300=high)'),
      status: z.string().optional().describe('Task status (e.g., WAITING, IN_PROGRESS, DONE)'),
      plannedStartDate: z.string().optional().describe('Planned start date (ISO 8601)'),
      plannedEndDate: z.string().optional().describe('Planned end date (ISO 8601)'),
      plannedStartDateType: z
        .enum(['EXACTLY', 'APPROXIMATELY'])
        .optional()
        .describe('Start date precision'),
      plannedEndDateType: z
        .enum(['EXACTLY', 'APPROXIMATELY'])
        .optional()
        .describe('End date precision'),
      estimatedHours: z.number().optional().describe('Estimated hours to complete'),
      projectId: z.number().optional().describe('ID of the project this task belongs to'),
      responsibleUserIds: z
        .array(z.number())
        .optional()
        .describe('IDs of users responsible for the task'),
      tagIds: z.array(z.number()).optional().describe('IDs of tags to apply')
    })
  )
  .output(
    z.object({
      taskId: z.number().describe('ID of the created task'),
      name: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FirmaoClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let body: Record<string, any> = {
      name: ctx.input.name
    };

    if (ctx.input.description) body.description = ctx.input.description;
    if (ctx.input.taskType) body.taskType = ctx.input.taskType;
    if (ctx.input.priority) body.priority = ctx.input.priority;
    if (ctx.input.status) body.status = ctx.input.status;
    if (ctx.input.plannedStartDate) body.plannedStartDate = ctx.input.plannedStartDate;
    if (ctx.input.plannedEndDate) body.plannedEndDate = ctx.input.plannedEndDate;
    if (ctx.input.plannedStartDateType)
      body.plannedStartDateType = ctx.input.plannedStartDateType;
    if (ctx.input.plannedEndDateType) body.plannedEndDateType = ctx.input.plannedEndDateType;
    if (ctx.input.estimatedHours !== undefined) body.estimatedHours = ctx.input.estimatedHours;
    if (ctx.input.projectId !== undefined) body.project = ctx.input.projectId;
    if (ctx.input.responsibleUserIds)
      body.responsibleUsers = ctx.input.responsibleUserIds.map(id => ({ id }));
    if (ctx.input.tagIds) body.tags = ctx.input.tagIds.map(id => ({ id }));

    let result = await client.create('tasks', body);
    let createdId = result?.changelog?.[0]?.objectId ?? result?.id;

    return {
      output: {
        taskId: createdId,
        name: ctx.input.name
      },
      message: `Created task **${ctx.input.name}** (ID: ${createdId}).`
    };
  })
  .build();
