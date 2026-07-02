import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getDeploymentEventsTool = SlateTool.create(spec, {
  name: 'Get Deployment Events',
  key: 'get_deployment_events',
  description:
    'Retrieve deployment build events and logs for a Vercel deployment. Useful for debugging failed or slow builds.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      deploymentIdOrUrl: z
        .string()
        .describe('Deployment ID (dpl_...) or deployment URL hostname'),
      direction: z
        .enum(['forward', 'backward'])
        .optional()
        .describe('Sort order for returned events'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of events to return. Use -1 for all available logs.'),
      buildId: z
        .string()
        .optional()
        .describe('Deployment build ID to filter logs by (the API parameter is name)'),
      since: z.number().optional().describe('Only return events after this timestamp'),
      until: z.number().optional().describe('Only return events before this timestamp'),
      statusCode: z
        .string()
        .optional()
        .describe('HTTP status code or range filter for runtime events, such as 5xx'),
      delimiter: z
        .boolean()
        .optional()
        .describe('Whether to include delimiter events in the response'),
      builds: z.boolean().optional().describe('Whether to include build events')
    })
  )
  .output(
    z.object({
      events: z
        .array(
          z.object({
            type: z.string().optional().describe('Event type'),
            created: z.number().optional().describe('Event timestamp'),
            payload: z.any().optional().describe('Raw Vercel event payload')
          })
        )
        .describe('Deployment events returned by Vercel')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      teamId: ctx.config.teamId
    });

    let result = await client.getDeploymentEvents(ctx.input.deploymentIdOrUrl, {
      direction: ctx.input.direction,
      limit: ctx.input.limit,
      buildId: ctx.input.buildId,
      since: ctx.input.since,
      until: ctx.input.until,
      statusCode: ctx.input.statusCode,
      delimiter: ctx.input.delimiter,
      builds: ctx.input.builds
    });

    let events = (Array.isArray(result) ? result : []).map((event: any) => ({
      type: event.type,
      created: event.created,
      payload: event.payload
    }));

    return {
      output: { events },
      message: `Found **${events.length}** event(s) for deployment "${ctx.input.deploymentIdOrUrl}".`
    };
  })
  .build();
