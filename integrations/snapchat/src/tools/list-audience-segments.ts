import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { SnapchatClient } from '../lib/client';
import { spec } from '../spec';

let segmentSchema = z.object({
  segmentId: z.string().describe('Unique ID of the audience segment'),
  name: z.string().optional().describe('Segment name'),
  description: z.string().optional().describe('Segment description'),
  status: z.string().optional().describe('Segment status'),
  sourceType: z.string().optional().describe('Source type'),
  retentionInDays: z.number().optional().describe('Retention period in days'),
  approximateNumberUsers: z
    .number()
    .optional()
    .describe('Approximate number of matched users'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let listAudienceSegments = SlateTool.create(spec, {
  name: 'List Audience Segments',
  key: 'list_audience_segments',
  description: `List all custom audience segments under a Snapchat ad account. Returns segment IDs, names, source types, user counts, and statuses.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      adAccountId: z.string().describe('Ad account ID to list segments for'),
      limit: z
        .number()
        .int()
        .min(50)
        .max(1000)
        .optional()
        .describe('Maximum number of audience segments to return, from 50 to 1000'),
      cursor: z.string().optional().describe('Pagination cursor from a previous nextLink')
    })
  )
  .output(
    z.object({
      segments: z.array(segmentSchema).describe('List of audience segments'),
      nextLink: z
        .string()
        .optional()
        .describe('Pagination URL for the next page, if available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SnapchatClient(ctx.auth.token);
    let result = await client.listSegments(
      ctx.input.adAccountId,
      ctx.input.limit,
      ctx.input.cursor
    );

    let segments = result.items.map((s: any) => ({
      segmentId: s.id,
      name: s.name,
      description: s.description,
      status: s.status,
      sourceType: s.source_type,
      retentionInDays: s.retention_in_days,
      approximateNumberUsers: s.approximate_number_users,
      createdAt: s.created_at,
      updatedAt: s.updated_at
    }));

    return {
      output: { segments, nextLink: result.nextLink },
      message: `Found **${segments.length}** audience segment(s).`
    };
  })
  .build();
