import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppcuesClient } from '../lib/client';
import { spec } from '../spec';

export let getSegment = SlateTool.create(spec, {
  name: 'Get Segment',
  key: 'get_segment',
  description:
    'Retrieve a user segment by ID, including its name, description, and creation and update information. Use List Segments to discover segment IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      segmentId: z
        .string()
        .describe('Segment ID. Use List Segments to discover available segments.')
    })
  )
  .output(
    z.object({
      segmentId: z.string().describe('The segment ID'),
      name: z.string().describe('The segment name'),
      description: z.string().optional().describe('The segment description'),
      createdAt: z.string().optional().describe('When the segment was created'),
      updatedAt: z.string().optional().describe('When the segment was last updated'),
      createdBy: z.string().optional().describe('ID of the segment creator'),
      updatedBy: z.string().optional().describe('ID of the last updater'),
      url: z.string().optional().describe('URL for the segment resource')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AppcuesClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      region: ctx.config.region
    });
    let segment = await client.getSegment(ctx.input.segmentId);
    return {
      output: {
        segmentId: segment.id || ctx.input.segmentId,
        name: segment.name || '',
        description: segment.description ?? undefined,
        createdAt: segment.created_at || undefined,
        updatedAt: segment.updated_at || undefined,
        createdBy: segment.created_by || undefined,
        updatedBy: segment.updated_by || undefined,
        url: segment.url || undefined
      },
      message: `Retrieved segment **${segment.name || ctx.input.segmentId}**.`
    };
  })
  .build();
