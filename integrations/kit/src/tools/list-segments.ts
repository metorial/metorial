import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSegments = SlateTool.create(spec, {
  name: 'List Segments',
  key: 'list_segments',
  description: `List saved subscriber segments. Segments are reusable filters for grouping subscribers based on tags, custom fields, engagement, and other criteria.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      segments: z.array(
        z.object({
          segmentId: z.number().describe('Unique segment ID'),
          name: z.string().describe('Segment name'),
          createdAt: z.string().describe('When the segment was created')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listSegments();
    let segments = result.data.map(s => ({
      segmentId: s.id,
      name: s.name,
      createdAt: s.created_at
    }));

    return {
      output: { segments },
      message: `Found **${segments.length}** segments.`
    };
  })
  .build();
