import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { actionSchema } from '../lib/schemas';
import { spec } from '../spec';

export let createAction = SlateTool.create(spec, {
  name: 'Create Action',
  key: 'create_action',
  description: `Create a new action (task) for a contact. Actions are completable tasks that appear in the Action Stream, ordered by priority: ASAP first, then by due date, then waiting/queued.`,
  instructions: [
    'Set status to "asap" for urgent tasks, "date" for scheduled tasks, "waiting" for blocked tasks, or "queued" for tasks without a date.',
    'Provide a date in YYYY-MM-DD format when status is "date".'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact this action is for'),
      text: z.string().describe('Description of the action/task'),
      assigneeId: z.string().optional().describe('ID of the user to assign this action to'),
      date: z.string().optional().describe('Due date (YYYY-MM-DD)'),
      exactTime: z.number().optional().describe('Exact due time as Unix timestamp'),
      status: z
        .enum(['asap', 'date', 'waiting', 'queued'])
        .optional()
        .describe('Action priority status')
    })
  )
  .output(actionSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      userId: ctx.auth.userId,
      token: ctx.auth.token
    });

    let action = await client.createAction(ctx.input);

    return {
      output: action,
      message: `Created action **"${action.text}"** (${action.actionId}) for contact ${action.contactId}.`
    };
  })
  .build();
