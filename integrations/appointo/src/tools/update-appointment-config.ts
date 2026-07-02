import { SlateTool } from 'slates';
import { z } from 'zod';
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
    reschedulingPolicy: z.string().optional().describe('Rescheduling policy text')
  })
  .passthrough()
  .optional()
  .describe('Appointment configuration settings');

let slotSchema = z
  .object({
    startTime: z.string().optional().describe('Slot start time (HH:MM format)'),
    endTime: z.string().optional().describe('Slot end time (HH:MM format)'),
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

export let updateAppointmentConfig = SlateTool.create(spec, {
  name: 'Update Appointment Configuration',
  key: 'update_appointment_config',
  description: `Update an appointment's configuration, including timezone, duration, interval, capacity, buffer times, reminders (email, SMS, WhatsApp), location, cancellation/rescheduling policies, weekly availability slots with per-slot surge pricing and capacity overrides, and date-specific overrides.`,
  instructions: [
    'The config object fields use snake_case when sent to the API. Provide them as described in the input schema.',
    'Availabilities define the weekly recurring schedule. Each entry represents a day of the week with its enabled slots.',
    'Overrides define date-specific exceptions that override the weekly schedule for specific dates.'
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

    // Transform config keys to snake_case for the API
    let apiConfig: Record<string, any> | undefined;
    if (ctx.input.config) {
      let c = ctx.input.config;
      apiConfig = {
        ...(c.timezone != null && { timezone: c.timezone }),
        ...(c.duration != null && { duration: c.duration }),
        ...(c.interval != null && { interval: c.interval }),
        ...(c.capacity != null && { capacity: c.capacity }),
        ...(c.startBufferTime != null && { start_buffer_time: c.startBufferTime }),
        ...(c.endBufferTime != null && { end_buffer_time: c.endBufferTime }),
        ...(c.emailReminder != null && { email_reminder: c.emailReminder }),
        ...(c.smsReminder != null && { sms_reminder: c.smsReminder }),
        ...(c.whatsappReminder != null && { whatsapp_reminder: c.whatsappReminder }),
        ...(c.location != null && { location: c.location }),
        ...(c.cancellationPolicy != null && { cancellation_policy: c.cancellationPolicy }),
        ...(c.reschedulingPolicy != null && { rescheduling_policy: c.reschedulingPolicy })
      };
    }

    let result = await client.updateAppointmentConfig(ctx.input.appointmentId, {
      config: apiConfig,
      availabilities: ctx.input.availabilities,
      override: ctx.input.dateOverrides
    });

    let appointment = result?.appointment ?? result?.data ?? result;

    return {
      output: {
        appointmentId: appointment?.id ?? ctx.input.appointmentId,
        status: 'updated',
        ...appointment
      },
      message: `Appointment **#${ctx.input.appointmentId}** configuration updated.`
    };
  })
  .build();
