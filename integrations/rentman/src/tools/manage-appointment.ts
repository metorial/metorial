import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createAppointment = SlateTool.create(spec, {
  name: 'Create Appointment',
  key: 'create_appointment',
  description: `Create a new appointment in Rentman. Appointments can be used to schedule events, meetings, or other time blocks.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      name: z.string().describe('Appointment name / title'),
      start: z.string().describe('Start date/time (ISO 8601)'),
      end: z.string().describe('End date/time (ISO 8601)'),
      location: z.string().optional().describe('Appointment location'),
      memo: z.string().optional().describe('Notes'),
      isInternal: z.boolean().optional().describe('Whether this is an internal appointment')
    })
  )
  .output(
    z.object({
      appointmentId: z.number().describe('ID of the newly created appointment'),
      name: z.string().optional(),
      start: z.string().optional(),
      end: z.string().optional(),
      createdAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: Record<string, any> = {
      name: ctx.input.name,
      start: ctx.input.start,
      end: ctx.input.end
    };

    if (ctx.input.location) body.location = ctx.input.location;
    if (ctx.input.memo) body.memo = ctx.input.memo;
    if (ctx.input.isInternal !== undefined) body.is_internal = ctx.input.isInternal;

    let result = await client.create('appointments', body);
    let a = result.data as any;

    return {
      output: {
        appointmentId: a.id,
        name: a.name,
        start: a.start,
        end: a.end,
        createdAt: a.created
      },
      message: `Created appointment **${a.name}** (ID: ${a.id}).`
    };
  })
  .build();

export let updateAppointment = SlateTool.create(spec, {
  name: 'Update Appointment',
  key: 'update_appointment',
  description: `Update an existing appointment in Rentman. Modify the name, dates, location, or notes.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      appointmentId: z.number().describe('ID of the appointment to update'),
      name: z.string().optional().describe('Updated name'),
      start: z.string().optional().describe('Updated start date/time'),
      end: z.string().optional().describe('Updated end date/time'),
      location: z.string().optional().describe('Updated location'),
      memo: z.string().optional().describe('Updated notes')
    })
  )
  .output(
    z.object({
      appointmentId: z.number(),
      name: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: Record<string, any> = {};
    if (ctx.input.name !== undefined) body.name = ctx.input.name;
    if (ctx.input.start !== undefined) body.start = ctx.input.start;
    if (ctx.input.end !== undefined) body.end = ctx.input.end;
    if (ctx.input.location !== undefined) body.location = ctx.input.location;
    if (ctx.input.memo !== undefined) body.memo = ctx.input.memo;

    let result = await client.update('appointments', ctx.input.appointmentId, body);
    let a = result.data as any;

    return {
      output: {
        appointmentId: a.id,
        name: a.name,
        updatedAt: a.modified
      },
      message: `Updated appointment **${a.name}** (ID: ${a.id}).`
    };
  })
  .build();

export let deleteAppointment = SlateTool.create(spec, {
  name: 'Delete Appointment',
  key: 'delete_appointment',
  description: `Permanently delete an appointment from Rentman.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      appointmentId: z.number().describe('ID of the appointment to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.remove('appointments', ctx.input.appointmentId);

    return {
      output: { deleted: true },
      message: `Deleted appointment with ID **${ctx.input.appointmentId}**.`
    };
  })
  .build();
