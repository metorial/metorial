import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClickUpClient } from '../lib/client';
import { spec } from '../spec';

export let getTask = SlateTool.create(spec, {
  name: 'Get Task',
  key: 'get_task',
  description: `Retrieve a single ClickUp task by its ID, including all details such as status, assignees, custom fields, description, dates, tags, and subtasks.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      taskId: z.string().describe('The task ID to retrieve'),
      includeSubtasks: z.boolean().optional().describe('Include subtasks in the response')
    })
  )
  .output(
    z.object({
      taskId: z.string(),
      taskName: z.string(),
      description: z.string().optional(),
      textContent: z.string().optional(),
      taskUrl: z.string(),
      status: z.string().optional(),
      statusColor: z.string().optional(),
      priority: z.string().optional(),
      assignees: z
        .array(
          z.object({
            userId: z.string(),
            username: z.string(),
            email: z.string().optional()
          })
        )
        .optional(),
      tags: z.array(z.string()).optional(),
      dueDate: z.string().optional(),
      startDate: z.string().optional(),
      dateCreated: z.string().optional(),
      dateUpdated: z.string().optional(),
      dateClosed: z.string().optional(),
      timeEstimate: z.number().optional(),
      listId: z.string().optional(),
      listName: z.string().optional(),
      folderId: z.string().optional(),
      folderName: z.string().optional(),
      spaceId: z.string().optional(),
      spaceName: z.string().optional(),
      parentTaskId: z.string().optional(),
      customFields: z
        .array(
          z.object({
            fieldId: z.string(),
            fieldName: z.string(),
            fieldType: z.string(),
            fieldValue: z.any().optional()
          })
        )
        .optional(),
      subtasks: z
        .array(
          z.object({
            taskId: z.string(),
            taskName: z.string(),
            status: z.string().optional()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickUpClient(ctx.auth.token);
    let task = await client.getTask(ctx.input.taskId, {
      includeSubtasks: ctx.input.includeSubtasks
    });

    return {
      output: {
        taskId: task.id,
        taskName: task.name,
        description: task.description ?? undefined,
        textContent: task.text_content ?? undefined,
        taskUrl: task.url,
        status: task.status?.status ?? undefined,
        statusColor: task.status?.color ?? undefined,
        priority: task.priority?.priority ?? undefined,
        assignees:
          task.assignees?.map((a: any) => ({
            userId: String(a.id),
            username: a.username,
            email: a.email ?? undefined
          })) ?? [],
        tags: task.tags?.map((t: any) => t.name) ?? [],
        dueDate: task.due_date ?? undefined,
        startDate: task.start_date ?? undefined,
        dateCreated: task.date_created ?? undefined,
        dateUpdated: task.date_updated ?? undefined,
        dateClosed: task.date_closed ?? undefined,
        timeEstimate: task.time_estimate ?? undefined,
        listId: task.list?.id ?? undefined,
        listName: task.list?.name ?? undefined,
        folderId: task.folder?.id ?? undefined,
        folderName: task.folder?.name ?? undefined,
        spaceId: task.space?.id ?? undefined,
        spaceName: task.space?.name ?? undefined,
        parentTaskId: task.parent ?? undefined,
        customFields:
          task.custom_fields?.map((cf: any) => ({
            fieldId: cf.id,
            fieldName: cf.name,
            fieldType: cf.type,
            fieldValue: cf.value
          })) ?? [],
        subtasks:
          task.subtasks?.map((s: any) => ({
            taskId: s.id,
            taskName: s.name,
            status: s.status?.status ?? undefined
          })) ?? []
      },
      message: `Retrieved task **${task.name}** (${task.id}).`
    };
  })
  .build();
