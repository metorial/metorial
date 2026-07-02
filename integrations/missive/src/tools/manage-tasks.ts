import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let taskOutputSchema = z.object({
  taskId: z.string().describe('Task ID'),
  state: z.string().optional().describe('Task state: todo, in_progress, or closed'),
  dueAt: z.number().optional().describe('Due date as Unix timestamp'),
  conversationId: z.string().optional().describe('Parent conversation ID'),
  teamId: z.string().optional().describe('Team ID'),
  assignees: z
    .array(
      z.object({
        userId: z.string(),
        name: z.string().optional()
      })
    )
    .optional(),
  createdAt: z.number().optional().describe('Creation timestamp')
});

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

    let fields: Record<string, any> = {};
    if (ctx.input.organizationId) fields.organization = ctx.input.organizationId;
    if (ctx.input.teamId) fields.team = ctx.input.teamId;
    if (ctx.input.assignees) fields.assignees = ctx.input.assignees;
    if (ctx.input.dueAt) fields.due_at = ctx.input.dueAt;
    if (ctx.input.state) fields.state = ctx.input.state;
    if (ctx.input.subtask !== undefined) fields.subtask = ctx.input.subtask;
    if (ctx.input.conversationId) fields.conversation = ctx.input.conversationId;
    if (ctx.input.references) fields.references = ctx.input.references;
    if (ctx.input.subject) fields.subject = ctx.input.subject;
    if (ctx.input.addUsers) fields.add_users = ctx.input.addUsers;
    if (ctx.input.addToInbox !== undefined) fields.add_to_inbox = ctx.input.addToInbox;

    if (ctx.input.action === 'create') {
      let data = await client.createTask(fields);
      let t = data.tasks;
      return {
        output: {
          taskId: t.id,
          state: t.state,
          dueAt: t.due_at,
          conversationId: t.conversation?.id,
          teamId: t.team?.id,
          assignees: t.assignees?.map((a: any) => ({ userId: a.id, name: a.name })),
          createdAt: t.created_at
        },
        message: `Created task **${t.id}**.`
      };
    }

    // update
    if (!ctx.input.taskId) throw new Error('taskId is required for updating tasks');
    let data = await client.updateTask(ctx.input.taskId, fields);
    let t = data.tasks;
    return {
      output: {
        taskId: t.id,
        state: t.state,
        dueAt: t.due_at,
        conversationId: t.conversation?.id,
        teamId: t.team?.id,
        assignees: t.assignees?.map((a: any) => ({ userId: a.id, name: a.name })),
        createdAt: t.created_at
      },
      message: `Updated task **${ctx.input.taskId}**.`
    };
  })
  .build();
