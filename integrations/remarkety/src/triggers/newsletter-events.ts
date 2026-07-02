import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let newsletterEventInputSchema = z.object({
  eventType: z.string().describe('Type of newsletter event'),
  timestamp: z.string().describe('Event timestamp'),
  email: z.string().describe('Subscriber email address'),
  signupIp: z.string().optional().describe('IP address at signup'),
  optinIp: z.string().optional().describe('IP address at opt-in confirmation')
});

export let newsletterEventsTrigger = SlateTrigger.create(spec, {
  name: 'Newsletter Events',
  key: 'newsletter_events',
  description:
    'Triggers when a contact subscribes to the newsletter in Remarkety, whether via popup, API, or admin action.'
})
  .input(newsletterEventInputSchema)
  .output(
    z.object({
      subscriberEmail: z.string().describe('Email address of the subscriber'),
      timestamp: z.string().describe('Event timestamp'),
      signupIpAddress: z.string().optional().describe('IP address used during signup'),
      optinIpAddress: z
        .string()
        .optional()
        .describe('IP address used during opt-in confirmation')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, unknown>;
      let eventTopic =
        ctx.request.headers.get('X-Event-Topic') ||
        ctx.request.headers.get('x-event-topic') ||
        '';

      let eventType =
        typeof eventTopic === 'string'
          ? eventTopic
          : String(data.event_type || data.type || 'newsletter/subscribed');

      return {
        inputs: [
          {
            eventType,
            timestamp: String(data.timestamp || new Date().toISOString()),
            email: String(data.email || ''),
            signupIp: data.signup_ip ? String(data.signup_ip) : undefined,
            optinIp: data.optin_ip ? String(data.optin_ip) : undefined
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let id = `newsletter-subscribed-${ctx.input.email}-${ctx.input.timestamp}`;

      return {
        type: 'newsletter.subscribed',
        id,
        output: {
          subscriberEmail: ctx.input.email,
          timestamp: ctx.input.timestamp,
          signupIpAddress: ctx.input.signupIp,
          optinIpAddress: ctx.input.optinIp
        }
      };
    }
  })
  .build();
