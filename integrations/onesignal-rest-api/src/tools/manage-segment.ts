import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let segmentSchema = z.object({
  segmentId: z.string().optional().describe('Segment UUID'),
  name: z.string().optional().describe('Segment name'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp'),
  isActive: z.boolean().optional().describe('Whether the segment is active'),
  readOnly: z
    .boolean()
    .optional()
    .describe('Whether the segment is read-only (system segment)')
});

export let createSegment = SlateTool.create(spec, {
  name: 'Create Segment',
  key: 'create_segment',
  description: `Create a dynamic audience segment with filter rules. Segments automatically update as users match the criteria. Combine filters with AND/OR operators.`,
  instructions: [
    'Filters use fields like "tag", "last_session", "first_session", "session_count", "language", "app_version", "country".',
    'Filter relations include "=", "!=", ">", "<", "exists", "not_exists", "time_elapsed_gt", "time_elapsed_lt".',
    'Use {"operator": "AND"} or {"operator": "OR"} between filter objects to combine conditions.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Segment name'),
      filters: z
        .array(z.record(z.string(), z.any()))
        .describe(
          'Array of filter objects and operators, e.g. [{"field":"tag","key":"level","relation":">","value":"10"},{"operator":"AND"},{"field":"country","relation":"=","value":"US"}]'
        )
    })
  )
  .output(
    z.object({
      segmentId: z.string().optional().describe('ID of the created segment'),
      success: z.boolean().describe('Whether creation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      appId: ctx.config.appId
    });

    let result = await client.createSegment(ctx.input.name, ctx.input.filters);

    return {
      output: {
        segmentId: result.id,
        success: result.success === true
      },
      message: result.success
        ? `Segment **${ctx.input.name}** created with ID **${result.id}**.`
        : `Failed to create segment **${ctx.input.name}**.`
    };
  })
  .build();

export let listSegments = SlateTool.create(spec, {
  name: 'List Segments',
  key: 'list_segments',
  description: `Retrieve all segments for the app with pagination support.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      offset: z.number().optional().describe('Pagination offset (default 0)'),
      limit: z
        .number()
        .optional()
        .describe('Number of segments to return (max 300, default 300)')
    })
  )
  .output(
    z.object({
      segments: z.array(segmentSchema).describe('List of segments'),
      totalCount: z.number().optional().describe('Total number of segments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      appId: ctx.config.appId
    });

    let result = await client.listSegments({
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    let segments = (result.segments || []).map((s: any) => ({
      segmentId: s.id,
      name: s.name,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
      isActive: s.is_active,
      readOnly: s.read_only
    }));

    return {
      output: {
        segments,
        totalCount: result.total_count
      },
      message: `Found **${result.total_count ?? segments.length}** segment(s).`
    };
  })
  .build();

export let deleteSegment = SlateTool.create(spec, {
  name: 'Delete Segment',
  key: 'delete_segment',
  description: `Delete a segment by its ID. System (read-only) segments cannot be deleted.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      segmentId: z.string().describe('ID of the segment to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      appId: ctx.config.appId
    });

    let result = await client.deleteSegment(ctx.input.segmentId);

    return {
      output: {
        success: result.success === true
      },
      message: result.success
        ? `Segment **${ctx.input.segmentId}** deleted.`
        : `Failed to delete segment **${ctx.input.segmentId}**.`
    };
  })
  .build();
