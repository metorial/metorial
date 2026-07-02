import { SlateTool } from 'slates';
import { z } from 'zod';
import { EverhourClient } from '../lib/client';
import { spec } from '../spec';

let timerSchema = z.object({
  status: z.string().describe('Timer status: active or stopped'),
  durationSeconds: z.number().optional().describe('Current timer duration in seconds'),
  todaySeconds: z.number().optional().describe('Total time tracked today in seconds'),
  startedAt: z.string().optional().describe('When the timer was started'),
  userDate: z.string().optional().describe('User date for the timer'),
  comment: z.string().optional().describe('Timer comment'),
  taskId: z.string().optional().describe('Task ID the timer is running on'),
  taskName: z.string().optional().describe('Task name'),
  userId: z.number().optional().describe('User running the timer'),
  userName: z.string().optional().describe('Name of the user')
});

export let startTimer = SlateTool.create(spec, {
  name: 'Start Timer',
  key: 'start_timer',
  description: `Start a time tracking timer on a task. Any running timer will be stopped and its time saved before the new one starts.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      taskId: z.string().describe('Task ID to start tracking time on'),
      userDate: z
        .string()
        .optional()
        .describe('Date to record the time for (YYYY-MM-DD, defaults to today)'),
      comment: z.string().optional().describe('Optional comment for the timer')
    })
  )
  .output(timerSchema)
  .handleInvocation(async ctx => {
    let client = new EverhourClient(ctx.auth.token);
    let result = await client.startTimer({
      task: ctx.input.taskId,
      userDate: ctx.input.userDate,
      comment: ctx.input.comment
    });
    return {
      output: {
        status: result.status,
        durationSeconds: result.duration,
        todaySeconds: result.today,
        startedAt: result.startedAt,
        userDate: result.userDate,
        comment: result.comment,
        taskId: result.task?.id,
        taskName: result.task?.name,
        userId: result.user?.id,
        userName: result.user?.name
      },
      message: `Started timer on task **${result.task?.name || ctx.input.taskId}**.`
    };
  });

export let stopTimer = SlateTool.create(spec, {
  name: 'Stop Timer',
  key: 'stop_timer',
  description: `Stop the currently running timer for the authenticated user. The tracked time is saved to the associated task.`,
  tags: { destructive: false }
})
  .input(z.object({}))
  .output(timerSchema)
  .handleInvocation(async ctx => {
    let client = new EverhourClient(ctx.auth.token);
    let result = await client.stopTimer();
    return {
      output: {
        status: result.status,
        durationSeconds: result.duration,
        todaySeconds: result.today,
        startedAt: result.startedAt,
        userDate: result.userDate,
        comment: result.comment,
        taskId: result.task?.id,
        taskName: result.task?.name,
        userId: result.user?.id,
        userName: result.user?.name
      },
      message: `Stopped timer. Tracked **${Math.round((result.duration || 0) / 60)} minutes**.`
    };
  });

export let getRunningTimers = SlateTool.create(spec, {
  name: 'Get Running Timers',
  key: 'get_running_timers',
  description: `Get the currently running timer for the authenticated user, or view all active timers across the team.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      teamWide: z
        .boolean()
        .optional()
        .describe(
          "If true, list all active timers across the team. Otherwise, only the current user's timer."
        )
    })
  )
  .output(
    z.object({
      timers: z.array(timerSchema).describe('List of active timers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EverhourClient(ctx.auth.token);

    if (ctx.input.teamWide) {
      let timers = await client.getTeamTimers();
      let mapped = (Array.isArray(timers) ? timers : []).map((t: any) => ({
        status: t.status || 'active',
        durationSeconds: t.duration,
        todaySeconds: t.today,
        startedAt: t.startedAt,
        userDate: t.userDate,
        comment: t.comment,
        taskId: t.task?.id,
        taskName: t.task?.name,
        userId: t.user?.id,
        userName: t.user?.name
      }));
      return {
        output: { timers: mapped },
        message: `Found **${mapped.length}** active timer(s) across the team.`
      };
    }

    let timer = await client.getCurrentTimer();
    if (!timer?.status) {
      return {
        output: { timers: [] },
        message: `No active timer running.`
      };
    }

    return {
      output: {
        timers: [
          {
            status: timer.status,
            durationSeconds: timer.duration,
            todaySeconds: timer.today,
            startedAt: timer.startedAt,
            userDate: timer.userDate,
            comment: timer.comment,
            taskId: timer.task?.id,
            taskName: timer.task?.name,
            userId: timer.user?.id,
            userName: timer.user?.name
          }
        ]
      },
      message: `Timer is **${timer.status}** on task **${timer.task?.name || 'unknown'}**.`
    };
  });
