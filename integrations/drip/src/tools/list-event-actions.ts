import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listEventActions = SlateTool.create(spec, {
  name: 'List Event Actions',
  key: 'list_event_actions',
  description: `List all custom event action names used in the Drip account. Use this to see what events have been tracked and what action names are available for automations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination.'),
      perPage: z.number().optional().describe('Results per page.')
    })
  )
  .output(
    z.object({
      eventActions: z.array(z.string()).describe('List of event action names.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      tokenType: ctx.auth.tokenType
    });

    let result = await client.listEventActions({
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let eventActions = result.event_actions ?? [];

    return {
      output: { eventActions },
      message: `Found **${eventActions.length}** event actions.`
    };
  })
  .build();
