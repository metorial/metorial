import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageAppointment = SlateTool.create(spec, {
  name: 'Manage Appointment',
  key: 'manage_appointment',
  description: `Create, update, retrieve, or delete an appointment in Follow Up Boss. Appointments are scheduled meetings or showings associated with contacts and agents.`,
  instructions: [
    'To create, provide title, startDate, and endDate. personId and assignedTo add contact and user invitees.',
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
      assignedTo: z
        .number()
        .optional()
        .describe('User ID to include as an appointment invitee; use list_users to find IDs'),
      title: z.string().optional().describe('Appointment title'),
      description: z.string().optional().describe('Appointment description'),
      startDate: z.string().optional().describe('Start date/time (ISO 8601)'),
      endDate: z.string().optional().describe('End date/time (ISO 8601)'),
      appointmentTypeId: z.number().optional().describe('Appointment type ID'),
      appointmentOutcomeId: z.number().optional().describe('Appointment outcome ID'),
      location: z.string().optional().describe('Meeting location'),
      allDay: z.boolean().optional().describe('Whether the appointment is an all-day event'),
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

    if (ctx.input.delete && ctx.input.appointmentId === undefined) {
      throw createApiServiceError('Provide appointmentId to delete an appointment.');
    }

    let hasChanges = Object.entries(ctx.input).some(
      ([key, value]) => key !== 'appointmentId' && key !== 'delete' && value !== undefined
    );
    let existing =
      ctx.input.appointmentId !== undefined
        ? await client.getAppointment(ctx.input.appointmentId)
        : undefined;
    if (existing && !hasChanges) {
      return {
        output: {
          appointmentId: existing.id,
          personId: existing.invitees?.find((invitee: any) => invitee.personId)?.personId
            ? Number(existing.invitees.find((invitee: any) => invitee.personId).personId)
            : undefined,
          assignedTo: existing.invitees?.find((invitee: any) => invitee.userId)?.userId,
          title: existing.title,
          startDate: existing.start,
          endDate: existing.end,
          created: existing.created,
          updated: existing.updated
        },
        message: `Retrieved appointment **${existing.title || existing.id}**.`
      };
    }

    let data = pickDefined({
      title: ctx.input.title ?? existing?.title,
      description: ctx.input.description,
      start: ctx.input.startDate ?? existing?.start,
      end: ctx.input.endDate ?? existing?.end,
      typeId: ctx.input.appointmentTypeId,
      outcomeId: ctx.input.appointmentOutcomeId,
      location: ctx.input.location,
      allDay: ctx.input.allDay
    });
    if (!data.title || !data.start || !data.end) {
      throw createApiServiceError(
        'Provide title, startDate, and endDate to create an appointment.'
      );
    }
    if (ctx.input.personId !== undefined || ctx.input.assignedTo !== undefined) {
      let invitees = [...(existing?.invitees ?? [])];
      if (
        ctx.input.personId !== undefined &&
        !invitees.some(invitee => String(invitee.personId) === String(ctx.input.personId))
      ) {
        let person = await client.getPerson(ctx.input.personId);
        invitees.push(
          pickDefined({
            personId: String(ctx.input.personId),
            name: [person.firstName, person.lastName].filter(Boolean).join(' ') || undefined,
            email: person.emails?.[0]?.value
          })
        );
      }
      if (
        ctx.input.assignedTo !== undefined &&
        !invitees.some(invitee => invitee.userId === ctx.input.assignedTo)
      ) {
        let user = await client.getUser(ctx.input.assignedTo);
        invitees.push(
          pickDefined({
            userId: ctx.input.assignedTo,
            name: [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined,
            email: user.email
          })
        );
      }
      Object.assign(data, { invitees });
    }

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
        personId: appt.invitees?.find((invitee: any) => invitee.personId)?.personId
          ? Number(appt.invitees.find((invitee: any) => invitee.personId).personId)
          : ctx.input.personId,
        assignedTo:
          appt.invitees?.find((invitee: any) => invitee.userId)?.userId ??
          ctx.input.assignedTo,
        title: appt.title,
        startDate: appt.start,
        endDate: appt.end,
        created: appt.created,
        updated: appt.updated
      },
      message: `${action} appointment **${appt.title || appt.id}**.`
    };
  })
  .build();
