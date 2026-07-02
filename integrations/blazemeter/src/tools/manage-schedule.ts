import { SlateTool } from 'slates';
import { z } from 'zod';
import { BlazeMeterClient } from '../lib/client';
import { spec } from '../spec';

export let manageSchedule = SlateTool.create(spec, {
  name: 'Manage Test Schedule',
  key: 'manage_schedule',
  description: `List, create, or delete schedules for performance tests. Schedules allow tests to run automatically at specified times or intervals using cron expressions.`,
  instructions: [
    'Use "list" with **testId** to see existing schedules.',
    'Use "create" with **testId** and a **cronExpression** or **nextRun** time.',
    'Use "delete" with **testId** and **scheduleId** to remove a schedule.'
  ]
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'delete']).describe('Operation to perform'),
      testId: z.number().describe('Performance test ID'),
      scheduleId: z.number().optional().describe('Schedule ID (required for delete)'),
      cronExpression: z
        .string()
        .optional()
        .describe('Cron expression for recurring schedules'),
      nextRun: z.string().optional().describe('ISO timestamp for the next run'),
      enabled: z.boolean().optional().describe('Whether the schedule is active')
    })
  )
  .output(
    z.object({
      schedules: z
        .array(
          z.object({
            scheduleId: z.number().describe('Schedule ID'),
            cronExpression: z.string().optional().describe('Cron expression'),
            nextRun: z.string().optional().describe('Next scheduled run time'),
            enabled: z.boolean().optional().describe('Whether the schedule is active')
          })
        )
        .optional()
        .describe('List of schedules'),
      scheduleId: z.number().optional().describe('Created/deleted schedule ID'),
      deleted: z.boolean().optional().describe('Whether the schedule was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BlazeMeterClient({
      token: ctx.auth.token,
      apiKeyId: ctx.auth.apiKeyId,
      apiKeySecret: ctx.auth.apiKeySecret
    });

    if (ctx.input.action === 'list') {
      let schedules = await client.listSchedules(ctx.input.testId);
      let mapped = schedules.map((s: any) => ({
        scheduleId: s.id,
        cronExpression: s.cronExpression,
        nextRun: s.nextRun ? String(s.nextRun) : undefined,
        enabled: s.enabled
      }));
      return {
        output: { schedules: mapped },
        message: `Found **${mapped.length}** schedule(s) for test ${ctx.input.testId}.`
      };
    }

    if (ctx.input.action === 'create') {
      let schedule = await client.createSchedule(ctx.input.testId, {
        cronExpression: ctx.input.cronExpression,
        nextRun: ctx.input.nextRun,
        enabled: ctx.input.enabled
      });
      return {
        output: { scheduleId: schedule.id },
        message: `Created schedule (ID: ${schedule.id}) for test ${ctx.input.testId}.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.scheduleId)
        throw new Error('scheduleId is required for deleting a schedule');
      await client.deleteSchedule(ctx.input.testId, ctx.input.scheduleId);
      return {
        output: { scheduleId: ctx.input.scheduleId, deleted: true },
        message: `Deleted schedule **${ctx.input.scheduleId}** from test ${ctx.input.testId}.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
