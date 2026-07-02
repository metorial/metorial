import { SlateTool } from 'slates';
import { z } from 'zod';
import { HelpScoutClient } from '../lib/client';
import { spec } from '../spec';

export let listSatisfactionRatings = SlateTool.create(spec, {
  name: 'List Satisfaction Ratings',
  key: 'list_satisfaction_ratings',
  description: `Retrieve customer satisfaction ratings. Filter by mailbox and date range.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      mailboxId: z.number().optional().describe('Filter by mailbox ID'),
      start: z.string().optional().describe('Start date in ISO 8601 format'),
      end: z.string().optional().describe('End date in ISO 8601 format'),
      sortField: z.string().optional().describe('Field to sort by'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      page: z.number().optional().describe('Page number')
    })
  )
  .output(
    z.object({
      ratings: z.array(
        z.object({
          ratingId: z.number().describe('Rating ID'),
          rating: z.string().describe('Rating value (great, okay, not-good)'),
          comment: z.string().nullable().describe('Customer comment'),
          conversationId: z.number().optional().describe('Related conversation ID'),
          createdAt: z.string().describe('Rating submission timestamp'),
          customerName: z.string().nullable().optional().describe('Customer name')
        })
      ),
      totalCount: z.number().describe('Total ratings'),
      currentPage: z.number().describe('Current page'),
      totalPages: z.number().describe('Total pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HelpScoutClient(ctx.auth.token);
    let data = await client.listSatisfactionRatings({
      mailbox: ctx.input.mailboxId,
      start: ctx.input.start,
      end: ctx.input.end,
      page: ctx.input.page,
      sortField: ctx.input.sortField,
      sortOrder: ctx.input.sortOrder
    });

    let embedded = data?._embedded?.ratings ?? [];
    let ratings = embedded.map((r: any) => ({
      ratingId: r.id,
      rating: r.rating,
      comment: r.comments ?? null,
      conversationId: r.threadid ?? r.conversationId,
      createdAt: r.createdAt,
      customerName: r.customer
        ? [r.customer.first, r.customer.last].filter(Boolean).join(' ')
        : null
    }));

    let page = data?.page ?? {};

    return {
      output: {
        ratings,
        totalCount: page.totalElements ?? ratings.length,
        currentPage: page.number ?? 1,
        totalPages: page.totalPages ?? 1
      },
      message: `Found **${page.totalElements ?? ratings.length}** satisfaction ratings.`
    };
  })
  .build();
