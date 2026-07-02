import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateTask = SlateTool.create(spec, {
  name: 'Update Task',
  key: 'update_task',
  description: `Updates an existing task in Webvizio. You can modify the task name, description, status, priority, assignees, tags, due date, files, and time logs. Identify the task by its ID or external ID.`,
  instructions: [
    'Identify the task using either taskId or externalId.',
    'Only provide fields you want to update — omitted fields remain unchanged.',
    'The status field accepts: "Open", "In progress", "Done", or "Closed".',
    'The priority field accepts: "Low", "Normal", or "High".'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      taskId: z.number().optional().describe('Webvizio internal task ID'),
      externalId: z.string().optional().describe('External identifier assigned to the task'),
      name: z.string().optional().describe('New task title'),
      author: z.string().optional().describe('Task author email'),
      description: z.string().optional().describe('New task description in HTML format'),
      status: z
        .enum(['Open', 'In progress', 'Done', 'Closed'])
        .optional()
        .describe('New task status'),
      priority: z.enum(['Low', 'Normal', 'High']).optional().describe('New task priority'),
      dueDate: z.string().optional().describe('New due date in ISO8601 format'),
      tags: z.array(z.string()).optional().describe('Updated list of tags'),
      files: z
        .array(
          z.object({
            fileName: z.string().describe('Name of the file'),
            fileUrl: z.string().describe('URL of the file')
          })
        )
        .optional()
        .describe('Updated file attachments'),
      assignees: z
        .array(z.string())
        .optional()
        .describe('Updated email addresses of assigned users'),
      timeLogs: z
        .array(
          z.object({
            user: z.string().describe('Email of the user who logged time'),
            date: z.string().describe('Date of the time log in ISO8601 format'),
            time: z.number().describe('Duration in minutes')
          })
        )
        .optional()
        .describe('Updated time log entries')
    })
  )
  .output(
    z.object({
      taskId: z.number().describe('Webvizio task ID'),
      externalId: z.string().nullable().describe('External identifier'),
      taskNumber: z.number().describe('Task sequence number within the project'),
      projectId: z.number().describe('Parent project ID'),
      projectUuid: z.string().describe('Parent project UUID'),
      projectExternalId: z.string().nullable().describe('Parent project external ID'),
      name: z.string().describe('Task title'),
      description: z.string().describe('Task description (plain text)'),
      descriptionHtml: z.string().nullable().describe('Task description in HTML format'),
      screenshot: z.string().nullable().describe('Annotated screenshot URL'),
      status: z.string().describe('Current task status'),
      priority: z.string().describe('Task priority level'),
      deviceType: z.string().describe('Device type where the issue was reported'),
      os: z.string().describe('Operating system'),
      browser: z.string().describe('Browser information'),
      author: z.string().describe('Task author email'),
      assignees: z.array(z.string()).describe('Assigned user emails'),
      tags: z.array(z.string()).describe('Task tags'),
      dueDate: z.string().describe('Due date in ISO8601 format'),
      files: z
        .array(
          z.object({
            fileName: z.string().describe('File name'),
            fileUrl: z.string().describe('File URL')
          })
        )
        .describe('Attached files'),
      videos: z.array(z.string()).describe('Attached video URLs'),
      timeLogs: z
        .array(
          z.object({
            timeLogId: z.number().describe('Time log ID'),
            user: z.string().describe('User email'),
            date: z.string().describe('Date of the time log'),
            time: z.number().describe('Duration in minutes')
          })
        )
        .describe('Time log entries'),
      createdAt: z.string().describe('Creation timestamp in ISO8601 format'),
      updatedAt: z.string().describe('Last update timestamp in ISO8601 format')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let task = await client.updateTask({
      taskId: ctx.input.taskId,
      externalId: ctx.input.externalId,
      name: ctx.input.name,
      author: ctx.input.author,
      description: ctx.input.description,
      status: ctx.input.status,
      priority: ctx.input.priority,
      executeAt: ctx.input.dueDate,
      tags: ctx.input.tags,
      files: ctx.input.files,
      assignees: ctx.input.assignees,
      timeLogs: ctx.input.timeLogs
    });

    return {
      output: {
        taskId: task.id,
        externalId: task.externalId,
        taskNumber: task.number,
        projectId: task.projectId,
        projectUuid: task.projectUuid,
        projectExternalId: task.projectExternalId,
        name: task.name,
        description: task.description,
        descriptionHtml: task.descriptionHtml,
        screenshot: task.screenshot,
        status: task.status,
        priority: task.priority,
        deviceType: task.deviceType,
        os: task.os,
        browser: task.browser,
        author: task.author,
        assignees: task.assignees,
        tags: task.tags,
        dueDate: task.executeAt,
        files: task.files,
        videos: task.videos,
        timeLogs: task.timeLogs.map(tl => ({
          timeLogId: tl.id,
          user: tl.user,
          date: tl.date,
          time: tl.time
        })),
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      },
      message: `Updated task **${task.name}** (#${task.number}, ID: ${task.id}) — Status: ${task.status}, Priority: ${task.priority}`
    };
  })
  .build();
