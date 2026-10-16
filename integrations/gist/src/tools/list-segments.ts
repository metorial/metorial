import { SlateTool } from 'slates';
import { z } from 'zod';
import { GistClient } from '../lib/client';
import { requiredId, responseList, validatePagination } from '../lib/response';
import { spec } from '../spec';

export let listSegments = SlateTool.create(spec, {
  name: 'List Segments',
  key: 'list_segments',
  description: `List all contact segments in your Gist workspace. Optionally include contact counts for each segment.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional(),
      perPage: z.number().optional().describe('Results per page, at most 60'),
      includeCount: z.boolean().optional().describe('Include contact count per segment')
    })
  )
  .output(
    z.object({
      pages: z.any().optional(),
      rawResponse: z.any().optional().describe('Complete provider response data'),
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
    validatePagination({ page: ctx.input.page, perPage: ctx.input.perPage });
    let client = new GistClient({ token: ctx.auth.token });

    let data = await client.listSegments({
      include_count: ctx.input.includeCount,
      page: ctx.input.page,
      per_page: ctx.input.perPage
    });

    let segments = responseList(data.segments).map((s: any) => ({
      segmentId: requiredId(s.id),
      segmentName: s.name,
      count: s.count,
      createdAt: s.created_at !== undefined ? String(s.created_at) : undefined,
      updatedAt: s.updated_at !== undefined ? String(s.updated_at) : undefined
    }));

    return {
      output: { rawResponse: client.responses, segments, pages: data.pages },
      message: `Found **${segments.length}** segments.`
    };
  })
  .build();
