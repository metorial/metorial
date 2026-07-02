import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let appointmentChangesTrigger = SlateTrigger.create(spec, {
  name: 'Appointment Changes',
  key: 'appointment_changes',
  description:
    'Fires when appointments are created, updated, or deleted on a schedule. Covers all appointment lifecycle events including new bookings, edits, cancellations, waiting list placements, approvals, and restorations.'
})
  .input(
    z.object({
      event: z
        .string()
        .describe(
          'Event type (e.g. create, edit, destroy, place, pending, restore, approve, revert)'
        ),
      role: z.string().optional().describe('Role of the actor (0-7)'),
      appointmentId: z.string().optional().describe('Appointment ID'),
      scheduleId: z.string().optional().describe('Schedule ID'),
      start: z.string().optional().describe('Start date/time'),
      finish: z.string().optional().describe('End date/time'),
      resourceName: z.string().optional().describe('Resource name'),
      resourceId: z.string().optional().describe('Resource ID'),
      fullName: z.string().optional().describe('Booker full name'),
      email: z.string().optional().describe('Booker email'),
      userId: z.string().optional().describe('User ID'),
      status: z.string().optional().describe('Appointment status'),
      price: z.string().optional().describe('Appointment price'),
      deleted: z.boolean().optional().describe('Whether appointment is deleted'),
      createdOn: z.string().optional().describe('UTC creation timestamp'),
      updatedOn: z.string().optional().describe('UTC last update timestamp'),
      rawPayload: z.any().optional().describe('Full raw webhook payload')
    })
  )
  .output(
    z.object({
      appointmentId: z.string().describe('Appointment ID'),
      scheduleId: z.string().optional().describe('Schedule ID'),
      start: z.string().optional().describe('Start date/time'),
      finish: z.string().optional().describe('End date/time'),
      resourceName: z.string().optional().describe('Resource name'),
      resourceId: z.string().optional().describe('Resource ID'),
      fullName: z.string().optional().describe('Booker full name'),
      email: z.string().optional().describe('Booker email'),
      userId: z.string().optional().describe('User ID'),
      status: z.string().optional().describe('Appointment status'),
      price: z.string().optional().describe('Appointment price'),
      deleted: z.boolean().optional().describe('Whether appointment is deleted'),
      createdOn: z.string().optional().describe('UTC creation timestamp'),
      updatedOn: z.string().optional().describe('UTC last update timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client(ctx.auth);

      // Register for "Changed appointment" (code: C) which covers all appointment events
      // parent_id must be the schedule ID; we need one from the config or we register for all schedules
      let schedules = await client.listSchedules();
      let registrations: Array<{ webhookId: string; parentId: string }> = [];

      for (let schedule of schedules) {
        let scheduleId = String(schedule.id ?? schedule[0] ?? '');
        if (!scheduleId) continue;

        let result = await client.createWebhook('C', scheduleId, ctx.input.webhookBaseUrl);
        let webhookId = result?.id ? String(result.id) : '';
        if (webhookId) {
          registrations.push({ webhookId, parentId: scheduleId });
        }
      }

      return {
        registrationDetails: { registrations }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client(ctx.auth);
      let details = ctx.input.registrationDetails as {
        registrations: Array<{ webhookId: string; parentId: string }>;
      };

      if (details?.registrations) {
        for (let reg of details.registrations) {
          try {
            await client.deleteWebhook(reg.webhookId, reg.parentId);
          } catch {
            // Best-effort cleanup
          }
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      // SuperSaaS may send a single event or potentially batch
      let events = Array.isArray(data) ? data : [data];

      let inputs = events.map((item: any) => ({
        event: item.event ?? 'unknown',
        role: item.role != null ? String(item.role) : undefined,
        appointmentId: item.id != null ? String(item.id) : undefined,
        scheduleId: item.schedule_id != null ? String(item.schedule_id) : undefined,
        start: item.start ?? undefined,
        finish: item.finish ?? undefined,
        resourceName: item.resource ?? undefined,
        resourceId: item.resource_id != null ? String(item.resource_id) : undefined,
        fullName: item.full_name ?? undefined,
        email: item.email ?? undefined,
        userId: item.user_id != null ? String(item.user_id) : undefined,
        status: item.status ?? undefined,
        price: item.price != null ? String(item.price) : undefined,
        deleted: item.deleted ?? undefined,
        createdOn: item.created_on ?? undefined,
        updatedOn: item.updated_on ?? undefined,
        rawPayload: item
      }));

      return { inputs };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.event || 'unknown';
      let appointmentId = ctx.input.appointmentId || `unknown-${Date.now()}`;

      return {
        type: `appointment.${eventType}`,
        id: `${appointmentId}-${eventType}-${ctx.input.updatedOn || Date.now()}`,
        output: {
          appointmentId,
          scheduleId: ctx.input.scheduleId,
          start: ctx.input.start,
          finish: ctx.input.finish,
          resourceName: ctx.input.resourceName,
          resourceId: ctx.input.resourceId,
          fullName: ctx.input.fullName,
          email: ctx.input.email,
          userId: ctx.input.userId,
          status: ctx.input.status,
          price: ctx.input.price,
          deleted: ctx.input.deleted,
          createdOn: ctx.input.createdOn,
          updatedOn: ctx.input.updatedOn
        }
      };
    }
  })
  .build();
