import { SlateTool } from 'slates';
import { z } from 'zod';
import { ControlPlaneClient } from '../lib/client';
import { spec } from '../spec';

export let getEventAudit = SlateTool.create(spec, {
  name: 'Get Event Audit',
  key: 'get_event_audit',
  description: `Retrieve event model information from RudderStack's Event Audit API for data governance. Returns metadata about all events and their schemas, payload versions, and data types flowing through your sources.
Useful for diagnosing inconsistencies in event data.`,
  constraints: ['Requires Event Audit API access for the workspace.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      sourceId: z.string().optional().describe('Filter event models by source ID'),
      eventModelId: z
        .string()
        .optional()
        .describe('Get detailed metadata for a specific event model')
    })
  )
  .output(
    z.object({
      eventModels: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of event models'),
      eventModelMetadata: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Detailed metadata for a specific event model')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ControlPlaneClient({ token: ctx.auth.token, region: ctx.config.region });
    if (ctx.input.eventModelId) {
      let eventModelMetadata = await client.getEventModelMetadata(ctx.input.eventModelId);
      return { output: { eventModelMetadata }, message: 'Retrieved event model metadata.' };
    }
    let eventModels = await client.getEventModels({ sourceId: ctx.input.sourceId });
    return {
      output: { eventModels },
      message: `Retrieved ${eventModels.length} event model(s).`
    };
  })
  .build();
