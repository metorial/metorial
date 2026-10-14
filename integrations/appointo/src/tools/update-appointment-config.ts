import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { getAppointoRecord } from '../lib/bookings';
import { Client } from '../lib/client';
import { spec } from '../spec';

let configSchema = z
  .object({
    timezone: z
      .string()
      .optional()
      .describe('Timezone for the appointment (e.g., "America/New_York")'),
    duration: z.number().optional().describe('Duration in minutes'),
    interval: z.number().optional().describe('Interval between slots in minutes'),
    capacity: z.number().optional().describe('Maximum capacity per slot'),
    startBufferTime: z
      .number()
      .optional()
      .describe('Buffer time in minutes before the appointment'),
    endBufferTime: z
      .number()
      .optional()
      .describe('Buffer time in minutes after the appointment'),
    emailReminder: z.boolean().optional().describe('Enable email reminders'),
    smsReminder: z.boolean().optional().describe('Enable SMS reminders'),
    whatsappReminder: z.boolean().optional().describe('Enable WhatsApp reminders'),
    location: z.string().optional().describe('Location for the appointment'),
    cancellationPolicy: z.string().optional().describe('Cancellation policy text'),
    reschedulingPolicy: z.string().optional().describe('Rescheduling policy text'),
    allowCancel: z.boolean().optional().describe('Allow customers to cancel bookings'),
    allowReschedule: z.boolean().optional().describe('Allow customers to reschedule bookings'),
    cancelDuration: z
      .number()
      .optional()
      .describe("Cancellation cutoff duration in Appointo's configured units"),
    rescheduleDuration: z
      .number()
      .optional()
      .describe("Rescheduling cutoff duration in Appointo's configured units")
  })
  .passthrough()
  .optional()
  .describe('Appointment configuration settings');

let slotSchema = z
  .object({
    startTime: z
      .string()
      .optional()
      .describe('Slot start time, e.g. 09:00AM; HH:MM is also accepted'),
    endTime: z
      .string()
      .optional()
      .describe('Slot end time, e.g. 05:00PM; HH:MM is also accepted'),
    surgePrice: z.number().optional().describe('Surge pricing override for this slot'),
    capacity: z.number().optional().describe('Capacity override for this slot')
  })
  .passthrough();

let dayAvailabilitySchema = z
  .object({
    day: z.string().optional().describe('Day of the week (e.g., "monday")'),
    enabled: z.boolean().optional().describe('Whether this day is enabled'),
    slots: z.array(slotSchema).optional().describe('Time slots for this day')
  })
  .passthrough();

let dateOverrideSchema = z
  .object({
    date: z.string().optional().describe('Specific date in YYYY-MM-DD format'),
    enabled: z.boolean().optional().describe('Whether this date override is active'),
    slots: z.array(slotSchema).optional().describe('Custom slots for this date')
  })
  .passthrough();

let toProviderTime = (time: string | undefined) => {
  if (!time) return time;
  let match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return time;
  let hour = Number(match[1]);
  return `${String(hour % 12 || 12).padStart(2, '0')}:${match[2]}${hour < 12 ? 'AM' : 'PM'}`;
};

let mapSlot = (slot: z.infer<typeof slotSchema>) => {
  let { startTime, endTime, surgePrice, capacity, ...providerFields } = slot;
  return {
    ...providerFields,
    ...pickDefined({
      start_time: toProviderTime(startTime),
      end_time: toProviderTime(endTime),
      max_capacity: capacity,
      surge: surgePrice === undefined ? undefined : true,
      price: surgePrice === undefined ? undefined : String(surgePrice)
    })
  };
};

export let updateAppointmentConfig = SlateTool.create(spec, {
  name: 'Update Appointment Configuration',
  key: 'update_appointment_config',
  description: `Update an appointment's configuration, including timezone, duration, interval, capacity, buffer times, reminders (email, SMS, WhatsApp), location, cancellation/rescheduling permissions and cutoff durations, weekly availability slots with per-slot surge pricing and capacity overrides, and date-specific overrides.`,
  instructions: [
    'Use the named configuration fields or documented Appointo configuration keys.',
    'Availabilities define the weekly recurring schedule. Each entry represents a day of the week with its enabled slots.',
    'Overrides define date-specific exceptions. Send the complete set of date overrides when updating them, including existing entries you want to keep.'
  ],
  constraints: ['Write operations are limited to 100 requests per day.'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      appointmentId: z.number().describe('ID of the appointment to update'),
      config: configSchema,
      availabilities: z
        .array(dayAvailabilitySchema)
        .optional()
        .describe('Weekly availability schedule'),
      dateOverrides: z
        .array(dateOverrideSchema)
        .optional()
        .describe('Date-specific availability overrides')
    })
  )
  .output(
    z
      .object({
        appointmentId: z.number().optional().describe('ID of the updated appointment'),
        status: z.string().optional().describe('Update status')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (
      !ctx.input.config &&
      ctx.input.availabilities === undefined &&
      ctx.input.dateOverrides === undefined
    ) {
      throw createApiServiceError(
        'Provide configuration, weekly availability, or date overrides to update.'
      );
    }

    let apiConfig: Record<string, unknown> | undefined;
    if (ctx.input.config) {
      let {
        timezone,
        duration,
        interval,
        capacity,
        startBufferTime,
        endBufferTime,
        emailReminder,
        smsReminder,
        whatsappReminder,
        location,
        cancellationPolicy,
        reschedulingPolicy,
        allowCancel,
        allowReschedule,
        cancelDuration,
        rescheduleDuration,
        ...providerConfig
      } = ctx.input.config;
      apiConfig = {
        ...providerConfig,
        ...pickDefined({
          timezone,
          duration: duration === undefined ? undefined : String(duration),
          interval: interval === undefined ? undefined : String(interval),
          max_capacity: capacity === undefined ? undefined : String(capacity),
          start_buffer_time:
            startBufferTime === undefined ? undefined : String(startBufferTime),
          end_buffer_time: endBufferTime === undefined ? undefined : String(endBufferTime),
          send_reminder: emailReminder,
          send_text_reminder: smsReminder,
          send_whatsapp_reminder: whatsappReminder,
          location_value: location,
          cancellation_policy: cancellationPolicy,
          rescheduling_policy: reschedulingPolicy,
          allow_cancel: allowCancel,
          allow_reschedule: allowReschedule,
          cancel_duration: cancelDuration,
          reschedule_duration: rescheduleDuration
        })
      };
    }

    let availabilities = ctx.input.availabilities?.map(entry => {
      let { day, enabled, slots, ...providerFields } = entry;
      return {
        ...providerFields,
        ...pickDefined({ weekday: day, day_available: enabled, slots: slots?.map(mapSlot) })
      };
    });
    let overrides = ctx.input.dateOverrides?.map(entry => {
      let { date, enabled, slots, ...providerFields } = entry;
      return {
        ...providerFields,
        ...pickDefined({ day: date, day_available: enabled, slots: slots?.map(mapSlot) })
      };
    });

    let result = await client.updateAppointmentConfig(ctx.input.appointmentId, {
      config: apiConfig,
      availabilities,
      override: overrides
    });

    let appointment = getAppointoRecord(result, 'appointment');

    return {
      output: {
        ...appointment,
        appointmentId: appointment.id ?? ctx.input.appointmentId,
        status: 'updated'
      },
      message: `Appointment **#${ctx.input.appointmentId}** configuration updated.`
    };
  })
  .build();
