import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { RipplingClient } from '../lib/client';
import { spec } from '../spec';

export let companyActivity = SlateTrigger.create(spec, {
  name: 'Company Activity',
  key: 'company_activity',
  description:
    '[Polling fallback] Polls for new company activity events such as employee changes, role updates, and other organizational events. Uses pagination to track new events since the last poll.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique identifier for the activity event'),
      eventType: z.string().describe('Type of the activity event'),
      eventData: z.any().describe('Raw event data from the activity feed'),
      occurredAt: z.string().optional().describe('When the event occurred')
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('Unique activity event identifier'),
      eventType: z.string().describe('Type of activity event'),
      employeeId: z
        .string()
        .optional()
        .describe('Employee ID if the event relates to an employee'),
      description: z.string().optional().describe('Human-readable description of the event'),
      occurredAt: z.string().optional().describe('When the event occurred'),
      rawEvent: z.any().optional().describe('Full event data')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new RipplingClient({ token: ctx.auth.token });

      let lastCursor = ctx.state?.lastCursor as string | undefined;
      let lastPollTime = ctx.state?.lastPollTime as string | undefined;

      let params: Record<string, any> = {
        limit: 50
      };

      if (lastCursor) {
        params.next = lastCursor;
      } else if (lastPollTime) {
        params.startDate = lastPollTime;
      }

      let response = await client.getCompanyActivity(params);

      let events = Array.isArray(response?.events || response)
        ? response.events || response
        : [];
      let nextCursor = response?.next;

      let inputs = events.map((event: any) => ({
        eventId: event.id || event.eventId || `${Date.now()}-${Math.random()}`,
        eventType: event.type || event.eventType || event.action || 'unknown',
        eventData: event,
        occurredAt: event.createdAt || event.timestamp || event.occurredAt
      }));

      return {
        inputs,
        updatedState: {
          lastCursor: nextCursor || lastCursor,
          lastPollTime: new Date().toISOString()
        }
      };
    },

    handleEvent: async ctx => {
      let event = ctx.input.eventData || {};

      return {
        type: `activity.${(ctx.input.eventType || 'unknown').toLowerCase().replace(/\s+/g, '_')}`,
        id: ctx.input.eventId,
        output: {
          eventId: ctx.input.eventId,
          eventType: ctx.input.eventType,
          employeeId: event.employeeId || event.roleId || event.role,
          description: event.description || event.message,
          occurredAt: ctx.input.occurredAt,
          rawEvent: event
        }
      };
    }
  })
  .build();
