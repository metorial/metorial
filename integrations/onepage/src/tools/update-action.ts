import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { actionSchema } from '../lib/schemas';
import { spec } from '../spec';

export let updateAction = SlateTool.create(spec, {
  name: 'Update Action',
  key: 'update_action',
  description: `Update an existing action, or mark it as complete/incomplete. Use this to change the action text, due date, status, or completion state.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      actionId: z.string().describe('ID of the action to update'),
      text: z.string().optional().describe('Updated action description'),
      assigneeId: z.string().optional().describe('ID of the user to assign this action to'),
      date: z.string().optional().describe('Due date (YYYY-MM-DD)'),
      exactTime: z.number().optional().describe('Exact due time as Unix timestamp'),
      status: z
        .enum(['asap', 'date', 'waiting', 'queued'])
        .optional()
        .describe('Action priority status'),
      done: z
        .boolean()
        .optional()
        .describe('Set to true to complete or false to reopen the action')
    })
  )
  .output(actionSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      userId: ctx.auth.userId,
      token: ctx.auth.token
    });

    let { actionId, done, ...updateData } = ctx.input;
    let action: any;

    if (done === true) {
      action = await client.completeAction(actionId);
    } else if (done === false) {
      action = await client.uncompleteAction(actionId);
    } else {
      action = await client.updateAction(actionId, updateData);
    }

    return {
      output: action,
      message:
        done === true
          ? `Completed action **"${action.text}"** (${action.actionId}).`
          : done === false
            ? `Reopened action **"${action.text}"** (${action.actionId}).`
            : `Updated action **"${action.text}"** (${action.actionId}).`
    };
  })
  .build();
