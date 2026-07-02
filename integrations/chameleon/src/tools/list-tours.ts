import { SlateTool } from 'slates';
import { z } from 'zod';
import { ChameleonClient } from '../lib/client';
import { spec } from '../spec';

let tourSchema = z.object({
  tourId: z.string().describe('Chameleon tour ID'),
  name: z.string().optional().describe('Tour name'),
  style: z.string().optional().describe('Delivery style: "auto" or "manual"'),
  position: z.number().optional().describe('List ordering position'),
  segmentId: z.string().optional().describe('Associated segment ID'),
  publishedAt: z.string().nullable().optional().describe('Publication timestamp'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp'),
  tagIds: z.array(z.string()).optional().describe('Associated tag IDs'),
  stats: z
    .object({
      startedCount: z.number().optional(),
      completedCount: z.number().optional(),
      exitedCount: z.number().optional(),
      lastStartedAt: z.string().nullable().optional(),
      lastCompletedAt: z.string().nullable().optional(),
      lastExitedAt: z.string().nullable().optional()
    })
    .optional()
    .describe('Tour interaction statistics')
});

let mapTour = (tour: Record<string, unknown>) => ({
  tourId: tour.id as string,
  name: tour.name as string | undefined,
  style: tour.style as string | undefined,
  position: tour.position as number | undefined,
  segmentId: tour.segment_id as string | undefined,
  publishedAt: tour.published_at as string | null | undefined,
  createdAt: tour.created_at as string | undefined,
  updatedAt: tour.updated_at as string | undefined,
  tagIds: tour.tag_ids as string[] | undefined,
  stats: tour.stats
    ? {
        startedCount: (tour.stats as Record<string, unknown>).started_count as
          | number
          | undefined,
        completedCount: (tour.stats as Record<string, unknown>).completed_count as
          | number
          | undefined,
        exitedCount: (tour.stats as Record<string, unknown>).exited_count as
          | number
          | undefined,
        lastStartedAt: (tour.stats as Record<string, unknown>).last_started_at as
          | string
          | null
          | undefined,
        lastCompletedAt: (tour.stats as Record<string, unknown>).last_completed_at as
          | string
          | null
          | undefined,
        lastExitedAt: (tour.stats as Record<string, unknown>).last_exited_at as
          | string
          | null
          | undefined
      }
    : undefined
});

export let listTours = SlateTool.create(spec, {
  name: 'List Tours',
  key: 'list_tours',
  description: `List all product tours in your Chameleon account, or retrieve a specific tour by ID.
Returns tour details including name, status, segment targeting, and interaction statistics.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tourId: z.string().optional().describe('Chameleon tour ID to retrieve a specific tour'),
      limit: z
        .number()
        .min(1)
        .max(500)
        .optional()
        .describe('Number of tours to return (1-500, default 50)'),
      before: z.string().optional().describe('Pagination cursor for older items'),
      after: z.string().optional().describe('Pagination cursor for newer items')
    })
  )
  .output(
    z.object({
      tour: tourSchema.optional().describe('Single tour (when fetching by ID)'),
      tours: z.array(tourSchema).optional().describe('Array of tours'),
      cursor: z
        .object({
          limit: z.number().optional(),
          before: z.string().optional()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ChameleonClient(ctx.auth.token);

    if (ctx.input.tourId) {
      let result = await client.getTour(ctx.input.tourId);
      return {
        output: { tour: mapTour(result) },
        message: `Retrieved tour **${result.name || result.id}**.`
      };
    }

    let result = await client.listTours({
      limit: ctx.input.limit,
      before: ctx.input.before,
      after: ctx.input.after
    });

    let tours = (result.tours || []).map(mapTour);
    return {
      output: { tours, cursor: result.cursor },
      message: `Returned **${tours.length}** tours.`
    };
  })
  .build();
