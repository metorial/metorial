import { SlateTool } from 'slates';
import { z } from 'zod';
import { SegmentClient } from '../lib/client';
import { spec } from '../spec';

export let listDestinations = SlateTool.create(spec, {
  name: 'List Destinations',
  key: 'list_destinations',
  description: `List all configured destinations in the Segment workspace. Returns destination details including name, enabled status, source connection, and metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      count: z.number().optional().describe('Number of destinations to return per page')
    })
  )
  .output(
    z.object({
      destinations: z
        .array(
          z.object({
            destinationId: z.string().describe('Destination ID'),
            destinationName: z.string().optional().describe('Display name'),
            sourceId: z.string().optional().describe('Connected source ID'),
            enabled: z.boolean().optional().describe('Whether enabled'),
            metadataId: z.string().optional().describe('Catalog metadata ID'),
            metadataName: z.string().optional().describe('Destination type name')
          })
        )
        .describe('List of destinations'),
      totalCount: z.number().optional().describe('Total number of destinations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SegmentClient(ctx.auth.token, ctx.config.region);
    let result = await client.listDestinations({ count: ctx.input.count });

    let destinations = (result?.destinations ?? []).map((d: any) => ({
      destinationId: d.id,
      destinationName: d.name,
      sourceId: d.sourceId,
      enabled: d.enabled,
      metadataId: d.metadata?.id,
      metadataName: d.metadata?.name
    }));

    return {
      output: {
        destinations,
        totalCount: destinations.length
      },
      message: `Found **${destinations.length}** destinations in the workspace`
    };
  })
  .build();
