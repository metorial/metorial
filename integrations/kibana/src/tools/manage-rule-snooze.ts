import { SlateTool } from 'slates';
import { z } from 'zod';
import { kibanaServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let recurringScheduleSchema = z.object({
  every: z.string().optional().describe('Recurring interval, such as "1w" or "15d"'),
  occurrences: z.number().optional().describe('Number of recurrences'),
  end: z.string().optional().describe('ISO timestamp when recurrence ends'),
  onWeekDay: z
    .array(z.string())
    .optional()
    .describe('Weekday recurrence values such as ["MO"]'),
  onMonth: z.array(z.number()).optional().describe('Months for a recurring schedule'),
  onMonthDay: z
    .array(z.number())
    .optional()
    .describe('Days of the month for a recurring schedule')
});

let customSnoozeScheduleSchema = z.object({
  duration: z.string().describe('Snooze duration, such as "1h" or "30m"'),
  start: z.string().describe('ISO timestamp when the snooze starts'),
  timezone: z.string().optional().describe('IANA timezone for the schedule'),
  recurring: recurringScheduleSchema.optional().describe('Optional recurring schedule')
});

let snoozeScheduleSchema = z.object({
  custom: customSnoozeScheduleSchema.describe('Custom snooze schedule')
});

export let manageRuleSnooze = SlateTool.create(spec, {
  name: 'Manage Rule Snooze',
  key: 'manage_rule_snooze',
  description: `Schedule or delete a Kibana alerting rule snooze schedule. Snooze schedules temporarily suppress rule notifications during maintenance windows or planned downtime.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['schedule', 'delete']).describe('Action to perform'),
      ruleId: z.string().describe('ID of the rule'),
      scheduleId: z.string().optional().describe('Snooze schedule ID. Required for delete.'),
      schedule: snoozeScheduleSchema
        .optional()
        .describe('Snooze schedule. Required for schedule.')
    })
  )
  .output(
    z.object({
      ruleId: z.string().describe('Rule ID'),
      scheduleId: z.string().optional().describe('Snooze schedule ID'),
      schedule: z.record(z.string(), z.any()).optional().describe('Created schedule details'),
      deleted: z.boolean().optional().describe('Whether a snooze schedule was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { action, ruleId, scheduleId, schedule } = ctx.input;

    if (action === 'schedule') {
      if (!schedule) {
        throw kibanaServiceError('schedule is required for schedule action');
      }

      let result = await client.scheduleRuleSnooze(ruleId, schedule);
      let createdSchedule = result.schedule ?? result;
      return {
        output: {
          ruleId,
          scheduleId: createdSchedule.id,
          schedule: createdSchedule
        },
        message: `Scheduled snooze for rule \`${ruleId}\`.`
      };
    }

    if (action === 'delete') {
      if (!scheduleId) {
        throw kibanaServiceError('scheduleId is required for delete action');
      }

      await client.deleteRuleSnooze(ruleId, scheduleId);
      return {
        output: {
          ruleId,
          scheduleId,
          deleted: true
        },
        message: `Deleted snooze schedule \`${scheduleId}\` for rule \`${ruleId}\`.`
      };
    }

    throw kibanaServiceError(`Unknown action: ${action}`);
  })
  .build();
