import { SlateTool } from 'slates';
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
      description: z.string().optional().describe('Detailed description of the task'),
      dueAt: z.string().optional().describe('Due date for the task (YYYY-MM-DD or ISO 8601)'),
      responsibleUserId: z
        .number()
        .optional()
        .describe('ID of the user assigned to this task'),
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

    let result = await client.createTask({
      subject: ctx.input.subject,
      description: ctx.input.description,
      due_at: ctx.input.dueAt,
      user_id: ctx.input.responsibleUserId,
      person_id: ctx.input.personId,
      company_id: ctx.input.companyId,
      deal_id: ctx.input.dealId,
      project_id: ctx.input.projectId
    });

    let task = result?.task ?? result;

    return {
      output: {
        taskId: task.id,
        subject: task.subject,
        createdAt: task.created_at
      },
      message: `Created task **${ctx.input.subject}** (ID: ${task.id}).`
    };
  })
  .build();
