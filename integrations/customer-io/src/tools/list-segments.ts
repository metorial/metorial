import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppClient } from '../lib/client';
import { spec } from '../spec';

export let listSegments = SlateTool.create(spec, {
  name: 'List Segments',
  key: 'list_segments',
  description: `Retrieve all segments in your Customer.io workspace. Segments are named groups of people who share characteristics or behaviors. Returns both data-driven and manual segments.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      segments: z
        .array(
          z.object({
            segmentId: z.number().describe('The segment ID'),
            name: z.string().describe('The segment name'),
            description: z.string().optional().describe('The segment description'),
            state: z.string().optional().describe('The segment state'),
            type: z.string().optional().describe('The segment type (data_driven or manual)'),
            tags: z.array(z.string()).optional().describe('Tags applied to the segment')
          })
        )
        .describe('Array of segments')
    })
  )
  .handleInvocation(async ctx => {
    let appClient = new AppClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await appClient.listSegments();
    let segments = (result?.segments ?? []).map((s: any) => ({
      segmentId: s.id,
      name: s.name,
      description: s.description,
      state: s.state,
      type: s.type,
      tags: s.tags
    }));

    return {
      output: { segments },
      message: `Found **${segments.length}** segments.`
    };
  })
  .build();
