import { SlateTool } from 'slates';
import { z } from 'zod';
import { EventsClient } from '../lib/client';
import { spec } from '../spec';

export let sendEvent = SlateTool.create(spec, {
  name: 'Send Event',
  key: 'send_event',
  description: `Send a pageview or custom event to Plausible Analytics. Useful for server-side tracking, mobile apps, or environments where the JavaScript tracker cannot be used. The Events API requires no API key. HTTP acceptance does not guarantee recording; inspect dropped for bot-filtering rejection.`,
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
        .describe(
          'Actual visitor IP address for identification and geolocation when sending from a server; server or CDN addresses may be filtered'
        ),
      interactive: z
        .boolean()
        .optional()
        .describe(
          'Whether this event affects bounce detection. Defaults to true; set false for non-interactive custom events.'
        )
    })
  )
  .output(
    z.object({
      accepted: z.boolean().describe('Whether the event was accepted by Plausible'),
      dropped: z
        .boolean()
        .optional()
        .describe(
          'Whether Plausible explicitly reported dropping the event through bot filtering'
        )
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

    let result = await client.sendEvent({
      domain: ctx.input.domain,
      name: ctx.input.name,
      url: ctx.input.url,
      referrer: ctx.input.referrer,
      props: ctx.input.props,
      revenue,
      userAgent: ctx.input.userAgent,
      ipAddress: ctx.input.ipAddress,
      interactive: ctx.input.interactive
    });

    let accepted = result.status === 202 || result.status === 200;

    return {
      output: {
        accepted,
        dropped: result.dropped
      },
      message: result.dropped
        ? `Plausible received event **${ctx.input.name}** for **${ctx.input.domain}**, but bot filtering dropped it. Verify the actual visitor IP address and User-Agent.`
        : accepted
          ? `Event **${ctx.input.name}** was accepted for **${ctx.input.domain}** at ${ctx.input.url}.`
          : `Event **${ctx.input.name}** was not accepted (status: ${result.status}).`
    };
  })
  .build();
