import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let _timeActivityEventTypes = [
  'clock_in',
  'clock_out',
  'auto_clock_out',
  'admin_add',
  'admin_edit',
  'admin_delete',
  'admin_approved_add_request',
  'admin_approved_edit_request',
  'admin_approved_delete_request',
  'admin_declined_request',
  'admin_approved_clock_out_outside_geo_fence_request',
  'admin_approved_clock_out_without_nfc_request',
  'auto_approved_add_request',
  'auto_approved_edit_request',
  'auto_approved_delete_request',
  'auto_approved_clock_out_outside_geo_fence_request',
  'auto_approved_clock_out_without_nfc_request'
] as const;

export let timeActivityEvents = SlateTrigger.create(spec, {
  name: 'Time Activity Events',
  key: 'time_activity_events',
  description:
    'Triggers when time clock activities occur: clock in/out, admin additions/edits/deletions, and request approvals. Requires a specific time clock ID for webhook registration.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of time activity event'),
      eventTimestamp: z.number().describe('Unix timestamp of the event'),
      requestId: z.string().describe('Unique request ID'),
      userId: z.number().describe('User ID'),
      timeClockId: z.number().describe('Time clock ID'),
      activityType: z.string().describe('Activity type: shift, manual_break, or time_off'),
      timeActivity: z
        .any()
        .optional()
        .describe('Time activity details (for non-delete events)'),
      timeActivityId: z.string().optional().describe('Time activity ID (for delete events)')
    })
  )
  .output(
    z.object({
      userId: z.number().describe('User ID'),
      timeClockId: z.number().describe('Time clock ID'),
      activityType: z.string().describe('Activity type: shift, manual_break, or time_off'),
      timeActivityId: z.string().optional().describe('Time activity ID'),
      startTimestamp: z.number().optional().describe('Activity start Unix timestamp'),
      startTimezone: z.string().optional().describe('Start timezone'),
      endTimestamp: z.number().optional().describe('Activity end Unix timestamp'),
      endTimezone: z.string().optional().describe('End timezone'),
      jobId: z.string().optional().describe('Associated job ID'),
      schedulerShiftId: z.string().optional().describe('Linked scheduler shift ID'),
      policyTypeId: z.string().optional().describe('Time-off policy type ID'),
      isAllDay: z.boolean().optional().describe('Whether time-off is all day')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let data = body.data;

      return {
        inputs: [
          {
            eventType: body.eventType ?? data?.eventType ?? 'unknown',
            eventTimestamp: body.eventTimestamp ?? Math.floor(Date.now() / 1000),
            requestId: body.requestId ?? `time_activity_${Date.now()}`,
            userId: data?.userId ?? 0,
            timeClockId: data?.timeClockId ?? 0,
            activityType: data?.activityType ?? 'shift',
            timeActivity: data?.timeActivity,
            timeActivityId: data?.timeActivityId
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let {
        eventType,
        requestId,
        userId,
        timeClockId,
        activityType,
        timeActivity,
        timeActivityId
      } = ctx.input;

      let activityId = timeActivity?.id ?? timeActivityId ?? `${requestId}`;

      return {
        type: `time_activity.${eventType}`,
        id: `${requestId}_${activityId}`,
        output: {
          userId,
          timeClockId,
          activityType,
          timeActivityId: activityId,
          startTimestamp: timeActivity?.start?.timestamp,
          startTimezone: timeActivity?.start?.timezone,
          endTimestamp: timeActivity?.end?.timestamp,
          endTimezone: timeActivity?.end?.timezone,
          jobId: timeActivity?.jobId,
          schedulerShiftId: timeActivity?.schedulerShiftId,
          policyTypeId: timeActivity?.policyTypeId,
          isAllDay: timeActivity?.isAllDay
        }
      };
    }
  })
  .build();
