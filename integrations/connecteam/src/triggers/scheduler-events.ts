import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let schedulerEventTypes = [
  'shift_created',
  'shift_updated',
  'shift_deleted',
  'availability_status_created',
  'availability_status_deleted'
] as const;

export let schedulerEvents = SlateTrigger.create(spec, {
  name: 'Scheduler Events',
  key: 'scheduler_events',
  description:
    'Triggers when shifts are created, updated, or deleted, and when availability statuses change. For group shifts assigned to multiple users, each user triggers a separate event.'
})
  .input(
    z.object({
      eventType: z.enum(schedulerEventTypes).describe('Type of scheduler event'),
      eventTimestamp: z.number().describe('Unix timestamp of the event'),
      requestId: z.string().describe('Unique request ID'),
      shiftData: z.any().optional().describe('Shift data (for shift events)'),
      availabilityData: z
        .any()
        .optional()
        .describe('Availability data (for availability events)')
    })
  )
  .output(
    z.object({
      shiftId: z.string().optional().describe('Shift ID'),
      title: z.string().optional().describe('Shift title'),
      assignedUserIds: z.array(z.number()).optional().describe('Assigned user IDs'),
      startTime: z.number().optional().describe('Start time Unix timestamp'),
      endTime: z.number().optional().describe('End time Unix timestamp'),
      timezone: z.string().optional().describe('Timezone'),
      isOpenShift: z.boolean().optional().describe('Whether it is an open shift'),
      isPublished: z.boolean().optional().describe('Whether the shift is published'),
      jobId: z.string().optional().nullable().describe('Associated job ID'),
      availabilityId: z.string().optional().describe('Availability ID'),
      availabilityType: z
        .string()
        .optional()
        .describe('Availability type: available or unavailable'),
      availabilityUserId: z.number().optional().describe('User ID for availability'),
      isAllDay: z.boolean().optional().describe('Whether availability is all day'),
      note: z.string().optional().describe('Availability note')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let eventType = body.eventType as (typeof schedulerEventTypes)[number];
      let data = body.data;

      let isAvailability =
        eventType === 'availability_status_created' ||
        eventType === 'availability_status_deleted';

      return {
        inputs: [
          {
            eventType,
            eventTimestamp: body.eventTimestamp ?? Math.floor(Date.now() / 1000),
            requestId: body.requestId ?? `scheduler_${Date.now()}`,
            shiftData: isAvailability ? undefined : data,
            availabilityData: isAvailability ? data : undefined
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { eventType, requestId, shiftData, availabilityData } = ctx.input;

      let isAvailability =
        eventType === 'availability_status_created' ||
        eventType === 'availability_status_deleted';

      if (isAvailability && availabilityData) {
        return {
          type: `scheduler.${eventType}`,
          id: `${requestId}_${availabilityData.id ?? 'unknown'}`,
          output: {
            availabilityId: availabilityData.id,
            availabilityType: availabilityData.type,
            availabilityUserId: availabilityData.userId,
            startTime: availabilityData.start?.timestamp,
            endTime: availabilityData.end?.timestamp,
            timezone: availabilityData.start?.timezone,
            isAllDay: availabilityData.isAllDay,
            note: availabilityData.note
          }
        };
      }

      return {
        type: `scheduler.${eventType}`,
        id: `${requestId}_${shiftData?.id ?? 'unknown'}`,
        output: {
          shiftId: shiftData?.id,
          title: shiftData?.title,
          assignedUserIds: shiftData?.assignedUserIds,
          startTime: shiftData?.startTime,
          endTime: shiftData?.endTime,
          timezone: shiftData?.timezone,
          isOpenShift: shiftData?.isOpenShift,
          isPublished: shiftData?.isPublished,
          jobId: shiftData?.jobId
        }
      };
    }
  })
  .build();
