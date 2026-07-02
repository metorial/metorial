import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import { createPendoClient, requireAtLeastOne } from './helpers';

export let updateSegment = SlateTool.create(spec, {
  name: 'Update Segment',
  key: 'update_segment',
  description: `Update an API-managed Pendo segment's name or visitor list. Pendo only allows this for segments created through the API.`,
  instructions: [
    'Provide name, visitorIds, or both.',
    'When visitorIds is provided, Pendo overwrites the previous visitor list and processes membership asynchronously.'
  ],
  constraints: ['Only segments created by the API can be updated.']
})
  .input(
    z.object({
      segmentId: z.string().describe('The API-created segment ID to update'),
      name: z.string().optional().describe('New segment name'),
      visitorIds: z
        .array(z.string())
        .optional()
        .describe('Replacement visitor ID list for the segment')
    })
  )
  .output(
    z.object({
      segmentId: z.string().describe('Updated segment ID'),
      name: z.string().optional().describe('Updated segment name'),
      visitorCount: z.number().optional().describe('Number of visitor IDs submitted'),
      raw: z.any().describe('Full raw segment update response from Pendo')
    })
  )
  .handleInvocation(async ctx => {
    requireAtLeastOne(
      [
        ['name', ctx.input.name],
        ['visitorIds', ctx.input.visitorIds]
      ],
      'name or visitorIds'
    );

    let client = createPendoClient(ctx);
    let segment = await client.updateSegment(ctx.input.segmentId, {
      name: ctx.input.name,
      visitorIds: ctx.input.visitorIds
    });

    return {
      output: {
        segmentId: segment.id || segment.segmentId || ctx.input.segmentId,
        name: segment.name || ctx.input.name,
        visitorCount: ctx.input.visitorIds?.length,
        raw: segment
      },
      message: `Updated Pendo segment **${ctx.input.segmentId}**.`
    };
  })
  .build();
