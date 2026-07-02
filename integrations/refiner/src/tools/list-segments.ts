import { SlateTool } from 'slates';
import { z } from 'zod';
import { RefinerClient } from '../lib/client';
import { spec } from '../spec';

export let listSegments = SlateTool.create(spec, {
  name: 'List Segments',
  key: 'list_segments',
  description: `Retrieve all segments in your Refiner project, including both data-driven and manual segments. Returns each segment's UUID, name, and whether it is a manual segment.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination'),
      pageLength: z.number().optional().describe('Number of results per page (max 1000)')
    })
  )
  .output(
    z.object({
      segments: z
        .array(
          z.object({
            segmentUuid: z.string().describe('UUID of the segment'),
            name: z.string().describe('Name of the segment'),
            isManual: z.boolean().describe('Whether this is a manual segment')
          })
        )
        .describe('List of segments'),
      pagination: z
        .object({
          itemsCount: z.number().describe('Total number of items'),
          currentPage: z.number().describe('Current page number'),
          lastPage: z.number().describe('Last page number'),
          pageLength: z.number().describe('Items per page')
        })
        .describe('Pagination information')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RefinerClient({ token: ctx.auth.token });

    let result = (await client.listSegments({
      page: ctx.input.page,
      pageLength: ctx.input.pageLength
    })) as any;

    let segments = (result.items || []).map((item: any) => ({
      segmentUuid: item.uuid,
      name: item.name,
      isManual: item.is_manual ?? false
    }));

    let pagination = result.pagination || {};

    return {
      output: {
        segments,
        pagination: {
          itemsCount: pagination.items_count ?? 0,
          currentPage: pagination.current_page ?? 1,
          lastPage: pagination.last_page ?? 1,
          pageLength: pagination.page_length ?? 50
        }
      },
      message: `Found **${segments.length}** segments (page ${pagination.current_page ?? 1} of ${pagination.last_page ?? 1}).`
    };
  })
  .build();
