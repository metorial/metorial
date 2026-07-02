import { SlateTool } from 'slates';
import { z } from 'zod';
import { TrackClient } from '../lib/client';
import { customerIoServiceError } from '../lib/errors';
import { spec } from '../spec';

export let trackEvent = SlateTool.create(spec, {
  name: 'Track Event',
  key: 'track_event',
  description: `Track a custom event for a person or an anonymous event. Events represent actions people perform — button clicks, purchases, page views, etc. You can use events to trigger campaigns and segment users.
Supports tracking events attributed to a specific person, anonymous events (associated later), and page/screen views.`,
  instructions: [
    'For person events, provide a personIdentifier.',
    'For anonymous events, omit personIdentifier and optionally provide an anonymousId.',
    'Set eventType to "page" for page views. Default is a standard event.',
    'Custom properties can be included in the properties field.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      personIdentifier: z
        .string()
        .optional()
        .describe(
          'The person identifier to attribute this event to. Omit for anonymous events.'
        ),
      eventName: z
        .string()
        .describe('The name of the event (e.g. "purchase", "button_click", "/home")'),
      eventId: z
        .string()
        .optional()
        .describe('Optional ULID used by Customer.io to deduplicate events'),
      eventType: z
        .enum(['event', 'page', 'screen'])
        .default('event')
        .describe('The type of event: standard event, page view, or screen view'),
      properties: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom properties/data to include with the event'),
      anonymousId: z
        .string()
        .optional()
        .describe('An anonymous ID for events without a known person identifier'),
      timestamp: z
        .number()
        .optional()
        .describe('Unix timestamp to backdate the event (seconds since epoch)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the event was tracked successfully')
    })
  )
  .handleInvocation(async ctx => {
    let trackClient = new TrackClient({
      siteId: ctx.auth.siteId,
      trackApiKey: ctx.auth.trackApiKey,
      region: ctx.config.region
    });

    if (ctx.input.personIdentifier) {
      if (ctx.input.eventType === 'screen' && !ctx.input.anonymousId) {
        throw customerIoServiceError(
          'anonymousId is required for screen events attributed to a person.'
        );
      }

      await trackClient.trackEvent(ctx.input.personIdentifier, {
        id: ctx.input.eventId,
        type: ctx.input.eventType,
        name: ctx.input.eventName,
        data: ctx.input.properties,
        anonymous_id: ctx.input.anonymousId,
        timestamp: ctx.input.timestamp
      });
    } else {
      await trackClient.trackAnonymousEvent({
        id: ctx.input.eventId,
        type: ctx.input.eventType,
        name: ctx.input.eventName,
        data: ctx.input.properties,
        anonymous_id: ctx.input.anonymousId,
        timestamp: ctx.input.timestamp
      });
    }

    return {
      output: { success: true },
      message: ctx.input.personIdentifier
        ? `Tracked **${ctx.input.eventType}** event "${ctx.input.eventName}" for person **${ctx.input.personIdentifier}**.`
        : `Tracked anonymous **${ctx.input.eventType}** event "${ctx.input.eventName}".`
    };
  })
  .build();
