import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageAppointment = SlateTool.create(spec, {
  name: 'Manage Appointment',
  key: 'manage_appointment',
  description: `Create or update an appointment (meeting) in Freshsales. Appointments can be associated with contacts, leads, deals, or accounts.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      appointmentId: z
        .number()
        .optional()
        .describe('ID of the appointment to update. Omit to create.'),
      title: z.string().optional().describe('Appointment title'),
      description: z.string().optional().describe('Description'),
      fromDate: z.string().optional().describe('Start date/time in ISO format'),
      endDate: z.string().optional().describe('End date/time in ISO format'),
      location: z.string().optional().describe('Venue or location'),
      timeZone: z.string().optional().describe('Time zone (e.g. "America/New_York")'),
      isAllDay: z.boolean().optional().describe('Whether this is an all-day event'),
      targetableId: z.number().optional().describe('ID of the associated record'),
      targetableType: z
        .enum(['Contact', 'Lead', 'Deal', 'SalesAccount'])
        .optional()
        .describe('Type of the associated record')
    })
  )
  .output(
    z.object({
      appointmentId: z.number().describe('ID of the appointment'),
      title: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      fromDate: z.string().nullable().optional(),
      endDate: z.string().nullable().optional(),
      location: z.string().nullable().optional(),
      createdAt: z.string().nullable().optional(),
      updatedAt: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let apptData: Record<string, any> = {};
    if (ctx.input.title !== undefined) apptData.title = ctx.input.title;
    if (ctx.input.description !== undefined) apptData.description = ctx.input.description;
    if (ctx.input.fromDate !== undefined) apptData.from_date = ctx.input.fromDate;
    if (ctx.input.endDate !== undefined) apptData.end_date = ctx.input.endDate;
    if (ctx.input.location !== undefined) apptData.location = ctx.input.location;
    if (ctx.input.timeZone !== undefined) apptData.time_zone = ctx.input.timeZone;
    if (ctx.input.isAllDay !== undefined) apptData.is_allday = ctx.input.isAllDay;
    if (ctx.input.targetableId !== undefined) apptData.targetable_id = ctx.input.targetableId;
    if (ctx.input.targetableType !== undefined)
      apptData.targetable_type = ctx.input.targetableType;

    let appointment: Record<string, any>;
    let action: string;

    if (ctx.input.appointmentId) {
      appointment = await client.updateAppointment(ctx.input.appointmentId, apptData);
      action = 'updated';
    } else {
      appointment = await client.createAppointment(apptData);
      action = 'created';
    }

    return {
      output: {
        appointmentId: appointment.id,
        title: appointment.title,
        description: appointment.description,
        fromDate: appointment.from_date,
        endDate: appointment.end_date,
        location: appointment.location,
        createdAt: appointment.created_at,
        updatedAt: appointment.updated_at
      },
      message: `Appointment **${appointment.title || appointment.id}** ${action} successfully.`
    };
  })
  .build();
