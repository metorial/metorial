import { SlateTool } from 'slates';
import { z } from 'zod';
import { BookingmoodClient } from '../lib/client';
import { spec } from '../spec';

let reviewSchema = z.object({
  reviewId: z.string().describe('UUID of the review'),
  bookingId: z.string().nullable().describe('UUID of the associated booking'),
  authorName: z.string().describe('Reviewer name'),
  rating: z.number().nullable().describe('Numerical rating'),
  content: z.any().nullable().describe('Review text (multi-language)'),
  source: z.string().nullable().describe('Review platform origin'),
  status: z.string().describe('Review status'),
  createdAt: z.string().describe('Creation timestamp')
});

export let listReviews = SlateTool.create(spec, {
  name: 'List Reviews',
  key: 'list_reviews',
  description: `Lists guest reviews with optional filtering and pagination. Filter by rating, status, source, or booking.`,
  constraints: ['Maximum 1000 results per request.'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      filters: z.record(z.string(), z.string()).optional().describe('PostgREST-style filters'),
      order: z.string().optional().describe('Sort order'),
      limit: z.number().optional().describe('Maximum number of results'),
      offset: z.number().optional().describe('Number of results to skip')
    })
  )
  .output(
    z.object({
      reviews: z.array(reviewSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new BookingmoodClient(ctx.auth.token);
    let reviews = await client.listReviews({
      select: 'id,booking_id,author_name,rating,content,source,status,created_at',
      filters: ctx.input.filters,
      order: ctx.input.order,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let mapped = (reviews || []).map((r: any) => ({
      reviewId: r.id,
      bookingId: r.booking_id ?? null,
      authorName: r.author_name,
      rating: r.rating ?? null,
      content: r.content ?? null,
      source: r.source ?? null,
      status: r.status,
      createdAt: r.created_at
    }));

    return {
      output: { reviews: mapped },
      message: `Found **${mapped.length}** review(s).`
    };
  })
  .build();
