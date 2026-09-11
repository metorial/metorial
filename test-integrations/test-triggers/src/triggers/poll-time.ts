import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import { pollEventsGroup } from './pollEventsGroup';

let pollTimeEvent = z.object({
  kind: z.literal('time'),
  emittedAt: z.string(),
  accountId: z.string(),
  workspaceId: z.string()
});

export let pollTime = SlateTrigger.create(spec, {
  key: 'poll_time',
  name: 'Poll Time',
  description: 'Emits the current time on each polling run.'
})
  .triggerGroup(pollEventsGroup)
  .input(pollTimeEvent)
  .output(
    z.object({
      message: z.string(),
      emittedAt: z.string(),
      timestampMs: z.number(),
      accountId: z.string(),
      workspaceId: z.string()
    })
  )
  .matches(payload => {
    let event = payload as { kind?: unknown };
    return !!event && event.kind === 'time';
  })
  .map(async ctx => ({
    type: 'test.poll.time',
    id: `poll-time-${Date.parse(ctx.input.emittedAt)}`,
    output: {
      message: 'Polling trigger emitted the current time.',
      emittedAt: ctx.input.emittedAt,
      timestampMs: Date.parse(ctx.input.emittedAt),
      accountId: ctx.input.accountId,
      workspaceId: ctx.input.workspaceId
    }
  }))
  .build();
