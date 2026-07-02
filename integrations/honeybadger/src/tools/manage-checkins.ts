import { SlateTool } from 'slates';
import { z } from 'zod';
import { HoneybadgerClient } from '../lib/client';
import { spec } from '../spec';

let checkInSchema = z.object({
  checkInId: z.string().describe('Check-in ID'),
  name: z.string().optional().describe('Check-in name'),
  slug: z.string().optional().describe('URL-friendly identifier'),
  url: z.string().optional().describe('Ping URL'),
  state: z.string().optional().describe('Current state'),
  scheduleType: z.string().optional().describe('Schedule type (simple or cron)'),
  reportPeriod: z.string().optional().describe('Report period (simple schedules)'),
  gracePeriod: z.string().optional().describe('Grace period before alerting'),
  cronSchedule: z.string().optional().describe('Cron expression (cron schedules)'),
  cronTimezone: z.string().optional().describe('Timezone for cron schedule'),
  reportedAt: z.string().optional().describe('Last check-in time'),
  expectedAt: z.string().optional().describe('Next expected check-in time'),
  missedCount: z.number().optional().describe('Number of missed check-ins')
});

export let manageCheckIns = SlateTool.create(spec, {
  name: 'Manage Check-Ins',
  key: 'manage_check_ins',
  description: `Create, update, list, get, or delete check-ins (dead-man-switch monitors) in a Honeybadger project. Check-ins monitor scheduled tasks and cron jobs by expecting periodic pings. If a ping is missed, an alert is triggered.`,
  instructions: [
    'For simple schedules, set `scheduleType` to "simple" and provide `reportPeriod` (e.g., "1 hour", "5 minutes").',
    'For cron schedules, set `scheduleType` to "cron" and provide `cronSchedule` (e.g., "30 * * * *").',
    'The `scheduleType` cannot be changed after creation.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      projectId: z.string().describe('Project ID'),
      checkInId: z
        .string()
        .optional()
        .describe('Check-in ID (required for get, update, delete)'),
      name: z.string().optional().describe('Check-in name (required for create)'),
      slug: z.string().optional().describe('URL-friendly slug'),
      scheduleType: z
        .enum(['simple', 'cron'])
        .optional()
        .describe('Schedule type (required for create)'),
      reportPeriod: z
        .string()
        .optional()
        .describe('Report period for simple schedules (e.g., "1 hour", "5 minutes")'),
      gracePeriod: z
        .string()
        .optional()
        .describe('Grace period before alerting (e.g., "5 minutes")'),
      cronSchedule: z.string().optional().describe('Cron expression for cron schedules'),
      cronTimezone: z.string().optional().describe('Timezone for cron schedule (default: UTC)')
    })
  )
  .output(
    z.object({
      checkIns: z.array(checkInSchema).optional().describe('List of check-ins'),
      checkIn: checkInSchema.optional().describe('Check-in details'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HoneybadgerClient({ token: ctx.auth.token });
    let {
      action,
      projectId,
      checkInId,
      name,
      slug,
      scheduleType,
      reportPeriod,
      gracePeriod,
      cronSchedule,
      cronTimezone
    } = ctx.input;

    let mapCheckIn = (c: any) => ({
      checkInId: String(c.id),
      name: c.name,
      slug: c.slug,
      url: c.url,
      state: c.state,
      scheduleType: c.schedule_type,
      reportPeriod: c.report_period,
      gracePeriod: c.grace_period,
      cronSchedule: c.cron_schedule,
      cronTimezone: c.cron_timezone,
      reportedAt: c.reported_at,
      expectedAt: c.expected_at,
      missedCount: c.missed_count
    });

    switch (action) {
      case 'list': {
        let data = await client.listCheckIns(projectId);
        let checkIns = (data.results || []).map(mapCheckIn);
        return {
          output: { checkIns, success: true },
          message: `Found **${checkIns.length}** check-in(s).`
        };
      }

      case 'get': {
        if (!checkInId) throw new Error('checkInId is required for get action');
        let checkIn = await client.getCheckIn(projectId, checkInId);
        return {
          output: { checkIn: mapCheckIn(checkIn), success: true },
          message: `Check-in **${checkIn.name}** is **${checkIn.state || 'unknown'}**.`
        };
      }

      case 'create': {
        if (!name || !scheduleType)
          throw new Error('name and scheduleType are required for create action');
        let created = await client.createCheckIn(projectId, {
          name,
          slug,
          scheduleType,
          reportPeriod,
          gracePeriod,
          cronSchedule,
          cronTimezone
        });
        return {
          output: { checkIn: mapCheckIn(created), success: true },
          message: `Created check-in **${created.name}** (${created.schedule_type}).`
        };
      }

      case 'update': {
        if (!checkInId) throw new Error('checkInId is required for update action');
        await client.updateCheckIn(projectId, checkInId, {
          name,
          reportPeriod,
          gracePeriod,
          cronSchedule,
          cronTimezone
        });
        return {
          output: { success: true },
          message: `Updated check-in **${checkInId}**.`
        };
      }

      case 'delete': {
        if (!checkInId) throw new Error('checkInId is required for delete action');
        await client.deleteCheckIn(projectId, checkInId);
        return {
          output: { success: true },
          message: `Deleted check-in **${checkInId}**.`
        };
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  })
  .build();
