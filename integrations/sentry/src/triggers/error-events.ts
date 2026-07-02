import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let errorEventsTrigger = SlateTrigger.create(spec, {
  name: 'Error Events',
  key: 'error_events',
  description:
    'Triggers when a new error event is received by Sentry. Contains the full error event payload including exception data, stack trace, and contextual information. Configure the webhook URL in your Sentry integration under Settings > Developer Settings.'
})
  .input(
    z.object({
      eventId: z.string().describe('The event ID'),
      payload: z.any().describe('Full webhook payload')
    })
  )
  .output(
    z.object({
      eventId: z.string(),
      issueId: z.string().optional(),
      issueUrl: z.string().optional(),
      title: z.string().optional(),
      culprit: z.string().optional(),
      level: z.string().optional(),
      message: z.string().optional(),
      platform: z.string().optional(),
      projectSlug: z.string().optional(),
      timestamp: z.string().optional(),
      url: z.string().optional(),
      tags: z
        .array(
          z.object({
            key: z.string(),
            value: z.string()
          })
        )
        .optional(),
      exception: z.any().optional().describe('Exception data including stack trace'),
      contexts: z.any().optional().describe('Contextual data (browser, OS, device, etc.)')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let eventData = body.data?.event || body.data || {};

      return {
        inputs: [
          {
            eventId: String(eventData.event_id || eventData.id || ''),
            payload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let event = ctx.input.payload?.data?.event || ctx.input.payload?.data || {};

      let tags = (event.tags || []).map((t: any) => {
        if (Array.isArray(t)) return { key: t[0], value: t[1] };
        return { key: t.key || t.tag || '', value: t.value || '' };
      });

      return {
        type: 'error.created',
        id: `error-${ctx.input.eventId || Date.now()}`,
        output: {
          eventId: String(event.event_id || event.id || ctx.input.eventId),
          issueId: event.issue_id
            ? String(event.issue_id)
            : event.group_id
              ? String(event.group_id)
              : undefined,
          issueUrl: event.issue_url || ctx.input.payload?.data?.issue_url,
          title: event.title,
          culprit: event.culprit,
          level: event.level,
          message: event.message || event.logentry?.formatted || event.logentry?.message,
          platform: event.platform,
          projectSlug: event.project?.slug || event.project,
          timestamp: event.timestamp || event.datetime,
          url: event.url || ctx.input.payload?.data?.url,
          tags,
          exception: event.exception,
          contexts: event.contexts
        }
      };
    }
  })
  .build();
