import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let hootsuiteEventsTrigger = SlateTrigger.create(spec, {
  name: 'Hootsuite Events',
  key: 'hootsuite_events',
  description:
    'Receives webhook events from Hootsuite, including message state changes, comment state changes, and application install/uninstall events.'
})
  .input(
    z.object({
      eventType: z.string().describe('Hootsuite event type identifier'),
      eventId: z.string().describe('Unique event ID for deduplication'),
      timestamp: z.string().optional().describe('Event timestamp'),
      resourceType: z.string().describe('Resource type (message, comment, application)'),
      resourceId: z.string().describe('Resource ID'),
      state: z.string().optional().describe('New state of the resource'),
      previousState: z.string().optional().describe('Previous state of the resource'),
      organizationId: z.string().optional().describe('Organization ID'),
      memberId: z.string().optional().describe('Member ID associated with the event'),
      socialProfileId: z.string().optional().describe('Social profile ID'),
      messageText: z.string().optional().describe('Message text if applicable'),
      postUrl: z.string().optional().describe('Published post URL if applicable'),
      raw: z.any().optional().describe('Raw event payload')
    })
  )
  .output(
    z.object({
      eventType: z
        .string()
        .describe('Hootsuite event type (e.g. com.hootsuite.messages.event.v1)'),
      resourceId: z.string().describe('ID of the affected resource'),
      state: z.string().optional().describe('New state of the resource'),
      previousState: z.string().optional().describe('Previous state of the resource'),
      organizationId: z.string().optional().describe('Organization ID'),
      memberId: z.string().optional().describe('Member ID associated with the event'),
      socialProfileId: z.string().optional().describe('Social profile ID'),
      messageText: z.string().optional().describe('Message text if applicable'),
      postUrl: z.string().optional().describe('Published post URL if applicable'),
      timestamp: z.string().optional().describe('Event timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      // Hootsuite sends webhook payloads as JSON arrays of event objects
      let events: any[] = Array.isArray(body) ? body : [body];

      let inputs = events
        .filter((event: any) => {
          // Ignore ping events
          let type = event.type || event.eventType || '';
          return !type.includes('ping');
        })
        .map((event: any) => {
          let eventType = event.type || event.eventType || 'unknown';
          let eventId =
            event.id ||
            event.eventId ||
            `${eventType}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

          let resourceType = 'unknown';
          if (eventType.includes('messages')) resourceType = 'message';
          else if (eventType.includes('comments')) resourceType = 'comment';
          else if (eventType.includes('application')) resourceType = 'application';

          let data = event.data || event;

          return {
            eventType,
            eventId: String(eventId),
            timestamp: event.timestamp || event.sentAt || new Date().toISOString(),
            resourceType,
            resourceId: String(
              data.messageId || data.commentId || data.applicationId || data.id || eventId
            ),
            state: data.state || data.status,
            previousState: data.previousState,
            organizationId: data.organizationId ? String(data.organizationId) : undefined,
            memberId: data.memberId ? String(data.memberId) : undefined,
            socialProfileId: data.socialProfileId ? String(data.socialProfileId) : undefined,
            messageText: data.text || data.messageText,
            postUrl: data.postUrl,
            raw: event
          };
        });

      return { inputs };
    },

    handleEvent: async ctx => {
      let { resourceType } = ctx.input;

      let typePrefix = resourceType || 'event';
      let stateSuffix = ctx.input.state ? ctx.input.state.toLowerCase() : 'updated';
      let outputType = `${typePrefix}.${stateSuffix}`;

      return {
        type: outputType,
        id: ctx.input.eventId,
        output: {
          eventType: ctx.input.eventType,
          resourceId: ctx.input.resourceId,
          state: ctx.input.state,
          previousState: ctx.input.previousState,
          organizationId: ctx.input.organizationId,
          memberId: ctx.input.memberId,
          socialProfileId: ctx.input.socialProfileId,
          messageText: ctx.input.messageText,
          postUrl: ctx.input.postUrl,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
