import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createTask = SlateTool.create(spec, {
  name: 'Create Task',
  key: 'create_task',
  description: `Creates a new task (bug report, feedback item, or development task) within a Webvizio project. Tasks can include priority, status, assignees, due dates, tags, file attachments, and time logs.`,
  instructions: [
    'Identify the parent project using one of: projectId, projectUuid, or projectExternalId.',
    'The status field accepts: "Open", "In progress", "Done", or "Closed".',
    'The priority field accepts: "Low", "Normal", or "High".',
    'Assignees and author should be specified as email addresses.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      projectId: z.number().optional().describe('Webvizio project ID'),
      projectUuid: z.string().optional().describe('Project UUID'),
      projectExternalId: z.string().optional().describe('Project external ID'),
      name: z.string().describe('Task title'),
      externalId: z
        .string()
        .optional()
        .describe('External identifier for syncing with your system'),
      author: z.string().optional().describe('Email address of the task author'),
      description: z.string().optional().describe('Task description in HTML format'),
      status: z
        .enum(['Open', 'In progress', 'Done', 'Closed'])
        .optional()
        .describe('Task status'),
      priority: z.enum(['Low', 'Normal', 'High']).optional().describe('Task priority level'),
      dueDate: z.string().optional().describe('Due date in ISO8601 format'),
      tags: z.array(z.string()).optional().describe('List of tags for the task'),
      files: z
        .array(
          z.object({
            fileName: z.string().describe('Name of the file'),
            fileUrl: z.string().describe('URL of the file')
          })
        )
        .optional()
        .describe('File attachments'),
      assignees: z.array(z.string()).optional().describe('Email addresses of assigned users'),
      timeLogs: z
        .array(
          z.object({
            user: z.string().describe('Email of the user who logged time'),
            date: z.string().describe('Date of the time log in ISO8601 format'),
            time: z.number().describe('Duration in minutes')
          })
        )
        .optional()
        .describe('Time log entries')
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

    let task = await client.createTask({
      projectId: ctx.input.projectId,
      projectUuid: ctx.input.projectUuid,
      projectExternalId: ctx.input.projectExternalId,
      name: ctx.input.name,
      externalId: ctx.input.externalId,
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
      message: `Created task **${task.name}** (#${task.number}, ID: ${task.id}) in project ${task.projectId}`
    };
  })
  .build();
