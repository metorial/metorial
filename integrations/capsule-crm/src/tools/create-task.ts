import { SlateTool } from 'slates';
import { z } from 'zod';
import { CapsuleClient } from '../lib/client';
import { spec } from '../spec';

export let createTask = SlateTool.create(spec, {
  name: 'Create Task',
  key: 'create_task',
  description: `Create a new task in Capsule CRM. Tasks can be linked to a party, opportunity, or project, and can have a due date and time.`,
  instructions: [
    'A description is required when creating a task.',
    'Optionally link the task to a party, opportunity, or project.'
  ]
})
  .input(
    z.object({
      description: z.string().describe('Task description/title'),
      detail: z.string().optional().describe('Additional details or notes'),
      dueOn: z.string().optional().describe('Due date (YYYY-MM-DD)'),
      dueTime: z.string().optional().describe('Due time (HH:MM:SS)'),
      partyId: z.number().optional().describe('Link to a party by ID'),
      opportunityId: z.number().optional().describe('Link to an opportunity by ID'),
      projectId: z.number().optional().describe('Link to a project by ID'),
      ownerId: z.number().optional().describe('Assign to a user by ID')
    })
  )
  .output(
    z.object({
      taskId: z.number().describe('ID of the created task'),
      description: z.string().describe('Task description'),
      dueOn: z.string().optional().describe('Due date'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CapsuleClient({ token: ctx.auth.token });

    let task: Record<string, any> = {
      description: ctx.input.description
    };

    if (ctx.input.detail) task.detail = ctx.input.detail;
    if (ctx.input.dueOn) task.dueOn = ctx.input.dueOn;
    if (ctx.input.dueTime) task.dueTime = ctx.input.dueTime;
    if (ctx.input.partyId) task.party = { id: ctx.input.partyId };
    if (ctx.input.opportunityId) task.opportunity = { id: ctx.input.opportunityId };
    if (ctx.input.projectId) task.kase = { id: ctx.input.projectId };
    if (ctx.input.ownerId) task.owner = { id: ctx.input.ownerId };

    let result = await client.createTask(task);

    return {
      output: {
        taskId: result.id,
        description: result.description,
        dueOn: result.dueOn,
        createdAt: result.createdAt
      },
      message: `Created task **"${result.description}"** (ID: ${result.id}).`
    };
  })
  .build();
