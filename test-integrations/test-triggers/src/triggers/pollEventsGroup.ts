import {
  SlateDefaultPollingIntervalSeconds,
  SlateTriggerGroup
} from 'slates';
import { buildAccountRoutingMatchers } from '../lib/matchers';
import { spec } from '../spec';

export let pollEventsGroup = SlateTriggerGroup.create(spec, {
  key: 'poll_events',
  name: 'Poll Events',
  description:
    'Polls for synthetic time and status events scoped to the authenticated account.'
})
  .polling({
    intervalSeconds: SlateDefaultPollingIntervalSeconds,
    pollEvents: async ctx => {
      let emittedAt = new Date().toISOString();
      let matcherContext = {
        accountId: ctx.auth.accountId,
        workspaceId: ctx.config.workspaceId
      };

      let events: { payload: Record<string, unknown>; idempotencyKey: string }[] = [
        {
          payload: {
            kind: 'time',
            emittedAt,
            ...matcherContext
          },
          idempotencyKey: `time-${emittedAt}`
        }
      ];

      if (!ctx.input.state?.statusEmitted) {
        events.push({
          payload: {
            kind: 'status',
            status: 'ok',
            emittedAt,
            ...matcherContext
          },
          idempotencyKey: `status-${emittedAt}`
        });
      }

      return {
        events,
        updatedState: {
          lastEmittedAt: emittedAt,
          statusEmitted: true
        }
      };
    }
  })
  .routingMatchers(async ctx => buildAccountRoutingMatchers(ctx))
  .build();
