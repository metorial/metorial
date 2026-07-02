import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendAlertEvent = SlateTool.create(spec, {
  name: 'Send Alert Event',
  key: 'send_alert_event',
  description: `Ingest an alert event into incident.io via an HTTP alert source. Use this to trigger or resolve alerts from external monitoring tools. Supports deduplication keys and custom metadata.`,
  instructions: [
    'You need an HTTP alert source configured in incident.io. Use the alert source config ID, not the alert source ID.'
  ],
  constraints: ['Rate limited to 120 events per minute per alert source.'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      alertSourceConfigId: z
        .string()
        .describe('ID of the HTTP alert source configuration to send the event to'),
      title: z.string().describe('Title of the alert'),
      status: z
        .enum(['firing', 'resolved'])
        .describe('Whether the alert is firing or resolved'),
      description: z.string().optional().describe('Detailed description of the alert'),
      deduplicationKey: z
        .string()
        .optional()
        .describe(
          'Unique key to deduplicate alerts; alerts with the same key are treated as the same alert'
        ),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Key-value pairs of custom metadata to attach to the alert'),
      sourceUrl: z
        .string()
        .optional()
        .describe('URL linking back to the alert source for context')
    })
  )
  .output(
    z.object({
      accepted: z.boolean().describe('Whether the alert event was accepted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.createAlertEvent(ctx.input.alertSourceConfigId, {
      title: ctx.input.title,
      status: ctx.input.status,
      description: ctx.input.description,
      deduplicationKey: ctx.input.deduplicationKey,
      metadata: ctx.input.metadata,
      sourceUrl: ctx.input.sourceUrl
    });

    return {
      output: {
        accepted: true
      },
      message: `Alert event "${ctx.input.title}" (${ctx.input.status}) sent successfully.`
    };
  })
  .build();
