import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      taskName: z.string().optional().describe('Name of the tracked task')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result: any;

    if (ctx.input.action === 'status') {
      result = await client.getTimerStatus();
    } else if (ctx.input.action === 'start') {
      result = await client.startTimer(ctx.input.taskId);
    } else {
      result = await client.stopTimer(ctx.input.timerId);
    }

    let isRunning =
      result?.isTimerRunning === true ||
      result?.isTimerRunning === 1 ||
      result?.isTimerRunning === '1';

    return {
      output: {
        isRunning,
        timerId: result?.timer_id ? String(result.timer_id) : undefined,
        taskId: result?.task_id ? String(result.task_id) : undefined,
        userId: result?.user_id ? String(result.user_id) : undefined,
        startedAt: result?.started_at || undefined,
        elapsed: result?.elapsed !== undefined ? Number(result.elapsed) : undefined,
        taskName: result?.name || undefined
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
