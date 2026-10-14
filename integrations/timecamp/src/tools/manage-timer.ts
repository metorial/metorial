import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, type TimerResponse } from '../lib/client';
import { spec } from '../spec';

export let manageTimer = SlateTool.create(spec, {
  name: 'Manage Timer',
  key: 'manage_timer',
  description: `Control the TimeCamp real-time timer. Check its current status, start tracking time on a task, or stop the running timer. Useful for live time tracking integrations.`,
  instructions: [
    'Use action "status" to check the current timer state.',
    'Use action "start" to begin tracking time, optionally against a specific task.',
    'Use action "stop" to stop the currently running timer.'
  ]
})
  .input(
    z.object({
      action: z.enum(['status', 'start', 'stop']).describe('Timer action to perform'),
      taskId: z
        .number()
        .optional()
        .describe('Task ID to start tracking against (only for "start" action)'),
      timerId: z
        .number()
        .optional()
        .describe(
          'Timer ID to stop (only for "stop" action). If omitted, stops the active timer.'
        )
    })
  )
  .output(
    z.object({
      isRunning: z.boolean().describe('Whether a timer is currently running'),
      timerId: z.string().optional().describe('Timer ID'),
      taskId: z.string().optional().describe('Associated task ID'),
      userId: z.string().optional().describe('User ID'),
      startedAt: z.string().optional().describe('Timer start timestamp'),
      elapsed: z.number().optional().describe('Elapsed seconds'),
      taskName: z.string().optional().describe('Name of the tracked task'),
      entryId: z.string().optional().describe('Time entry ID created or updated by the timer')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    if (ctx.input.action !== 'start' && ctx.input.taskId !== undefined) {
      throw createApiServiceError('taskId is only used with the start action.');
    }
    if (ctx.input.action !== 'stop' && ctx.input.timerId !== undefined) {
      throw createApiServiceError('timerId is only used with the stop action.');
    }
    let result: TimerResponse;

    if (ctx.input.action === 'status') {
      result = await client.getTimerStatus();
    } else if (ctx.input.action === 'start') {
      result = await client.startTimer(ctx.input.taskId);
    } else {
      result = await client.stopTimer(ctx.input.timerId);
    }

    if (!result?.timer) {
      throw createApiServiceError('TimeCamp returned an invalid timer response.');
    }
    let isRunning =
      ctx.input.action === 'start' ? result.timer.id != null : result.timer.isRunning === true;

    return {
      output: {
        isRunning,
        timerId: result.timer.id == null ? undefined : String(result.timer.id),
        taskId: result.task?.id == null ? undefined : String(result.task.id),
        userId: result.timer.userId == null ? undefined : String(result.timer.userId),
        startedAt: result.timer.startedAt ?? undefined,
        elapsed: result.timer.elapsed ?? undefined,
        taskName: result.task?.name ?? undefined,
        entryId: result.entry?.id == null ? undefined : String(result.entry.id)
      },
      message:
        ctx.input.action === 'start'
          ? `Timer **started**${ctx.input.taskId ? ` for task ${ctx.input.taskId}` : ''}.`
          : ctx.input.action === 'stop'
            ? 'Timer **stopped**.'
            : `Timer status: ${isRunning ? '**running**' : '**stopped**'}.`
    };
  })
  .build();
