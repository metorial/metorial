import { SlateTool } from 'slates';
import { z } from 'zod';
import { LeadBoxerClient } from '../lib/client';
import { spec } from '../spec';

export let trackEvent = SlateTool.create(spec, {
  name: 'Track Event',
  key: 'track_event',
  description: `Send a server-side behavioral event to LeadBoxer. Use this to track backend actions like sign-ups, logins, subscription changes, or CRM activities. Custom properties are automatically enriched onto the lead's profile for progressive enrichment.`,
  instructions: [
    'Set `proxy` to true if you want to prevent automatic geo/user-agent enrichment from the server IP.',
    'Any custom properties will become attributes on the lead profile, enabling progressive enrichment over time.',
    'Use `leadboxerUserId` and `sessionId` to update existing lead records. Without them, a new user/session may be created.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      title: z
        .string()
        .describe(
          'Event title/name, e.g. "user_registered", "subscription_upgraded", "invoice_paid"'
        ),
      email: z.string().optional().describe('Email address of the user'),
      userId: z.string().optional().describe('Your own user identifier'),
      leadboxerUserId: z
        .string()
        .optional()
        .describe('Existing LeadBoxer user ID (uid) to update'),
      sessionId: z.string().optional().describe('Existing session ID (sid) to update'),
      url: z.string().optional().describe('URL associated with the event'),
      referrer: z.string().optional().describe('Referrer URL'),
      ip: z.string().optional().describe('Override IP address for geographic mapping'),
      proxy: z
        .boolean()
        .optional()
        .describe(
          'Set to true to prevent automatic geo/user-agent enrichment from the request IP'
        ),
      customProperties: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Custom name/value pairs to attach to the event. These properties are copied to the user profile.'
        )
    })
  )
  .output(
    z.object({
      eventId: z.string().optional().describe('ID of the tracked event'),
      sessionId: z.string().optional().describe('Session ID'),
      leadboxerUserId: z.string().optional().describe('LeadBoxer user ID'),
      rawResponse: z.any().optional().describe('Raw response from the tracking endpoint')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LeadBoxerClient({
      token: ctx.auth.token,
      datasetId: ctx.config.datasetId
    });

    let result = await client.trackEvent({
      title: ctx.input.title,
      email: ctx.input.email,
      userId: ctx.input.userId,
      leadboxerUserId: ctx.input.leadboxerUserId,
      sessionId: ctx.input.sessionId,
      url: ctx.input.url,
      referrer: ctx.input.referrer,
      ip: ctx.input.ip,
      proxy: ctx.input.proxy,
      customProperties: ctx.input.customProperties
    });

    let output = {
      eventId: typeof result === 'object' ? result.eventId || result.event_id : undefined,
      sessionId: typeof result === 'object' ? result.sessionId || result.sid : undefined,
      leadboxerUserId: typeof result === 'object' ? result.userId || result.uid : undefined,
      rawResponse: result
    };

    return {
      output,
      message: `Tracked event **${ctx.input.title}**${ctx.input.email ? ` for ${ctx.input.email}` : ''}${output.eventId ? ` (event ID: ${output.eventId})` : ''}.`
    };
  })
  .build();
