import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let postEvent = SlateTool.create(spec, {
  name: 'Post Event',
  key: 'post_event',
  description: `Post an event to the Datadog event stream. Events represent deployments, alerts, configuration changes, or any significant occurrence in your environment.`,
  instructions: [
    'The text field supports markdown formatting.',
    'Alert types: "error", "warning", "info", "success", "user_update", "recommendation", "snapshot".',
    'Priority: "normal" or "low".'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      title: z.string().describe('Event title'),
      text: z.string().describe('Event body text (supports markdown)'),
      priority: z.enum(['normal', 'low']).optional().describe('Event priority'),
      host: z.string().optional().describe('Hostname to associate with the event'),
      tags: z
        .array(z.string())
        .optional()
        .describe('Tags to associate, e.g. ["env:production"]'),
      alertType: z
        .enum([
          'error',
          'warning',
          'info',
          'success',
          'user_update',
          'recommendation',
          'snapshot'
        ])
        .optional()
        .describe('Alert type for the event'),
      aggregationKey: z.string().optional().describe('Key for aggregating related events'),
      sourceTypeName: z
        .string()
        .optional()
        .describe('Source type name, e.g. "nagios", "hudson", "jenkins"')
    })
  )
  .output(
    z.object({
      eventId: z.number().describe('ID of the created event'),
      title: z.string().describe('Event title'),
      url: z.string().optional().describe('URL of the event in Datadog'),
      status: z.string().describe('Submission status')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let result = await client.postEvent(ctx.input);

    let event = result.event || result;

    return {
      output: {
        eventId: event.id,
        title: event.title || ctx.input.title,
        url: event.url,
        status: result.status || 'ok'
      },
      message: `Posted event **${ctx.input.title}** (ID: ${event.id})`
    };
  })
  .build();
