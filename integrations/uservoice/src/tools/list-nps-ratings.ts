import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let npsRatingSchema = z.object({
  ratingId: z.number().describe('Unique ID of the NPS rating'),
  rating: z.number().describe('NPS score (0-10)'),
  previousRating: z.number().nullable().describe('Previous NPS score if user re-rated'),
  ratingDelta: z.number().nullable().describe('Change from previous rating'),
  body: z.string().nullable().describe('Optional feedback text'),
  group: z.string().nullable().describe('NPS group (promoter, passive, detractor)'),
  createdAt: z.string().describe('When the rating was submitted'),
  updatedAt: z.string().describe('When the rating was last updated'),
  links: z
    .record(z.string(), z.any())
    .optional()
    .describe('Associated resource links (user, ticket)')
});

export let listNpsRatings = SlateTool.create(spec, {
  name: 'List NPS Ratings',
  key: 'list_nps_ratings',
  description: `List Net Promoter Score (NPS) ratings submitted by users. View scores, feedback comments, and track changes over time. Useful for measuring customer satisfaction.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (default: 20, max: 100)'),
      sort: z.string().optional().describe('Sort field. Examples: "-created_at", "-rating"'),
      updatedAfter: z
        .string()
        .optional()
        .describe('Only return ratings updated after this ISO 8601 date')
    })
  )
  .output(
    z.object({
      npsRatings: z.array(npsRatingSchema),
      totalRecords: z.number().describe('Total number of NPS ratings'),
      totalPages: z.number().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.auth.subdomain
    });

    let result = await client.listNpsRatings({
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      sort: ctx.input.sort,
      updatedAfter: ctx.input.updatedAfter
    });

    let npsRatings = result.npsRatings.map((r: any) => ({
      ratingId: r.id,
      rating: r.rating,
      previousRating: r.previous_rating ?? null,
      ratingDelta: r.rating_delta ?? null,
      body: r.body || null,
      group: r.group || null,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      links: r.links
    }));

    return {
      output: {
        npsRatings,
        totalRecords: result.pagination?.totalRecords || 0,
        totalPages: result.pagination?.totalPages || 0
      },
      message: `Found **${npsRatings.length}** NPS ratings.`
    };
  })
  .build();
