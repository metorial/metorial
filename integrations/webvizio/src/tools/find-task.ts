import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let findTask = SlateTool.create(spec, {
  name: 'Find Task',
  key: 'find_task',
  description: `Finds a task in Webvizio by its ID or external ID. Returns full task details including description, status, priority, assignees, technical metadata, and attachments.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      taskId: z.number().optional().describe('Webvizio internal task ID'),
      externalId: z.string().optional().describe('External identifier assigned to the task')
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

    let task = await client.findTask({
      taskId: ctx.input.taskId,
      externalId: ctx.input.externalId
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
      message: `Found task **${task.name}** (#${task.number}, ID: ${task.id}) — Status: ${task.status}, Priority: ${task.priority}`
    };
  })
  .build();
