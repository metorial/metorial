import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let emailEvents = SlateTrigger.create(spec, {
  name: 'Email Events',
  key: 'email_events',
  description:
    'Receives email delivery and engagement events from SendGrid Event Webhook. Covers delivery events (processed, delivered, deferred, bounce, dropped), engagement events (open, click, unsubscribe, spam report, group unsubscribe/resubscribe), and account events.',
  instructions: [
    'Configure the SendGrid Event Webhook in Settings > Mail Settings > Event Webhook to point to the provided webhook URL.',
    'Select which event types you want to receive in the SendGrid dashboard.'
  ]
})
  .input(
    z.object({
      eventType: z.string().describe('SendGrid event type (e.g. delivered, open, bounce)'),
      email: z.string().describe('Recipient email address'),
      timestamp: z.number().describe('Unix timestamp of the event'),
      sgEventId: z.string().describe('Unique SendGrid event ID'),
      sgMessageId: z.string().optional().describe('SendGrid message ID'),
      category: z.array(z.string()).optional().describe('Email categories'),
      reason: z.string().optional().describe('Reason for bounce, drop, or block'),
      status: z.string().optional().describe('Bounce or delivery status code'),
      url: z.string().optional().describe('Clicked URL (for click events)'),
      useragent: z.string().optional().describe('User agent (for open/click events)'),
      ip: z.string().optional().describe('IP address of the event'),
      asmGroupId: z.number().optional().describe('Suppression group ID'),
      response: z.string().optional().describe('Full response from the receiving server')
    })
  )
  .output(
    z.object({
      email: z.string().describe('Recipient email address'),
      sgMessageId: z.string().optional().describe('SendGrid message ID'),
      timestamp: z.string().describe('ISO 8601 timestamp of the event'),
      category: z.array(z.string()).optional().describe('Email categories'),
      reason: z.string().optional().describe('Reason for bounce, drop, or block'),
      status: z.string().optional().describe('Bounce or delivery status code'),
      url: z.string().optional().describe('Clicked URL (for click events)'),
      useragent: z.string().optional().describe('User agent string'),
      ip: z.string().optional().describe('IP address'),
      asmGroupId: z.number().optional().describe('Suppression group ID'),
      response: z.string().optional().describe('Response from receiving server')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any[];

      if (!Array.isArray(body)) {
        return { inputs: [] };
      }

      let inputs = body.map((event: any) => ({
        eventType: event.event || 'unknown',
        email: event.email || '',
        timestamp: event.timestamp || 0,
        sgEventId: event.sg_event_id || `${event.timestamp}-${event.email}-${event.event}`,
        sgMessageId: event.sg_message_id || undefined,
        category: Array.isArray(event.category)
          ? event.category
          : event.category
            ? [event.category]
            : undefined,
        reason: event.reason || undefined,
        status: event.status || undefined,
        url: event.url || undefined,
        useragent: event.useragent || undefined,
        ip: event.ip || undefined,
        asmGroupId: event.asm_group_id || undefined,
        response: event.response || undefined
      }));

      return { inputs };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.eventType;
      let type = `email.${eventType}`;

      return {
        type,
        id: ctx.input.sgEventId,
        output: {
          email: ctx.input.email,
          sgMessageId: ctx.input.sgMessageId || undefined,
          timestamp: ctx.input.timestamp
            ? new Date(ctx.input.timestamp * 1000).toISOString()
            : new Date().toISOString(),
          category: ctx.input.category || undefined,
          reason: ctx.input.reason || undefined,
          status: ctx.input.status || undefined,
          url: ctx.input.url || undefined,
          useragent: ctx.input.useragent || undefined,
          ip: ctx.input.ip || undefined,
          asmGroupId: ctx.input.asmGroupId || undefined,
          response: ctx.input.response || undefined
        }
      };
    }
  })
  .build();
