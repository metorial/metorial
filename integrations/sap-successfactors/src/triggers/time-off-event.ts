import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let timeOffEvent = SlateTrigger.create(spec, {
  name: 'Time Off Event',
  key: 'time_off_event',
  description:
    'Triggered when employee time-off or absence requests are submitted or changed. Configure in SuccessFactors Integration Center using Intelligent Services as the trigger type with REST/JSON destination.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'The type of time-off event (e.g., "submitted", "approved", "rejected", "cancelled")'
        ),
      eventId: z.string().describe('Unique identifier for the event'),
      userId: z.string().describe('The employee user ID who requested time off'),
      rawPayload: z
        .record(z.string(), z.unknown())
        .describe('Full event payload from SuccessFactors')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('The employee user ID'),
      employeeName: z.string().optional().describe('Employee name if available'),
      timeType: z
        .string()
        .optional()
        .describe('Type of time off (e.g., vacation, sick leave)'),
      startDate: z.string().optional().describe('Start date of the time-off period'),
      endDate: z.string().optional().describe('End date of the time-off period'),
      quantityInDays: z.number().optional().describe('Number of days requested'),
      approvalStatus: z.string().optional().describe('Current approval status')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, unknown>;

      let eventType = resolveTimeOffEventType(data);
      let userId =
        extractStringField(data, ['userId', 'user_id', 'personIdExternal']) || 'unknown';
      let eventId =
        extractStringField(data, ['eventId', 'event_id', 'externalEventId']) ||
        `timeoff_${userId}_${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId,
            userId,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { rawPayload } = ctx.input;

      let employeeName = extractStringField(rawPayload, [
        'defaultFullName',
        'fullName',
        'employeeName'
      ]);
      let timeType = extractStringField(rawPayload, ['timeType', 'time_type', 'absenceType']);
      let startDate = extractStringField(rawPayload, ['startDate', 'start_date']);
      let endDate = extractStringField(rawPayload, ['endDate', 'end_date']);
      let approvalStatus = extractStringField(rawPayload, [
        'approvalStatus',
        'approval_status',
        'status'
      ]);

      let quantityInDays: number | undefined;
      let daysValue =
        rawPayload.quantityInDays ?? rawPayload.quantity_in_days ?? rawPayload.duration;
      if (typeof daysValue === 'number') {
        quantityInDays = daysValue;
      } else if (typeof daysValue === 'string') {
        let parsed = Number.parseFloat(daysValue);
        if (!Number.isNaN(parsed)) quantityInDays = parsed;
      }

      return {
        type: `time_off.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          userId: ctx.input.userId,
          employeeName,
          timeType,
          startDate,
          endDate,
          quantityInDays,
          approvalStatus
        }
      };
    }
  })
  .build();

let resolveTimeOffEventType = (data: Record<string, unknown>): string => {
  let eventType = extractStringField(data, ['eventType', 'event_type', 'eventName', 'type']);

  if (eventType) {
    let normalized = eventType.toLowerCase();
    if (normalized.includes('submit')) return 'submitted';
    if (normalized.includes('approv')) return 'approved';
    if (normalized.includes('reject')) return 'rejected';
    if (normalized.includes('cancel')) return 'cancelled';
    return normalized.replace(/\s+/g, '_');
  }

  return 'changed';
};

let extractStringField = (
  data: Record<string, unknown>,
  keys: string[]
): string | undefined => {
  for (let key of keys) {
    let value = data[key];
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return undefined;
};
