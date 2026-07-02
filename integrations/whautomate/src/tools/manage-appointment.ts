import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageAppointment = SlateTool.create(spec, {
  name: 'Manage Appointment',
  key: 'manage_appointment',
  description: `Create, reschedule, or cancel appointments. Appointments link a client with a service, staff member, location, date, and time. Use the **Search Appointments** tool to find existing appointments or **Get Appointment Slots** to check availability first.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'reschedule', 'cancel']).describe('Action to perform'),
      appointmentId: z
        .string()
        .optional()
        .describe('Appointment ID (required for reschedule and cancel)'),
      clientId: z.string().optional().describe('Client ID (for create)'),
      serviceId: z.string().optional().describe('Service ID (for create)'),
      staffId: z.string().optional().describe('Staff member ID (for create and reschedule)'),
      locationId: z.string().optional().describe('Location ID (for create)'),
      date: z.string().optional().describe('Appointment date (YYYY-MM-DD)'),
      time: z.string().optional().describe('Appointment time (HH:MM AM/PM)'),
      timezone: z.string().optional().describe('Timezone (for create)'),
      notes: z.string().optional().describe('Notes for the appointment'),
      reason: z.string().optional().describe('Cancellation reason (for cancel)')
    })
  )
  .output(
    z.object({
      appointmentId: z.string().optional().describe('ID of the appointment'),
      status: z.string().optional().describe('Appointment status'),
      date: z.string().optional().describe('Appointment date'),
      time: z.string().optional().describe('Appointment time'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiHost: ctx.config.apiHost
    });

    let { action } = ctx.input;

    if (action === 'create') {
      let data: Record<string, any> = {};
      if (ctx.input.clientId) data.clientId = ctx.input.clientId;
      if (ctx.input.serviceId) data.serviceId = ctx.input.serviceId;
      if (ctx.input.staffId) data.staffId = ctx.input.staffId;
      if (ctx.input.locationId) data.locationId = ctx.input.locationId;
      if (ctx.input.date) data.date = ctx.input.date;
      if (ctx.input.time) data.time = ctx.input.time;
      if (ctx.input.timezone) data.timezone = ctx.input.timezone;
      if (ctx.input.notes) data.notes = ctx.input.notes;

      let result = await client.createAppointment(data);
      return {
        output: {
          appointmentId: result.id || result._id,
          status: result.status,
          date: result.date,
          time: result.time,
          success: true
        },
        message: `Created appointment on **${result.date}** at **${result.time}**.`
      };
    }

    if (action === 'reschedule') {
      if (!ctx.input.appointmentId)
        throw new Error('appointmentId is required for reschedule');
      if (!ctx.input.date || !ctx.input.time)
        throw new Error('date and time are required for reschedule');

      let result = await client.rescheduleAppointment({
        appointmentId: ctx.input.appointmentId,
        date: ctx.input.date,
        time: ctx.input.time,
        staffId: ctx.input.staffId
      });
      return {
        output: {
          appointmentId: ctx.input.appointmentId,
          status: result.status,
          date: ctx.input.date,
          time: ctx.input.time,
          success: true
        },
        message: `Rescheduled appointment **${ctx.input.appointmentId}** to **${ctx.input.date}** at **${ctx.input.time}**.`
      };
    }

    if (action === 'cancel') {
      if (!ctx.input.appointmentId) throw new Error('appointmentId is required for cancel');
      let _result = await client.cancelAppointment({
        appointmentId: ctx.input.appointmentId,
        reason: ctx.input.reason
      });
      return {
        output: {
          appointmentId: ctx.input.appointmentId,
          status: 'Cancelled',
          success: true
        },
        message: `Cancelled appointment **${ctx.input.appointmentId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
