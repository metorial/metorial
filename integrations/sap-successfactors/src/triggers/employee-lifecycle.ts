import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let employeeLifecycle = SlateTrigger.create(spec, {
  name: 'Employee Lifecycle',
  key: 'employee_lifecycle',
  description:
    'Triggered by employee lifecycle events including hire, termination, job transfer, manager change, and location change. Configure in SuccessFactors Integration Center using Intelligent Services as the trigger type with REST/JSON destination.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'The type of lifecycle event (e.g., "hire", "termination", "jobTransfer", "managerChange", "locationChange")'
        ),
      eventId: z.string().describe('Unique identifier for the event'),
      userId: z.string().describe('The employee user ID affected by the event'),
      effectiveDate: z.string().optional().describe('Effective date of the change'),
      rawPayload: z
        .record(z.string(), z.unknown())
        .describe('Full event payload from SuccessFactors')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('The employee user ID affected'),
      employeeName: z.string().optional().describe('Full name of the employee if available'),
      effectiveDate: z.string().optional().describe('Effective date of the change'),
      previousValues: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Previous values before the change'),
      newValues: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('New values after the change')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, unknown>;

      let eventType = resolveLifecycleEventType(data);
      let userId = extractStringField(data, [
        'userId',
        'personIdExternal',
        'user_id',
        'personId'
      ]);
      let eventId =
        extractStringField(data, ['eventId', 'event_id', 'externalEventId']) ||
        `${eventType}_${userId}_${Date.now()}`;
      let effectiveDate = extractStringField(data, [
        'effectiveDate',
        'effective_date',
        'startDate'
      ]);

      return {
        inputs: [
          {
            eventType,
            eventId,
            userId: userId || 'unknown',
            effectiveDate,
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
        'employeeName',
        'name'
      ]);
      let previousValues = extractObjectField(rawPayload, [
        'previousValues',
        'old_values',
        'prior'
      ]);
      let newValues = extractObjectField(rawPayload, ['newValues', 'new_values', 'current']);

      return {
        type: `employee.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          userId: ctx.input.userId,
          employeeName,
          effectiveDate: ctx.input.effectiveDate,
          previousValues,
          newValues
        }
      };
    }
  })
  .build();

let resolveLifecycleEventType = (data: Record<string, unknown>): string => {
  let eventType = extractStringField(data, ['eventType', 'event_type', 'eventName', 'type']);

  if (eventType) {
    let normalized = eventType.toLowerCase();
    if (normalized.includes('hire') || normalized.includes('new_hire')) return 'hire';
    if (normalized.includes('terminat')) return 'termination';
    if (
      normalized.includes('transfer') ||
      normalized.includes('job_change') ||
      normalized.includes('jobchange')
    )
      return 'job_transfer';
    if (normalized.includes('manager')) return 'manager_change';
    if (normalized.includes('location')) return 'location_change';
    return normalized.replace(/\s+/g, '_');
  }

  return 'unknown';
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

let extractObjectField = (
  data: Record<string, unknown>,
  keys: string[]
): Record<string, unknown> | undefined => {
  for (let key of keys) {
    let value = data[key];
    if (value && typeof value === 'object' && !Array.isArray(value))
      return value as Record<string, unknown>;
  }
  return undefined;
};
