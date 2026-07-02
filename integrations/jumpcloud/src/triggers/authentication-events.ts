import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let authenticationEvents = SlateTrigger.create(spec, {
  name: 'Authentication Events',
  key: 'authentication_events',
  description:
    'Polls JumpCloud Directory Insights for authentication events across SSO, RADIUS, LDAP, and system logins. Captures successful and failed authentication attempts.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event identifier'),
      eventType: z.string().describe('Event type'),
      timestamp: z.string().describe('Event timestamp'),
      service: z.string().describe('Service category (sso, radius, ldap, systems)'),
      initiatedById: z.string().optional().describe('User ID who attempted authentication'),
      initiatedByEmail: z.string().optional().describe('Email of the authenticating user'),
      resourceId: z.string().optional().describe('Resource ID being authenticated to'),
      resourceType: z.string().optional().describe('Resource type'),
      organization: z.string().optional().describe('Organization ID'),
      rawEvent: z.any().describe('Full raw event payload')
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('Unique event identifier'),
      eventType: z.string().describe('Event type'),
      timestamp: z.string().describe('Event timestamp'),
      service: z.string().describe('Service category'),
      userId: z.string().optional().describe('Authenticating user ID'),
      userEmail: z.string().optional().describe('Authenticating user email'),
      resourceId: z.string().optional().describe('Target resource ID'),
      resourceType: z.string().optional().describe('Target resource type'),
      organization: z.string().optional().describe('Organization ID'),
      success: z.boolean().optional().describe('Whether the authentication succeeded'),
      clientIp: z.string().optional().describe('Client IP address'),
      message: z.string().optional().describe('Human-readable event description')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },
    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        orgId: ctx.config.orgId
      });

      let lastTimestamp = ctx.state?.lastTimestamp as string | undefined;
      let startTime = lastTimestamp ?? new Date(Date.now() - 5 * 60 * 1000).toISOString();

      let result = await client.queryEvents({
        service: ['sso', 'radius', 'ldap', 'systems'],
        startTime,
        limit: 100,
        sort: 'ASC'
      });

      let newLastTimestamp = startTime;
      if (result.events.length > 0) {
        let lastEvent = result.events[result.events.length - 1]!;
        newLastTimestamp = lastEvent.timestamp ?? startTime;
      }

      return {
        inputs: result.events.map(e => ({
          eventId: e.id ?? `${e.timestamp}-${e.event_type}`,
          eventType: e.event_type ?? 'unknown',
          timestamp: e.timestamp ?? new Date().toISOString(),
          service: e.service ?? 'unknown',
          initiatedById: e.initiated_by?.id,
          initiatedByEmail: e.initiated_by?.email,
          resourceId: e.resource?.id,
          resourceType: e.resource?.type,
          organization: e.organization,
          rawEvent: e
        })),
        updatedState: {
          lastTimestamp: newLastTimestamp
        }
      };
    },
    handleEvent: async ctx => {
      let raw = ctx.input.rawEvent ?? {};
      let success = raw.success !== undefined ? raw.success : undefined;
      let clientIp = raw.client_ip ?? raw.src_ip;

      let description = `${ctx.input.service} ${ctx.input.eventType}`;
      if (ctx.input.initiatedByEmail) {
        description += ` by ${ctx.input.initiatedByEmail}`;
      }
      if (success !== undefined) {
        description += success ? ' (success)' : ' (failed)';
      }

      return {
        type: `auth.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          eventId: ctx.input.eventId,
          eventType: ctx.input.eventType,
          timestamp: ctx.input.timestamp,
          service: ctx.input.service,
          userId: ctx.input.initiatedById,
          userEmail: ctx.input.initiatedByEmail,
          resourceId: ctx.input.resourceId,
          resourceType: ctx.input.resourceType,
          organization: ctx.input.organization,
          success,
          clientIp,
          message: description
        }
      };
    }
  })
  .build();
