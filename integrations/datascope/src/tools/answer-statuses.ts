import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listAnswerStatuses = SlateTool.create(spec, {
  name: 'List Answer Statuses',
  key: 'list_answer_statuses',
  description:
    'List configured form answer statuses and their IDs. Use each status key as statusId in change_answer_status. Deleted statuses can still appear in this list.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(z.object({ statuses: z.array(z.any()), count: z.number() }))
  .handleInvocation(async ctx => {
    let statuses = await new Client(ctx.auth).getAnswerStatuses();
    return {
      output: { statuses, count: statuses.length },
      message: `Retrieved **${statuses.length}** answer status(es).`
    };
  })
  .build();

export let changeAnswerStatus = SlateTool.create(spec, {
  name: 'Change Answer Status',
  key: 'change_answer_status',
  description:
    'Change the status of a submitted form answer. Records the change in its history and can fire status webhooks and push notifications. Call list_answer_statuses to discover status IDs.',
  instructions: [
    'Use the form name, not its ID. If several forms share a name, DataScope uses the newest form.',
    'An HTTP 400 with an empty body means the form name, answer code, or status ID may not match the account.'
  ],
  tags: { destructive: false }
})
  .input(
    z.object({
      formName: z.string().describe('Exact form name'),
      formCode: z.string().describe('Code of the submitted form answer'),
      statusId: z.number().describe('Status key from list_answer_statuses')
    })
  )
  .output(z.object({ response: z.any().describe('Unmodified status change response') }))
  .handleInvocation(async ctx => {
    let response = await new Client(ctx.auth).changeAnswerStatus(ctx.input);
    return { output: { response }, message: 'Updated the form answer status.' };
  })
  .build();
