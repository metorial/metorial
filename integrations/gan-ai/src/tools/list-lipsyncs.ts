import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlaygroundClient } from '../lib/client';
import { spec } from '../spec';

let lipsyncSchema = z.object({
  inferenceId: z.string().describe('Unique inference identifier'),
  videoUrl: z.string().nullable().describe('URL to the output video'),
  thumbnailUrl: z.string().nullable().describe('Thumbnail image URL'),
  status: z
    .string()
    .describe('Generation status (draft, processing, failed, succeeded, deleted)'),
  title: z.string().nullable().describe('Video title'),
  description: z.string().nullable().describe('Video description'),
  createdAt: z.string().describe('ISO 8601 creation timestamp')
});

export let listLipsyncs = SlateTool.create(spec, {
  name: 'List Lip-Sync Videos',
  key: 'list_lipsyncs',
  description: `List lip-sync video inferences with optional filters, or get details for a specific lip-sync inference by ID. Supports filtering by title, status, and date range with pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      inferenceId: z
        .string()
        .optional()
        .describe('If provided, returns details for this specific lip-sync inference'),
      title: z.string().optional().describe('Filter by title'),
      status: z
        .array(z.enum(['draft', 'processing', 'failed', 'suceeded', 'deleted']))
        .optional()
        .describe('Filter by status'),
      skip: z.number().optional().describe('Number of records to skip'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of records to return (default 10)'),
      startDatetime: z
        .string()
        .optional()
        .describe('Filter by creation date after this ISO 8601 datetime'),
      endDatetime: z
        .string()
        .optional()
        .describe('Filter by creation date before this ISO 8601 datetime')
    })
  )
  .output(
    z.object({
      total: z.number().optional().describe('Total number of matching lip-sync inferences'),
      lipsyncs: z.array(lipsyncSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlaygroundClient(ctx.auth.token);

    if (ctx.input.inferenceId) {
      let details = await client.getLipsyncDetails(ctx.input.inferenceId);
      return {
        output: {
          total: 1,
          lipsyncs: [
            {
              inferenceId: details.inference_id,
              videoUrl: details.video_url,
              thumbnailUrl: details.thumbnail_url,
              status: details.status,
              title: details.title,
              description: details.description,
              createdAt: details.created_at
            }
          ]
        },
        message: `Lip-sync inference **${details.inference_id}** status: **${details.status}**.`
      };
    }

    let result = await client.listLipsyncs({
      title: ctx.input.title,
      status: ctx.input.status,
      skip: ctx.input.skip,
      limit: ctx.input.limit,
      startDatetime: ctx.input.startDatetime,
      endDatetime: ctx.input.endDatetime
    });

    return {
      output: {
        total: result.total_count,
        lipsyncs: result.lipsyncs.map(l => ({
          inferenceId: l.inference_id,
          videoUrl: l.video_url,
          thumbnailUrl: l.thumbnail_url,
          status: l.status,
          title: l.title,
          description: l.description,
          createdAt: l.created_at
        }))
      },
      message: `Found **${result.total_count}** lip-sync inferences.`
    };
  })
  .build();
