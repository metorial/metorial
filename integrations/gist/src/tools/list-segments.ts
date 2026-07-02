import { SlateTool } from 'slates';
import { z } from 'zod';
import { GistClient } from '../lib/client';
import { spec } from '../spec';

export let listSegments = SlateTool.create(spec, {
  name: 'List Segments',
  key: 'list_segments',
  description: `List all contact segments in your Gist workspace. Optionally include contact counts for each segment.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      includeCount: z.boolean().optional().describe('Include contact count per segment')
    })
  )
  .output(
    z.object({
      segments: z.array(
        z.object({
          segmentId: z.string(),
          segmentName: z.string().optional(),
          count: z.number().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new GistClient({ token: ctx.auth.token });

    let data = await client.listSegments({
      include_count: ctx.input.includeCount
    });

    let segments = (data.segments || []).map((s: any) => ({
      segmentId: String(s.id),
      segmentName: s.name,
      count: s.count,
      createdAt: s.created_at ? String(s.created_at) : undefined,
      updatedAt: s.updated_at ? String(s.updated_at) : undefined
    }));

    return {
      output: { segments },
      message: `Found **${segments.length}** segments.`
    };
  })
  .build();
