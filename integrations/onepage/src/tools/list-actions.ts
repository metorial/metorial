import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { actionSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listActions = SlateTool.create(spec, {
  name: 'List Actions',
  key: 'list_actions',
  description: `List actions (tasks) in OnePageCRM. Filter by contact or assignee. Actions are ordered by priority: ASAP first, then dated actions by due date, then waiting, then queued.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactId: z.string().optional().describe('Filter actions by contact ID'),
      assigneeId: z.string().optional().describe('Filter actions by assignee user ID'),
      status: z
        .enum(['asap', 'date', 'waiting', 'queued', 'done'])
        .optional()
        .describe('Filter by action status'),
      page: z.number().optional().describe('Page number (starts at 1)'),
      perPage: z.number().optional().describe('Results per page (max 100, default 10)')
    })
  )
  .output(
    z.object({
      actions: z.array(actionSchema).describe('List of actions'),
      totalCount: z.number().describe('Total number of matching actions'),
      page: z.number().describe('Current page number'),
      perPage: z.number().describe('Results per page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      userId: ctx.auth.userId,
      token: ctx.auth.token
    });

    let result = await client.listActions(ctx.input);

    return {
      output: result,
      message: `Found **${result.totalCount}** actions (page ${result.page}, showing ${result.actions.length}).`
    };
  })
  .build();
