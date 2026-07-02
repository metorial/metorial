import { SlateTool } from 'slates';
import { z } from 'zod';
import { PendoClient } from '../lib/client';
import { spec } from '../spec';

export let createSegment = SlateTool.create(spec, {
  name: 'Create Segment',
  key: 'create_segment',
  description: `Create a new segment in Pendo from a list of visitor or account IDs. Segments created via API are processed asynchronously — visitors are added in batches after the segment is created.`,
  instructions: [
    'The integration key must have write access enabled to create segments.',
    'Segments are processed asynchronously. It may take some time for all visitors to be added.'
  ],
  constraints: ['Segments process one at a time per subscription.']
})
  .input(
    z.object({
      name: z.string().describe('Name for the new segment'),
      visitorIds: z
        .array(z.string())
        .optional()
        .describe('List of visitor IDs to include in the segment'),
      accountIds: z
        .array(z.string())
        .optional()
        .describe('List of account IDs to include in the segment')
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
    let client = new PendoClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let segment = await client.createSegment({
      name: ctx.input.name,
      visitorIds: ctx.input.visitorIds,
      accountIds: ctx.input.accountIds
    });

    return {
      output: {
        segmentId: segment.id || '',
        name: segment.name || ctx.input.name,
        raw: segment
      },
      message: `Created segment **${ctx.input.name}** in Pendo.`
    };
  })
  .build();
