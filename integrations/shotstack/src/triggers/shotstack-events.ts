import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let shotstackEventsTrigger = SlateTrigger.create(spec, {
  name: 'Shotstack Events',
  key: 'shotstack_events',
  description:
    'Receives webhook callbacks for render completion, asset hosting, and ingestion events. Configure the webhook URL in your Shotstack render, ingest, or transfer request callback field.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of event (e.g. edit, serve, ingest)'),
      action: z.string().describe('Action performed (e.g. render, copy, source)'),
      eventId: z.string().describe('Unique event identifier (resource ID + action)'),
      resourceId: z.string().describe('ID of the affected resource'),
      owner: z.string().optional().describe('Account owner ID'),
      status: z.string().describe('Result status (done, ready, failed)'),
      url: z.string().optional().describe('Output URL of the completed resource'),
      error: z.string().optional().describe('Error message if failed'),
      completed: z.string().optional().describe('Completion timestamp'),
      renderId: z.string().optional().describe('Associated render ID (for serve events)')
    })
  )
  .output(
    z.object({
      resourceId: z
        .string()
        .describe('ID of the affected resource (render ID, asset ID, or source ID)'),
      eventType: z.string().describe('Type of event (edit, serve, ingest)'),
      action: z.string().describe('Action performed (render, copy, source)'),
      status: z.string().describe('Result status'),
      url: z.string().optional().describe('Output URL when successful'),
      error: z.string().optional().describe('Error details if failed'),
      owner: z.string().optional().describe('Account owner ID'),
      completed: z.string().optional().describe('Completion timestamp'),
      renderId: z
        .string()
        .optional()
        .describe('Associated render ID (for serve/hosting events)')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;

      let eventType = data.type || 'unknown';
      let action = data.action || 'unknown';
      let resourceId = data.id || '';
      let eventId = `${resourceId}-${eventType}-${action}`;
      let errorStr = data.error
        ? typeof data.error === 'string'
          ? data.error
          : JSON.stringify(data.error)
        : undefined;

      return {
        inputs: [
          {
            eventType,
            action,
            eventId,
            resourceId,
            owner: data.owner,
            status: data.status || 'unknown',
            url: data.url,
            error: errorStr,
            completed: data.completed,
            renderId: data.render
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let typeStr = `${ctx.input.eventType}.${ctx.input.action}`;

      return {
        type: typeStr,
        id: ctx.input.eventId,
        output: {
          resourceId: ctx.input.resourceId,
          eventType: ctx.input.eventType,
          action: ctx.input.action,
          status: ctx.input.status,
          url: ctx.input.url,
          error: ctx.input.error,
          owner: ctx.input.owner,
          completed: ctx.input.completed,
          renderId: ctx.input.renderId
        }
      };
    }
  })
  .build();
