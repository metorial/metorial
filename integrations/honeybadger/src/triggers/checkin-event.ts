import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let checkInEvent = SlateTrigger.create(spec, {
  name: 'Check-In Event',
  key: 'check_in_event',
  description:
    'Triggers when a check-in event occurs — a scheduled task misses its expected check-in, or a previously missing check-in starts reporting again.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('Type of check-in event (check_in_missing, check_in_reporting)'),
      projectId: z.number().describe('Project ID'),
      projectName: z.string().optional().describe('Project name'),
      checkInId: z.number().describe('Check-in ID'),
      checkInName: z.string().optional().describe('Check-in name'),
      checkInSlug: z.string().optional().describe('Check-in slug'),
      checkInUrl: z.string().optional().describe('Check-in URL'),
      checkInScheduleType: z.string().optional().describe('Schedule type'),
      checkInReportPeriod: z.string().optional().describe('Report period'),
      checkInMissedCount: z.number().optional().describe('Number of missed check-ins')
    })
  )
  .output(
    z.object({
      checkInId: z.number().describe('Check-in ID'),
      checkInName: z.string().optional().describe('Check-in name'),
      checkInSlug: z.string().optional().describe('Check-in slug'),
      checkInUrl: z.string().optional().describe('Check-in URL'),
      scheduleType: z.string().optional().describe('Schedule type (simple or cron)'),
      reportPeriod: z.string().optional().describe('Report period'),
      missedCount: z.number().optional().describe('Number of missed check-ins'),
      projectId: z.number().describe('Project ID'),
      projectName: z.string().optional().describe('Project name')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let event = body.event || 'check_in_missing';

      let project = body.project || {};
      let checkIn = body.check_in || {};

      return {
        inputs: [
          {
            eventType: event,
            projectId: project.id,
            projectName: project.name,
            checkInId: checkIn.id,
            checkInName: checkIn.name,
            checkInSlug: checkIn.slug,
            checkInUrl: checkIn.url,
            checkInScheduleType: checkIn.schedule_type,
            checkInReportPeriod: checkIn.report_period,
            checkInMissedCount: checkIn.missed_count
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let {
        eventType,
        checkInId,
        checkInName,
        checkInSlug,
        checkInUrl,
        checkInScheduleType,
        checkInReportPeriod,
        checkInMissedCount,
        projectId,
        projectName
      } = ctx.input;

      return {
        type: `check_in.${eventType.replace('check_in_', '')}`,
        id: `${projectId}-${checkInId}-${eventType}-${Date.now()}`,
        output: {
          checkInId,
          checkInName,
          checkInSlug,
          checkInUrl,
          scheduleType: checkInScheduleType,
          reportPeriod: checkInReportPeriod,
          missedCount: checkInMissedCount,
          projectId,
          projectName
        }
      };
    }
  })
  .build();
