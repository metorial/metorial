import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { validatePagination } from '../lib/validation';
import { spec } from '../spec';

export let listSegments = SlateTool.create(spec, {
  name: 'List Segments',
  key: 'list_segments',
  description: `List a page of segments in a Split workspace. Returns segment names, descriptions, associated traffic types, and pagination metadata. Call list_workspaces to discover workspace IDs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z
        .string()
        .optional()
        .describe(
          'Workspace ID. Call list_workspaces to discover IDs. Falls back to the configured default.'
        ),
      offset: z.number().optional().describe('Pagination offset. Defaults to 0.'),
      limit: z.number().optional().describe('Page size, between 1 and 50. Defaults to 20.')
    })
  )
  .output(
    z.object({
      segments: z.array(
        z.object({
          segmentName: z.string(),
          description: z.string().nullable().optional(),
          trafficTypeName: z.string().optional(),
          trafficTypeId: z.string().optional()
        })
      ),
      totalCount: z.number(),
      offset: z.number().optional(),
      limit: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let wsId = ctx.input.workspaceId ?? ctx.config.workspaceId;
    if (!wsId) {
      throw createApiServiceError(
        'workspaceId is required. Call list_workspaces to discover IDs, then pass the ID or set the default workspace.'
      );
    }

    let client = new Client(ctx.auth);
    validatePagination(ctx.input.offset, ctx.input.limit, 50);
    let result = await client.listSegments(wsId, {
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    let segments = result.objects.map(s => ({
      segmentName: s.name,
      description: s.description ?? null,
      trafficTypeName: s.trafficType?.name,
      trafficTypeId: s.trafficType?.id
    }));

    return {
      output: {
        segments,
        totalCount: result.totalCount,
        offset: result.offset,
        limit: result.limit
      },
      message: `Returned **${segments.length}** of **${result.totalCount}** segments, starting at offset ${result.offset}.`
    };
  })
  .build();
