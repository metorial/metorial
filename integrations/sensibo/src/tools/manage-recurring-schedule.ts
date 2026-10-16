import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { checked, deviceIdSchema, SensiboClient } from '../lib/client';
import { validateAcState } from '../lib/state';
import { spec } from '../spec';

let acStateSchema = z.object({
  on: z.boolean(),
  mode: z.enum(['cool', 'heat', 'fan', 'dry', 'auto']),
  fanLevel: z.string(),
  targetTemperature: z.number(),
  temperatureUnit: z.enum(['C', 'F']).optional(),
  swing: z.string().optional()
});
let outputSchema = z.object({
  deviceId: z.string(),
  schedules: z.array(z.record(z.string(), z.any())).optional(),
  schedule: z.record(z.string(), z.any()).optional(),
  deleted: z.boolean().optional()
});

export let manageRecurringScheduleTool = SlateTool.create(spec, {
  name: 'Manage Recurring Schedule',
  key: 'manage_recurring_schedule',
  description:
    'List, read, create, enable, disable, or delete Sensibo schedules using an explicit local time and timezone. Call list_devices to discover device IDs. Schedule updates enable or disable an existing schedule.',
  instructions: [
    'For create, supply targetTimeLocal, timezone, acState, and recurOnDaysOfWeek. Use an empty day list for a non-recurring schedule.',
    'For get, set_enabled, or delete, first list schedules to discover the schedule ID.',
    'To change the time or AC state, create a replacement schedule and then delete the original after reviewing the replacement.'
  ],
  tags: { destructive: false }
})
  .input(
    z.object({
      deviceId: deviceIdSchema,
      action: z.enum(['list', 'get', 'create', 'set_enabled', 'delete']),
      scheduleId: z
        .string()
        .optional()
        .describe(
          "Schedule ID from this tool's list action; required for get, set_enabled, and delete"
        ),
      targetTimeLocal: z
        .string()
        .optional()
        .describe('Local time in 24-hour HH:MM format; required for create'),
      timezone: z
        .string()
        .optional()
        .describe('IANA timezone, such as Europe/Oslo; required for create'),
      recurOnDaysOfWeek: z
        .array(
          z.enum([
            'sunday',
            'monday',
            'tuesday',
            'wednesday',
            'thursday',
            'friday',
            'saturday'
          ])
        )
        .optional()
        .describe(
          'Lowercase recurring weekdays; required for create; empty means no recurrence'
        ),
      acState: acStateSchema.optional().describe('AC state to apply; required for create'),
      isEnabled: z.boolean().optional().describe('Required for set_enabled')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    let client = new SensiboClient(ctx.auth.token);
    let {
      action,
      deviceId,
      scheduleId,
      targetTimeLocal,
      timezone,
      recurOnDaysOfWeek,
      acState,
      isEnabled
    } = ctx.input;
    let data: Record<string, unknown> | undefined;
    if (action === 'create') {
      if (
        !targetTimeLocal ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(targetTimeLocal) ||
        !timezone ||
        recurOnDaysOfWeek === undefined ||
        !acState
      ) {
        throw createApiServiceError(
          'Create requires a valid targetTimeLocal (HH:MM), timezone, recurOnDaysOfWeek, and acState.'
        );
      }
      try {
        new Intl.DateTimeFormat('en', { timeZone: timezone }).format();
      } catch {
        throw createApiServiceError(
          'timezone must be a valid IANA timezone such as Europe/Oslo.'
        );
      }
      if (isEnabled !== undefined)
        throw createApiServiceError(
          'Use set_enabled after creating the schedule; isEnabled is not a documented create field.'
        );
      validateAcState(acState, await client.getDevice(deviceId), true);
      data = { targetTimeLocal, timezone, recurOnDaysOfWeek, acState };
    } else if (action === 'set_enabled') {
      if (isEnabled === undefined)
        throw createApiServiceError('isEnabled is required for set_enabled.');
      data = { isEnabled };
    }
    if (
      action !== 'create' &&
      [targetTimeLocal, timezone, recurOnDaysOfWeek, acState].some(
        value => value !== undefined
      )
    ) {
      throw createApiServiceError(
        'Time, timezone, weekdays, and AC state are supported only by create.'
      );
    }
    if (!['create', 'set_enabled'].includes(action) && isEnabled !== undefined)
      throw createApiServiceError('isEnabled is supported only by set_enabled.');
    let result = await client.recurringSchedules(action, deviceId, scheduleId, data);
    let output = checked(
      outputSchema,
      action === 'list'
        ? { deviceId: client.sanitize(deviceId), schedules: result }
        : action === 'delete'
          ? { deviceId: client.sanitize(deviceId), deleted: true }
          : { deviceId: client.sanitize(deviceId), schedule: result },
      'schedule result'
    );
    return {
      output,
      message: `Schedule ${action} completed for device **${client.sanitize(deviceId)}**.`
    };
  })
  .build();
