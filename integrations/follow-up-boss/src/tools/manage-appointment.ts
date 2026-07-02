import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageAppointment = SlateTool.create(spec, {
  name: 'Manage Appointment',
  key: 'manage_appointment',
  description: `Create, update, retrieve, or delete an appointment in Follow Up Boss. Appointments are scheduled meetings or showings associated with contacts and agents.`,
  instructions: [
    'To create, provide personId, assignedTo, and startDate at minimum.',
    'To update, provide the appointmentId and the fields to change.',
    'To retrieve, provide only the appointmentId.',
    'To delete, set "delete" to true with an appointmentId.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      appointmentId: z.number().optional().describe('ID of an existing appointment'),
      personId: z.number().optional().describe('Contact ID associated with the appointment'),
      assignedTo: z.number().optional().describe('User ID the appointment is assigned to'),
      title: z.string().optional().describe('Appointment title'),
      description: z.string().optional().describe('Appointment description'),
      startDate: z.string().optional().describe('Start date/time (ISO 8601)'),
      endDate: z.string().optional().describe('End date/time (ISO 8601)'),
      appointmentTypeId: z.number().optional().describe('Appointment type ID'),
      appointmentOutcomeId: z.number().optional().describe('Appointment outcome ID'),
      location: z.string().optional().describe('Meeting location'),
      delete: z.boolean().optional().describe('Set to true to delete the appointment')
    })
  )
  .output(
    z.object({
      appointmentId: z.number().optional(),
      personId: z.number().optional(),
      assignedTo: z.number().optional(),
      title: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      created: z.string().optional(),
      updated: z.string().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.delete && ctx.input.appointmentId) {
      await client.deleteAppointment(ctx.input.appointmentId);
      return {
        output: { appointmentId: ctx.input.appointmentId, deleted: true },
        message: `Deleted appointment **${ctx.input.appointmentId}**.`
      };
    }

    if (
      ctx.input.appointmentId &&
      !ctx.input.title &&
      !ctx.input.startDate &&
      !ctx.input.endDate &&
      !ctx.input.assignedTo &&
      !ctx.input.personId &&
      !ctx.input.description &&
      !ctx.input.appointmentTypeId &&
      !ctx.input.appointmentOutcomeId &&
      !ctx.input.location
    ) {
      let appt = await client.getAppointment(ctx.input.appointmentId);
      return {
        output: {
          appointmentId: appt.id,
          personId: appt.personId,
          assignedTo: appt.assignedTo,
          title: appt.title,
          startDate: appt.startDate,
          endDate: appt.endDate,
          created: appt.created,
          updated: appt.updated
        },
        message: `Retrieved appointment **${appt.title || appt.id}**.`
      };
    }

    let data: Record<string, any> = {};
    if (ctx.input.personId !== undefined) data.personId = ctx.input.personId;
    if (ctx.input.assignedTo !== undefined) data.assignedTo = ctx.input.assignedTo;
    if (ctx.input.title !== undefined) data.title = ctx.input.title;
    if (ctx.input.description !== undefined) data.description = ctx.input.description;
    if (ctx.input.startDate !== undefined) data.startDate = ctx.input.startDate;
    if (ctx.input.endDate !== undefined) data.endDate = ctx.input.endDate;
    if (ctx.input.appointmentTypeId !== undefined)
      data.appointmentTypeId = ctx.input.appointmentTypeId;
    if (ctx.input.appointmentOutcomeId !== undefined)
      data.appointmentOutcomeId = ctx.input.appointmentOutcomeId;
    if (ctx.input.location !== undefined) data.location = ctx.input.location;

    let appt: any;
    let action: string;

    if (ctx.input.appointmentId) {
      appt = await client.updateAppointment(ctx.input.appointmentId, data);
      action = 'Updated';
    } else {
      appt = await client.createAppointment(data);
      action = 'Created';
    }

    return {
      output: {
        appointmentId: appt.id,
        personId: appt.personId,
        assignedTo: appt.assignedTo,
        title: appt.title,
        startDate: appt.startDate,
        endDate: appt.endDate,
        created: appt.created,
        updated: appt.updated
      },
      message: `${action} appointment **${appt.title || appt.id}**.`
    };
  })
  .build();
