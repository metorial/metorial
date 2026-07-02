import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { EventsClient } from '../lib/events-client';
import { spec } from '../spec';

export let auditEventsTrigger = SlateTrigger.create(spec, {
  name: 'Audit Events',
  key: 'audit_events',
  description:
    'Monitors administrative actions performed by team members in a 1Password Business account. Tracks changes to vaults, groups, users, permissions, and other account-level actions.'
})
  .input(
    z.object({
      eventUuid: z.string().describe('Unique identifier of the audit event'),
      timestamp: z.string().describe('When the event occurred'),
      action: z.string().describe('The type of action performed'),
      objectType: z.string().describe('The type of object the action was performed on'),
      objectUuid: z.string().describe('UUID of the object affected'),
      actorUuid: z.string().describe('UUID of the actor who performed the action'),
      actorName: z.string().optional().describe('Name of the actor'),
      actorEmail: z.string().optional().describe('Email of the actor'),
      objectName: z.string().optional().describe('Name of the affected object'),
      sessionIp: z.string().optional().describe('IP address of the session'),
      country: z.string().optional().describe('Country of the event location'),
      region: z.string().optional().describe('Region of the event location'),
      city: z.string().optional().describe('City of the event location')
    })
  )
  .output(
    z.object({
      eventUuid: z.string().describe('Unique identifier of the audit event'),
      timestamp: z.string().describe('When the event occurred'),
      action: z
        .string()
        .describe('The action that was performed (e.g., create, update, delete)'),
      objectType: z.string().describe('Type of object affected (e.g., vault, group, user)'),
      objectUuid: z.string().describe('UUID of the affected object'),
      objectName: z.string().optional().describe('Name of the affected object'),
      actorUuid: z.string().describe('UUID of the person who performed the action'),
      actorName: z.string().optional().describe('Name of the person who performed the action'),
      actorEmail: z
        .string()
        .optional()
        .describe('Email of the person who performed the action'),
      sessionIp: z
        .string()
        .optional()
        .describe('IP address from which the action was performed'),
      country: z.string().optional().describe('Country from which the action was performed'),
      region: z.string().optional().describe('Region from which the action was performed'),
      city: z.string().optional().describe('City from which the action was performed')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new EventsClient({
        token: ctx.auth.token,
        region: ctx.config.eventsApiRegion || 'us'
      });

      let cursor = ctx.state?.cursor as string | undefined;

      let params = cursor
        ? { cursor }
        : { startTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() };

      let response = await client.getAuditEvents(params);

      let inputs = response.items.map(event => ({
        eventUuid: event.uuid,
        timestamp: event.timestamp,
        action: event.action,
        objectType: event.objectType,
        objectUuid: event.objectUuid,
        actorUuid: event.actorUuid,
        actorName: event.actorDetails?.name,
        actorEmail: event.actorDetails?.email,
        objectName: event.objectDetails?.name,
        sessionIp: event.session?.ip,
        country: event.location?.country,
        region: event.location?.region,
        city: event.location?.city
      }));

      return {
        inputs,
        updatedState: {
          cursor: response.cursor
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `audit.${ctx.input.action.toLowerCase()}`,
        id: ctx.input.eventUuid,
        output: {
          eventUuid: ctx.input.eventUuid,
          timestamp: ctx.input.timestamp,
          action: ctx.input.action,
          objectType: ctx.input.objectType,
          objectUuid: ctx.input.objectUuid,
          objectName: ctx.input.objectName,
          actorUuid: ctx.input.actorUuid,
          actorName: ctx.input.actorName,
          actorEmail: ctx.input.actorEmail,
          sessionIp: ctx.input.sessionIp,
          country: ctx.input.country,
          region: ctx.input.region,
          city: ctx.input.city
        }
      };
    }
  })
  .build();
