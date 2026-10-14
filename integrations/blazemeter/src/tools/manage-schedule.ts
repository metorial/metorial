import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { BlazeMeterClient } from '../lib/client';
import { spec } from '../spec';

export let manageSchedule = SlateTool.create(spec, {
  name: 'Manage Test Schedule',
  key: 'manage_schedule',
  description: `List, create, or delete schedules for performance tests. Schedules allow tests to run automatically at specified times or intervals using cron expressions.`,
  instructions: [
    'Use "list" with **testId** to see existing schedules.',
    'Use "create" with **testId** and a **cronExpression**. BlazeMeter calculates the next run time.',
    'Use "delete" with **testId** and the **scheduleKey** returned by list/create to remove a schedule.'
  ]
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'delete']).describe('Operation to perform'),
      testId: z.number().describe('Performance test ID'),
      scheduleId: z
        .number()
        .optional()
        .describe('Legacy numeric schedule ID; prefer scheduleKey'),
      scheduleKey: z
        .string()
        .optional()
        .describe(
          'String schedule ID returned by list/create; required for delete unless scheduleId is supplied. If both are supplied, they must identify the same schedule.'
        ),
      cronExpression: z
        .string()
        .optional()
        .describe('Cron expression for recurring schedules'),
      nextRun: z
        .string()
        .optional()
        .describe('Legacy field; BlazeMeter calculates nextRun from cronExpression'),
      enabled: z.boolean().optional().describe('Whether the schedule is active')
    })
  )
  .output(
    z.object({
      schedules: z
        .array(
          z.object({
            scheduleId: z
              .number()
              .optional()
              .describe('Legacy numeric schedule ID when available'),
            scheduleKey: z.string().describe('Provider schedule ID to use when deleting'),
            cronExpression: z.string().optional().describe('Cron expression'),
            nextRun: z.string().optional().describe('Next scheduled run time'),
            enabled: z.boolean().optional().describe('Whether the schedule is active')
          })
        )
        .optional()
        .describe('List of schedules'),
      scheduleId: z.number().optional().describe('Legacy numeric schedule ID when available'),
      scheduleKey: z.string().optional().describe('Created/deleted provider schedule ID'),
      deleted: z.boolean().optional().describe('Whether the schedule was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BlazeMeterClient({
      token: ctx.auth.token,
      apiKeyId: ctx.auth.apiKeyId,
      apiKeySecret: ctx.auth.apiKeySecret,
      runscopeToken: ctx.auth.runscopeToken
    });

    if (ctx.input.action === 'list') {
      let schedules = await client.listSchedules(ctx.input.testId);
      let mapped = schedules.map((s: any) => ({
        scheduleId: typeof s.id === 'number' ? s.id : undefined,
        scheduleKey: String(s.id),
        cronExpression: s.cron,
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
        output: {
          scheduleId: typeof schedule.id === 'number' ? schedule.id : undefined,
          scheduleKey: String(schedule.id)
        },
        message: `Created schedule (ID: ${schedule.id}) for test ${ctx.input.testId}.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (
        ctx.input.scheduleKey !== undefined &&
        ctx.input.scheduleId !== undefined &&
        ctx.input.scheduleKey !== String(ctx.input.scheduleId)
      ) {
        throw createApiServiceError(
          'scheduleKey and scheduleId must identify the same schedule. Provide only the identifier returned by list/create.',
          { reason: 'invalid_input' }
        );
      }
      let scheduleId = ctx.input.scheduleId ?? ctx.input.scheduleKey;
      if (scheduleId === undefined || (typeof scheduleId === 'string' && !scheduleId.trim()))
        throw createApiServiceError(
          'scheduleKey or scheduleId is required for deleting a schedule'
        );
      await client.deleteSchedule(scheduleId);
      return {
        output: {
          scheduleId: typeof scheduleId === 'number' ? scheduleId : undefined,
          scheduleKey: String(scheduleId),
          deleted: true
        },
        message: `Deleted schedule **${scheduleId}** from test ${ctx.input.testId}.`
      };
    }

    throw createApiServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
