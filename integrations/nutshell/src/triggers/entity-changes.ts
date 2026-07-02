import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let entityChanges = SlateTrigger.create(spec, {
  name: 'Entity Changes',
  key: 'entity_changes',
  description:
    'Triggered when entities (leads, contacts, accounts, activities) are created or updated in Nutshell. Receives webhook payloads from the Nutshell firehose. Configure the webhook URL in Nutshell under Setup > API Keys.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event identifier'),
      action: z.string().describe('Action that triggered the event (create, edit, delete)'),
      payloadType: z
        .string()
        .describe('Type of entity affected (leads, contacts, accounts, activities)'),
      actorName: z.string().optional().describe('Name of the user who performed the action'),
      actorEmail: z.string().optional().describe('Email of the user who performed the action'),
      entityId: z.string().describe('ID of the affected entity'),
      entityName: z.string().optional().describe('Name of the affected entity'),
      entityStatus: z.string().optional().describe('Current status of the entity'),
      changes: z.array(z.any()).optional().describe('List of field changes made'),
      createdTime: z.number().optional().describe('Unix timestamp of the event'),
      rawPayload: z.any().optional().describe('Full entity payload from the webhook')
    })
  )
  .output(
    z.object({
      entityId: z.string().describe('ID of the affected entity'),
      entityType: z
        .string()
        .describe('Type of entity (leads, contacts, accounts, activities)'),
      entityName: z.string().optional().describe('Name of the affected entity'),
      action: z.string().describe('Action performed (create, edit, delete)'),
      actorName: z.string().optional().describe('Name of the user who performed the action'),
      actorEmail: z.string().optional().describe('Email of the user'),
      status: z.string().optional().describe('Current entity status'),
      changes: z.array(z.any()).optional().describe('Field changes'),
      eventTime: z.string().optional().describe('ISO timestamp of the event'),
      entityDetails: z.any().optional().describe('Full entity details from the payload')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let events = data.events || [];
      let actors = data.actors || [];
      let payloads = data.payloads || [];

      let actorMap: Record<string, any> = {};
      for (let actor of actors) {
        actorMap[actor.id] = actor;
      }

      let payloadMap: Record<string, any> = {};
      for (let payload of payloads) {
        payloadMap[payload.id] = payload;
      }

      let inputs = events.map((event: any) => {
        let actorId = event.links?.actor;
        let actor = actorId ? actorMap[actorId] : undefined;

        let payloadIds: string[] = event.links?.payloads || [];
        let firstPayloadId = payloadIds[0];
        let payload = firstPayloadId ? payloadMap[firstPayloadId] : undefined;

        let entityId = firstPayloadId || event.id;

        return {
          eventId: String(event.id),
          action: event.action || 'unknown',
          payloadType: event.payloadType || 'unknown',
          actorName: actor?.name,
          actorEmail: actor?.emails?.[0],
          entityId: String(entityId),
          entityName: payload?.name,
          entityStatus: payload?.status,
          changes: event.changes || [],
          createdTime: event.createdTime,
          rawPayload: payload
        };
      });

      return { inputs };
    },

    handleEvent: async ctx => {
      let eventTime: string | undefined;
      if (ctx.input.createdTime) {
        eventTime = new Date(ctx.input.createdTime * 1000).toISOString();
      }

      return {
        type: `${ctx.input.payloadType}.${ctx.input.action}`,
        id: ctx.input.eventId,
        output: {
          entityId: ctx.input.entityId,
          entityType: ctx.input.payloadType,
          entityName: ctx.input.entityName,
          action: ctx.input.action,
          actorName: ctx.input.actorName,
          actorEmail: ctx.input.actorEmail,
          status: ctx.input.entityStatus,
          changes: ctx.input.changes,
          eventTime,
          entityDetails: ctx.input.rawPayload
        }
      };
    }
  })
  .build();
