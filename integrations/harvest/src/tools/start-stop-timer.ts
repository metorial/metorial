import { SlateTool } from 'slates';
import { z } from 'zod';
import { HarvestClient } from '../lib/client';
import { spec } from '../spec';

export let startStopTimer = SlateTool.create(spec, {
  name: 'Start or Stop Timer',
  key: 'start_stop_timer',
  description: `Start or stop a running timer on an existing time entry. Use "restart" to resume tracking time on an entry, and "stop" to pause it.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      timeEntryId: z.number().describe('ID of the time entry to start or stop'),
      action: z.enum(['restart', 'stop']).describe('Whether to restart or stop the timer')
    })
  )
  .output(
    z.object({
      timeEntryId: z.number().describe('ID of the time entry'),
      hours: z.number().describe('Hours currently logged'),
      isRunning: z.boolean().describe('Whether the timer is now running'),
      spentDate: z.string().describe('Date the time was spent'),
      projectName: z.string().optional().describe('Project name'),
      taskName: z.string().optional().describe('Task name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HarvestClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let entry: any;
    if (ctx.input.action === 'restart') {
      entry = await client.restartTimeEntry(ctx.input.timeEntryId);
    } else {
      entry = await client.stopTimeEntry(ctx.input.timeEntryId);
    }

    return {
      output: {
        timeEntryId: entry.id,
        hours: entry.hours,
        isRunning: entry.is_running,
        spentDate: entry.spent_date,
        projectName: entry.project?.name,
        taskName: entry.task?.name
      },
      message:
        ctx.input.action === 'restart'
          ? `Restarted timer on entry **#${entry.id}** (${entry.hours}h so far).`
          : `Stopped timer on entry **#${entry.id}** at ${entry.hours}h.`
    };
  })
  .build();
