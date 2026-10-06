import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { HoneybadgerReportingClient } from '../lib/reporting-client';
import { spec } from '../spec';

export let sendEvents = SlateTool.create(spec, {
  name: 'Send Events',
  key: 'send_events',
  description: `Send custom events to Honeybadger Insights. Accepted events are processed asynchronously and can then be queried in Insights. Useful for tracking user signups, payment events, performance metrics, or any structured data.`,
  instructions: [
    'Each event is a JSON object (nested structures are supported) with arbitrary fields.',
    'A `ts` field (RFC3339 timestamp) is optional — server time is used if omitted.',
    'Requires a project API key configured in authentication.'
  ],
  constraints: ['Max 5MB total payload, 100KB per individual event.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      events: z
        .array(z.record(z.string(), z.unknown()))
        .describe(
          'Array of event objects to send. Each is a JSON object (nested structures are supported) with arbitrary fields.'
        )
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the events were sent successfully'),
      eventCount: z.number().describe('Number of events sent')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.projectToken) {
      throw createApiServiceError(
        'A project API key is required to send events. Configure it in your authentication settings.'
      );
    }
    let reportingClient = new HoneybadgerReportingClient({
      projectToken: ctx.auth.projectToken,
      region: ctx.auth.region
    });
    await reportingClient.sendEvents(ctx.input.events);

    return {
      output: {
        success: true,
        eventCount: ctx.input.events.length
      },
      message: `Accepted **${ctx.input.events.length}** event(s) to Honeybadger Insights.`
    };
  })
  .build();
