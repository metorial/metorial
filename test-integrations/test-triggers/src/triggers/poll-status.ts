import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import { pollEventsGroup } from './pollEventsGroup';

let pollStatusEvent = z.object({
  kind: z.literal('status'),
  status: z.string(),
  emittedAt: z.string(),
  accountId: z.string(),
  workspaceId: z.string()
});

export let pollStatus = SlateTrigger.create(spec, {
  key: 'poll_status',
  name: 'Poll Status',
  description: 'Emits a status snapshot on the first polling run for an install.'
})
  .triggerGroup(pollEventsGroup)
  .input(pollStatusEvent)
  .output(
    z.object({
      status: z.string(),
      emittedAt: z.string(),
      accountId: z.string(),
      workspaceId: z.string()
    })
  )
  .matches(payload => {
    let event = payload as { kind?: unknown };
    return !!event && event.kind === 'status';
  })
  .map(async ctx => ({
    type: 'test.poll.status',
    id: `poll-status-${Date.parse(ctx.input.emittedAt)}`,
    output: {
      status: ctx.input.status,
      emittedAt: ctx.input.emittedAt,
      accountId: ctx.input.accountId,
      workspaceId: ctx.input.workspaceId
    }
  }))
  .build();
