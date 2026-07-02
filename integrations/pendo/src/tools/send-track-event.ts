import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import { createPendoClient } from './helpers';

let trackContextSchema = z.object({
  ip: z.string().optional().describe("Current user's IP address"),
  userAgent: z.string().optional().describe('User agent of the browser session'),
  url: z.string().optional().describe('Current browser page URL'),
  title: z.string().optional().describe('Current browser page title')
});

export let sendTrackEvent = SlateTool.create(spec, {
  name: 'Send Track Event',
  key: 'send_track_event',
  description: `Send a server-side Track Event to Pendo for an action that is not captured automatically by the Pendo agent. Requires the app-specific Track Event shared secret, which is different from the Engage integration key.`,
  instructions: [
    'Use the current timestamp whenever possible; Pendo processes old events outside the regular hourly flow.',
    'The Track Event shared secret must be saved in this integration auth profile.'
  ]
})
  .input(
    z.object({
      event: z.string().describe('Name of the action the visitor performed'),
      visitorId: z.string().describe('Unique visitor identifier'),
      accountId: z
        .string()
        .optional()
        .describe('Unique account identifier associated with the visitor'),
      timestamp: z
        .number()
        .int()
        .optional()
        .describe('Event time in milliseconds after Unix epoch; defaults to now'),
      properties: z
        .record(z.string(), z.any())
        .optional()
        .describe('Free-form event properties'),
      context: trackContextSchema
        .optional()
        .describe('Browser-session context when tracking on behalf of a user session')
    })
  )
  .output(
    z.object({
      event: z.string().describe('Track event name submitted to Pendo'),
      visitorId: z.string().describe('Visitor ID submitted to Pendo'),
      accountId: z.string().optional().describe('Account ID submitted to Pendo'),
      timestamp: z.number().describe('Timestamp submitted to Pendo'),
      success: z.boolean().describe('Whether Pendo accepted the track event'),
      raw: z.any().optional().describe('Raw response from Pendo')
    })
  )
  .handleInvocation(async ctx => {
    let client = createPendoClient(ctx);
    let timestamp = ctx.input.timestamp ?? Date.now();
    let result = await client.sendTrackEvent({
      event: ctx.input.event,
      visitorId: ctx.input.visitorId,
      accountId: ctx.input.accountId,
      timestamp,
      properties: ctx.input.properties,
      context: ctx.input.context
    });

    return {
      output: {
        event: ctx.input.event,
        visitorId: ctx.input.visitorId,
        accountId: ctx.input.accountId,
        timestamp,
        success: true,
        raw: result
      },
      message: `Sent Pendo track event **${ctx.input.event}** for visitor **${ctx.input.visitorId}**.`
    };
  })
  .build();
