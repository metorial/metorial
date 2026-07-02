import { SlateTool } from 'slates';
import { z } from 'zod';
import { BookingmoodClient } from '../lib/client';
import { spec } from '../spec';

export let createReview = SlateTool.create(spec, {
  name: 'Create Review',
  key: 'create_review',
  description: `Creates a new guest review. Provide the author name, rating, content, and optionally link it to a booking or external source.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      authorName: z.string().describe('Reviewer name'),
      rating: z.number().optional().describe('Numerical rating'),
      content: z.any().optional().describe('Review text (string or multi-language object)'),
      bookingId: z.string().optional().describe('UUID of the associated booking'),
      source: z.string().optional().describe('Review source platform'),
      sourceUrl: z.string().optional().describe('URL to the original review'),
      sourceId: z.string().optional().describe('External review source ID'),
      status: z.string().optional().describe('Review status (e.g., "approved")')
    })
  )
  .output(
    z.object({
      reviewId: z.string().describe('UUID of the created review'),
      authorName: z.string().describe('Reviewer name'),
      rating: z.number().nullable().describe('Rating'),
      status: z.string().describe('Review status'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BookingmoodClient(ctx.auth.token);

    let data: Record<string, any> = {
      author_name: ctx.input.authorName
    };
    if (ctx.input.rating !== undefined) data.rating = ctx.input.rating;
    if (ctx.input.content !== undefined) data.content = ctx.input.content;
    if (ctx.input.bookingId !== undefined) data.booking_id = ctx.input.bookingId;
    if (ctx.input.source !== undefined) data.source = ctx.input.source;
    if (ctx.input.sourceUrl !== undefined) data.source_url = ctx.input.sourceUrl;
    if (ctx.input.sourceId !== undefined) data.source_id = ctx.input.sourceId;
    if (ctx.input.status !== undefined) data.status = ctx.input.status;

    let result = await client.createReview(data);

    return {
      output: {
        reviewId: result.id,
        authorName: result.author_name,
        rating: result.rating ?? null,
        status: result.status,
        createdAt: result.created_at
      },
      message: `Review by **${result.author_name}** created${result.rating ? ` (rating: ${result.rating})` : ''}.`
    };
  })
  .build();
