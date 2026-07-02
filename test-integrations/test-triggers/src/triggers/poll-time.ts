import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let pollTime = SlateTrigger.create(spec, {
  key: 'poll_time',
  name: 'Poll Time',
  description: 'Emits the current time as an event on each polling run.'
})
  .input(
    z.object({
      emittedAt: z.string()
    })
  )
  .output(
    z.object({
      message: z.string(),
      emittedAt: z.string(),
      timestampMs: z.number()
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async () => {
      let emittedAt = new Date().toISOString();

      return {
        inputs: [{ emittedAt }],
        updatedState: {
          lastEmittedAt: emittedAt
        }
      };
    },

    handleEvent: async ctx => ({
      type: 'test.poll.time',
      id: `poll-time-${Date.parse(ctx.input.emittedAt)}`,
      output: {
        message: 'Polling trigger emitted the current time.',
        emittedAt: ctx.input.emittedAt,
        timestampMs: Date.parse(ctx.input.emittedAt)
      }
    })
  })
  .build();
