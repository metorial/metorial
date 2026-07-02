import { SlateTool } from 'slates';
import { z } from 'zod';
import { EventsClient } from '../lib/client';
import { spec } from '../spec';

export let sendEvent = SlateTool.create(spec, {
  name: 'Send Event',
  key: 'send_event',
  description: `Send a pageview or custom event to Plausible Analytics. Useful for server-side tracking, mobile apps, or environments where the JavaScript tracker cannot be used. No API key is required — authentication is based on the domain matching a registered site.`,
  instructions: [
    'Use name "pageview" for standard pageviews, or any custom string for custom events.',
    'The url must be a full URL including protocol (e.g., "https://example.com/page").',
    'When sending from a server, provide userAgent and ipAddress for accurate visitor identification and geolocation.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      domain: z
        .string()
        .describe('Site domain as registered in Plausible (e.g., "example.com")'),
      name: z
        .string()
        .describe(
          'Event name. Use "pageview" for page views, or any string for custom events.'
        ),
      url: z
        .string()
        .describe(
          'Full page URL where the event occurred (e.g., "https://example.com/blog/post")'
        ),
      referrer: z.string().optional().describe('Referrer URL for the event'),
      props: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom properties as key-value pairs (max 30)'),
      revenue: z
        .object({
          currency: z.string().describe('ISO 4217 currency code (e.g., "USD", "EUR")'),
          amount: z.union([z.string(), z.number()]).describe('Revenue amount')
        })
        .optional()
        .describe('Revenue data for the event (requires revenue goals configured)'),
      userAgent: z
        .string()
        .optional()
        .describe('User-Agent string for visitor identification when sending from a server'),
      ipAddress: z
        .string()
        .optional()
        .describe('Client IP address for geolocation when sending from a server')
    })
  )
  .output(
    z.object({
      accepted: z.boolean().describe('Whether the event was accepted by Plausible')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EventsClient({
      baseUrl: ctx.config.baseUrl
    });

    let revenue =
      ctx.input.revenue && ctx.input.revenue.amount !== undefined
        ? {
            currency: ctx.input.revenue.currency,
            amount: ctx.input.revenue.amount
          }
        : undefined;

    let status = await client.sendEvent({
      domain: ctx.input.domain,
      name: ctx.input.name,
      url: ctx.input.url,
      referrer: ctx.input.referrer,
      props: ctx.input.props,
      revenue,
      userAgent: ctx.input.userAgent,
      ipAddress: ctx.input.ipAddress
    });

    let accepted = status === 202 || status === 200;

    return {
      output: {
        accepted
      },
      message: accepted
        ? `Event **${ctx.input.name}** was accepted for **${ctx.input.domain}** at ${ctx.input.url}.`
        : `Event **${ctx.input.name}** was not accepted (status: ${status}).`
    };
  })
  .build();
