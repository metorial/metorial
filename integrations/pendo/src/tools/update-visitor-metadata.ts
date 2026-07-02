import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import { createPendoClient } from './helpers';

export let updateVisitorMetadata = SlateTool.create(spec, {
  name: 'Update Visitor Metadata',
  key: 'update_visitor_metadata',
  description: `Create or update custom metadata fields on a visitor record in Pendo. If the visitor does not exist, a new visitor record will be created with the provided metadata. Custom metadata fields will be automatically created if they don't exist.`,
  instructions: [
    'Metadata keys should use camelCase. The fields will be created as custom metadata in Pendo.',
    'If the visitor ID does not exist, a new record is created with only the provided metadata.'
  ]
})
  .input(
    z.object({
      visitorId: z.string().describe('The unique visitor ID to update or create'),
      metadata: z
        .record(z.string(), z.any())
        .describe('Key-value pairs of custom metadata to set on the visitor')
    })
  )
  .output(
    z.object({
      visitorId: z.string().describe('The visitor ID that was updated'),
      success: z.boolean().describe('Whether the update was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = createPendoClient(ctx);

    await client.updateVisitorMetadata(ctx.input.visitorId, ctx.input.metadata);

    return {
      output: {
        visitorId: ctx.input.visitorId,
        success: true
      },
      message: `Updated metadata for visitor **${ctx.input.visitorId}** with ${Object.keys(ctx.input.metadata).length} field(s).`
    };
  })
  .build();
