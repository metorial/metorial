import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { actionSchema, contactSchema } from '../lib/schemas';
import { spec } from '../spec';

let actionStreamContactSchema = contactSchema.extend({
  nextAction: actionSchema.optional().describe('The next pending action for this contact')
});

export let getActionStream = SlateTool.create(spec, {
  name: 'Get Action Stream',
  key: 'get_action_stream',
  description: `Get the Action Stream — the list of contacts prioritized by when their next action is due. This is the default view in OnePageCRM. Contacts are ordered: ASAP first, then by due date, then waiting, then queued.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (starts at 1)'),
      perPage: z.number().optional().describe('Results per page (max 100, default 10)')
    })
  )
  .output(
    z.object({
      contacts: z
        .array(actionStreamContactSchema)
        .describe('Contacts with their next actions, ordered by priority'),
      totalCount: z.number().describe('Total number of contacts in the action stream'),
      page: z.number().describe('Current page number'),
      perPage: z.number().describe('Results per page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      userId: ctx.auth.userId,
      token: ctx.auth.token
    });

    let result = await client.getActionStream(ctx.input);

    return {
      output: result,
      message: `Action stream: **${result.totalCount}** contacts with pending actions (page ${result.page}, showing ${result.contacts.length}).`
    };
  })
  .build();
