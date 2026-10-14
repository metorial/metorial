import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapTask, taskOutputSchema } from '../lib/tasks';
import { spec } from '../spec';

export let manageTasks = SlateTool.create(spec, {
  name: 'Manage Tasks',
  key: 'manage_tasks',
  description: `Create or update tasks. Tasks can be standalone or subtasks within conversations. They support states (todo, in_progress, closed), due dates, assignees, and team associations.`,
  instructions: [
    'For standalone tasks, provide either teamId or assignees.',
    'For subtasks within a conversation, set subtask=true and provide conversationId.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update']).describe('Action to perform'),
      title: z
        .string()
        .max(1000)
        .optional()
        .describe('Task title, required when creating a task'),
      description: z.string().max(10000).optional().describe('Task description'),
      taskId: z.string().optional().describe('Task ID (required for update)'),
      organizationId: z
        .string()
        .optional()
        .describe('Organization ID (required when using team or assignees)'),
      teamId: z.string().optional().describe('Team ID'),
      assignees: z.array(z.string()).optional().describe('User IDs to assign'),
      dueAt: z.number().optional().describe('Due date as Unix timestamp'),
      state: z.enum(['todo', 'in_progress', 'closed']).optional().describe('Task state'),
      subtask: z.boolean().optional().describe('Create as subtask within a conversation'),
      conversationId: z.string().optional().describe('Parent conversation ID (for subtasks)'),
      references: z
        .array(z.string())
        .optional()
        .describe('Reference strings to find parent conversation'),
      subject: z
        .string()
        .optional()
        .describe('Subject for new conversation if created via references'),
      addUsers: z
        .array(z.string())
        .optional()
        .describe('User IDs to grant conversation access'),
      addToInbox: z.boolean().optional().describe('Move parent conversation to inbox')
    })
  )
  .output(taskOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'create') {
      if (!ctx.input.title?.trim())
        throw createApiServiceError('title is required for creating a task.');
      if (ctx.input.subtask && !ctx.input.conversationId && !ctx.input.references?.length) {
        throw createApiServiceError(
          'Provide conversationId or references when creating a subtask.'
        );
      }
      if (!ctx.input.subtask && !ctx.input.teamId && !ctx.input.assignees?.length) {
        throw createApiServiceError('Provide teamId or assignees for a standalone task.');
      }
      if (
        (ctx.input.teamId || ctx.input.assignees?.length || ctx.input.addUsers?.length) &&
        !ctx.input.organizationId
      ) {
        throw createApiServiceError(
          'organizationId is required when assigning a new task to users or a team.'
        );
      }
    }
    let fields: Record<string, any> = {};
    if (ctx.input.title !== undefined) fields.title = ctx.input.title;
    if (ctx.input.description !== undefined) fields.description = ctx.input.description;
    if (ctx.input.organizationId) fields.organization = ctx.input.organizationId;
    if (ctx.input.teamId) fields.team = ctx.input.teamId;
    if (ctx.input.assignees) fields.assignees = ctx.input.assignees;
    if (ctx.input.dueAt !== undefined) fields.due_at = ctx.input.dueAt;
    if (ctx.input.state) fields.state = ctx.input.state;
    if (ctx.input.subtask !== undefined) fields.subtask = ctx.input.subtask;
    if (ctx.input.conversationId) fields.conversation = ctx.input.conversationId;
    if (ctx.input.references) fields.references = ctx.input.references;
    if (ctx.input.subject) fields.conversation_subject = ctx.input.subject;
    if (ctx.input.addUsers) fields.add_users = ctx.input.addUsers;
    if (ctx.input.addToInbox !== undefined) fields.add_to_inbox = ctx.input.addToInbox;

    if (ctx.input.action === 'create') {
      let data = await client.createTask(fields);
      let t = data.tasks;
      if (!t?.id) throw createApiServiceError('Missive did not return the created task.');
      return {
        output: mapTask(t),
        message: `Created task **${t.id}**.`
      };
    }

    // update
    if (!ctx.input.taskId)
      throw createApiServiceError('taskId is required for updating tasks');
    let data = await client.updateTask(ctx.input.taskId, fields);
    let t = data.tasks;
    if (!t?.id) throw createApiServiceError('Missive did not return the task.');
    return {
      output: mapTask(t),
      message: `Updated task **${ctx.input.taskId}**.`
    };
  })
  .build();
