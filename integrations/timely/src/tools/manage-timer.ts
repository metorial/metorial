import { SlateTool } from 'slates';
import { z } from 'zod';
import { TimelyClient } from '../lib/client';
import { spec } from '../spec';

export let manageTimer = SlateTool.create(spec, {
  name: 'Manage Timer',
  key: 'manage_timer',
  description: `Start or stop a timer on an existing time entry for real-time time tracking. Use **start** to begin tracking and **stop** to end it.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      eventId: z.string().describe('ID of the time entry'),
      action: z.enum(['start', 'stop']).describe('Whether to start or stop the timer')
    })
  )
  .output(
    z.object({
      eventId: z.number().describe('Time entry ID'),
      timerState: z.string().nullable().describe('Current timer state after action'),
      durationFormatted: z.string().optional().describe('Current duration')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TimelyClient({
      accountId: ctx.config.accountId,
      token: ctx.auth.token
    });

    let event =
      ctx.input.action === 'start'
        ? await client.startTimer(ctx.input.eventId)
        : await client.stopTimer(ctx.input.eventId);

    return {
      output: {
        eventId: event.id,
        timerState: event.timer_state ?? null,
        durationFormatted: event.duration?.formatted
      },
      message: `Timer **${ctx.input.action === 'start' ? 'started' : 'stopped'}** on entry **#${event.id}** — ${event.duration?.formatted ?? '0:00'}.`
    };
  })
  .build();
