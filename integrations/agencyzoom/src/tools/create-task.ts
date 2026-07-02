import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createTask = SlateTool.create(spec, {
  name: 'Create Task',
  key: 'create_task',
  description: `Create a new task in AgencyZoom. Supports to-do, email, call, and meeting task types. Optionally assign to a user, set due date/time, and link to a lead or customer.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      title: z.string().describe('Title of the task'),
      type: z.enum(['to-do', 'email', 'call', 'meeting']).describe('Type of task to create'),
      assigneeId: z.string().optional().describe('ID of the user to assign the task to'),
      dueDate: z
        .string()
        .optional()
        .describe('Due date for the task (ISO date string, e.g. "2024-06-15")'),
      dueTime: z.string().optional().describe('Due time for the task (e.g. "14:00")'),
      duration: z.number().optional().describe('Duration of the task in minutes'),
      notes: z.string().optional().describe('Additional notes or description for the task'),
      leadId: z.string().optional().describe('ID of the lead to associate with this task'),
      customerId: z
        .string()
        .optional()
        .describe('ID of the customer to associate with this task'),
      invitees: z
        .array(z.string())
        .optional()
        .describe('Array of email addresses to invite (for meeting tasks)')
    })
  )
  .output(
    z.object({
      task: z.record(z.string(), z.any()).describe('The created task data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    let data: Record<string, any> = {
      title: ctx.input.title,
      type: ctx.input.type
    };
    if (ctx.input.assigneeId !== undefined) data.assigneeId = ctx.input.assigneeId;
    if (ctx.input.dueDate !== undefined) data.dueDate = ctx.input.dueDate;
    if (ctx.input.dueTime !== undefined) data.dueTime = ctx.input.dueTime;
    if (ctx.input.duration !== undefined) data.duration = ctx.input.duration;
    if (ctx.input.notes !== undefined) data.notes = ctx.input.notes;
    if (ctx.input.leadId !== undefined) data.leadId = ctx.input.leadId;
    if (ctx.input.customerId !== undefined) data.customerId = ctx.input.customerId;
    if (ctx.input.invitees !== undefined) data.invitees = ctx.input.invitees;

    let result = await client.createTask(data);

    return {
      output: { task: result },
      message: `Created **${ctx.input.type}** task: **${ctx.input.title}**.`
    };
  })
  .build();
