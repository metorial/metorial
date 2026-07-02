import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import { createPendoClient } from './helpers';

export let createSegment = SlateTool.create(spec, {
  name: 'Create Segment',
  key: 'create_segment',
  description: `Create a new API-managed segment in Pendo from a list of visitor IDs. Segments are created instantly, but adding visitors is processed asynchronously.`,
  instructions: [
    'The integration key must have write access enabled to create segments.',
    'Segments are processed asynchronously. It may take some time for all visitors to be added.',
    'The official Pendo segment upload API accepts visitor IDs, not account IDs.'
  ],
  constraints: ['Segments process one at a time per subscription.']
})
  .input(
    z.object({
      name: z.string().describe('Name for the new segment'),
      visitorIds: z
        .array(z.string())
        .min(1)
        .describe('List of visitor IDs to include in the segment')
    })
  )
  .output(
    z.object({
      segmentId: z.string().describe('ID of the newly created segment'),
      name: z.string().describe('Name of the created segment'),
      raw: z.any().describe('Full raw segment record from Pendo')
    })
  )
  .handleInvocation(async ctx => {
    let client = createPendoClient(ctx);

    let segment = await client.createSegment({
      name: ctx.input.name,
      visitorIds: ctx.input.visitorIds
    });

    return {
      output: {
        segmentId: segment.id || segment.segmentId || '',
        name: segment.name || ctx.input.name,
        raw: segment
      },
      message: `Created segment **${ctx.input.name}** in Pendo.`
    };
  })
  .build();
