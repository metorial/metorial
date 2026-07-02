import { SlateTool } from 'slates';
import { z } from 'zod';
import { BugherdClient } from '../lib/client';
import { spec } from '../spec';

let userRefSchema = z
  .object({
    userId: z.number().describe('User ID'),
    email: z.string().describe('User email'),
    displayName: z.string().describe('User display name')
  })
  .nullable();

export let getTask = SlateTool.create(spec, {
  name: 'Get Task',
  key: 'get_task',
  description: `Retrieve detailed information about a specific BugHerd task, including assignee, requester, tags, attachments, and metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      taskId: z.number().describe('Global task ID'),
      projectId: z
        .number()
        .optional()
        .describe('Project ID (optional, enables project-scoped lookup)')
    })
  )
  .output(
    z.object({
      taskId: z.number().describe('Global task ID'),
      localTaskId: z.number().describe('Project-scoped task ID'),
      projectId: z.number().describe('Project ID'),
      title: z.string().nullable().describe('Task title'),
      description: z.string().describe('Task description'),
      status: z.string().describe('Current status'),
      priorityId: z
        .number()
        .describe('Priority: 0=not set, 1=critical, 2=important, 3=normal, 4=minor'),
      tagNames: z.array(z.string()).describe('Tags'),
      externalId: z.string().nullable().describe('External tracking ID'),
      site: z.string().nullable().describe('Website where the bug was logged'),
      pageUrl: z.string().nullable().describe('Page URL of the bug'),
      screenshotUrl: z.string().nullable().describe('Bug screenshot URL'),
      secretLink: z.string().nullable().describe('Public shareable link'),
      adminLink: z.string().nullable().describe('Admin dashboard link'),
      attachments: z.array(z.string()).describe('Attachment URLs'),
      assignee: userRefSchema.describe('Assigned user'),
      requester: userRefSchema.describe('User who reported the task'),
      requesterEmail: z.string().nullable().describe('Requester email'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp'),
      closedAt: z.string().nullable().describe('Closed timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BugherdClient(ctx.auth.token);

    let task: any;
    if (ctx.input.projectId) {
      task = await client.getTask(ctx.input.projectId, ctx.input.taskId);
    } else {
      task = await client.getTaskGlobal(ctx.input.taskId);
    }

    let mapUser = (u: { id: number; email: string; display_name: string } | null) =>
      u ? { userId: u.id, email: u.email, displayName: u.display_name } : null;

    return {
      output: {
        taskId: task.id,
        localTaskId: task.local_task_id,
        projectId: task.project_id,
        title: task.title,
        description: task.description,
        status: task.status,
        priorityId: task.priority_id,
        tagNames: task.tag_names,
        externalId: task.external_id,
        site: task.site,
        pageUrl: task.url,
        screenshotUrl: task.screenshot_url,
        secretLink: task.secret_link,
        adminLink: task.admin_link,
        attachments: task.attachments,
        assignee: mapUser(task.assigned_to),
        requester: mapUser(task.requester),
        requesterEmail: task.requester_email,
        createdAt: task.created_at,
        updatedAt: task.updated_at,
        closedAt: task.closed_at
      },
      message: `Retrieved task **#${task.local_task_id}** (ID: ${task.id}) — status: ${task.status}, priority: ${task.priority_id}.`
    };
  })
  .build();
