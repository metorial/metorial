import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrazeClient } from '../lib/client';
import { spec } from '../spec';

export let listSegments = SlateTool.create(spec, {
  name: 'List Segments',
  key: 'list_segments',
  description: `Retrieve a list of audience segments from Braze. Returns segment names, IDs, and analytics tracking status. Use the segment ID to get details or export users within a segment.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (starts at 0)'),
      sortDirection: z.enum(['asc', 'desc']).optional().describe('Sort by creation time')
    })
  )
  .output(
    z.object({
      segments: z
        .array(
          z.object({
            segmentId: z.string().describe('Segment ID'),
            name: z.string().describe('Segment name'),
            analyticsTrackingEnabled: z
              .boolean()
              .optional()
              .describe('Whether analytics tracking is enabled'),
            tags: z.array(z.string()).optional().describe('Tags associated with the segment')
          })
        )
        .describe('List of segments'),
      message: z.string().describe('Response status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BrazeClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    let result = await client.listSegments({
      page: ctx.input.page,
      sortDirection: ctx.input.sortDirection
    });

    let segments = (result.segments ?? []).map((s: any) => ({
      segmentId: s.id,
      name: s.name,
      analyticsTrackingEnabled: s.analytics_tracking_enabled,
      tags: s.tags
    }));

    return {
      output: {
        segments,
        message: result.message
      },
      message: `Found **${segments.length}** segment(s)${ctx.input.page !== undefined ? ` (page ${ctx.input.page})` : ''}.`
    };
  })
  .build();

export let getSegmentDetails = SlateTool.create(spec, {
  name: 'Get Segment Details',
  key: 'get_segment_details',
  description: `Retrieve detailed information about a specific Braze segment, including its filters, size, and tracking status.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      segmentId: z.string().describe('ID of the segment to retrieve details for')
    })
  )
  .output(
    z.object({
      segmentId: z.string().describe('Segment ID'),
      name: z.string().optional().describe('Segment name'),
      description: z.string().optional().describe('Segment description'),
      analyticsTrackingEnabled: z
        .boolean()
        .optional()
        .describe('Whether analytics tracking is enabled'),
      tags: z.array(z.string()).optional().describe('Tags on the segment'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      message: z.string().describe('Response status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BrazeClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    let result = await client.getSegmentDetails(ctx.input.segmentId);

    return {
      output: {
        segmentId: ctx.input.segmentId,
        name: result.name,
        description: result.description,
        analyticsTrackingEnabled: result.analytics_tracking_enabled,
        tags: result.tags,
        createdAt: result.created_at,
        updatedAt: result.updated_at,
        message: result.message
      },
      message: `Retrieved details for segment **${result.name ?? ctx.input.segmentId}**.`
    };
  })
  .build();

export let getSegmentAnalytics = SlateTool.create(spec, {
  name: 'Get Segment Analytics',
  key: 'get_segment_analytics',
  description: `Retrieve daily analytics time series for a Braze segment over a specified number of days.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      segmentId: z.string().describe('ID of the segment'),
      length: z.number().describe('Number of days of data to return (max 100)')
    })
  )
  .output(
    z.object({
      dataSeries: z
        .array(z.record(z.string(), z.any()))
        .describe('Daily segment analytics data points'),
      message: z.string().describe('Response status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BrazeClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    let result = await client.getSegmentAnalytics(ctx.input.segmentId, ctx.input.length);

    return {
      output: {
        dataSeries: result.data ?? [],
        message: result.message
      },
      message: `Retrieved **${(result.data ?? []).length}** days of analytics for segment **${ctx.input.segmentId}**.`
    };
  })
  .build();
