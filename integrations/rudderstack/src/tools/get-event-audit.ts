import { SlateTool } from 'slates';
import { z } from 'zod';
import { ControlPlaneClient } from '../lib/client';
import { spec } from '../spec';

export let getEventAudit = SlateTool.create(spec, {
  name: 'Get Event Audit',
  key: 'get_event_audit',
  description: `Retrieve event model information from RudderStack's Event Audit API for data governance. Returns metadata about all events and their schemas, payload versions, and data types flowing through your sources.
Useful for diagnosing inconsistencies in event data.`,
  constraints: ['Requires Org Admin role to be enabled.'],
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
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of event models'),
      eventModelMetadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Detailed metadata for a specific event model')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ControlPlaneClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    if (ctx.input.eventModelId) {
      let metadata = await client.getEventModelMetadata(ctx.input.eventModelId);

      return {
        output: { eventModelMetadata: metadata },
        message: `Retrieved metadata for event model \`${ctx.input.eventModelId}\`.`
      };
    }

    let result = await client.getEventModels({ sourceId: ctx.input.sourceId });
    let models = result.eventModels || result;

    return {
      output: { eventModels: Array.isArray(models) ? models : [] },
      message: `Found **${Array.isArray(models) ? models.length : 0}** event model(s)${ctx.input.sourceId ? ` for source \`${ctx.input.sourceId}\`` : ''}.`
    };
  })
  .build();
