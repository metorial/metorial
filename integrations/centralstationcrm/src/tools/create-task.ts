import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createTask = SlateTool.create(spec, {
  name: 'Create Task',
  key: 'create_task',
  description: `Create a new task in CentralStationCRM. Tasks can be assigned to a user and optionally linked to a person, company, deal, or project.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      subject: z.string().describe('Subject/title of the task'),
      description: z
        .string()
        .optional()
        .describe('Separate descriptions are unsupported by the task API; omit this field'),
      dueAt: z.string().optional().describe('Due date for the task (YYYY-MM-DD or ISO 8601)'),
      responsibleUserId: z
        .number()
        .optional()
        .describe(
          'Assigned user ID from list_users. Defaults to the current API user when omitted'
        ),
      personId: z.number().optional().describe('ID of the person to link this task to'),
      companyId: z.number().optional().describe('ID of the company to link this task to'),
      dealId: z.number().optional().describe('ID of the deal to link this task to'),
      projectId: z.number().optional().describe('ID of the project to link this task to')
    })
  )
  .output(
    z.object({
      taskId: z.number().describe('ID of the created task'),
      subject: z.string().optional().describe('Task subject'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountName: ctx.config.accountName
    });

    if (ctx.input.description !== undefined) {
      throw createApiServiceError(
        'Tasks do not support a separate description. Use subject for the task text.'
      );
    }
    let links = [
      { type: 'Person', id: ctx.input.personId },
      { type: 'Company', id: ctx.input.companyId },
      { type: 'Deal', id: ctx.input.dealId },
      { type: 'Project', id: ctx.input.projectId }
    ].filter(link => link.id !== undefined);
    if (links.length > 1) {
      throw createApiServiceError(
        'Link a task to only one person, company, deal, or project.'
      );
    }
    let responsibleUserId = ctx.input.responsibleUserId;
    if (responsibleUserId === undefined) {
      let currentUser = await client.getCurrentUser();
      responsibleUserId = (currentUser?.user ?? currentUser).id;
      if (!responsibleUserId) {
        throw createApiServiceError(
          'Could not determine the task assignee. Call list_users and provide responsibleUserId.'
        );
      }
    }
    let dateOnly =
      ctx.input.dueAt !== undefined && /^\d{4}-\d{2}-\d{2}$/.test(ctx.input.dueAt);
    let result = await client.createTask({
      name: ctx.input.subject,
      precise_time: dateOnly ? `${ctx.input.dueAt}T00:00:00Z` : ctx.input.dueAt,
      fuzzy: ctx.input.dueAt === undefined ? undefined : dateOnly,
      user_id: responsibleUserId,
      attachable_type: links[0]?.type,
      attachable_id: links[0]?.id
    });

    let task = result?.task ?? result;

    return {
      output: {
        taskId: task.id,
        subject: task.name ?? task.subject,
        createdAt: task.created_at
      },
      message: `Created task **${ctx.input.subject}** (ID: ${task.id}).`
    };
  })
  .build();
