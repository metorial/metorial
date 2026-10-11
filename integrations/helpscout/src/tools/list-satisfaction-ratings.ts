import { SlateTool } from 'slates';
import { z } from 'zod';
import { HelpScoutClient } from '../lib/client';
import { helpscoutServiceError } from '../lib/errors';
import { spec } from '../spec';

let DEFAULT_RANGE_DAYS = 30;

// ratingId in the happiness ratings report is the rating value code.
// https://developer.helpscout.com/mailbox-api/endpoints/reports/happiness/reports-happiness-ratings/
let ratingLabels: Record<number, string> = {
  1: 'great',
  2: 'okay',
  3: 'not-good'
};

let sortFields: Record<string, string> = {
  number: 'number',
  modifiedat: 'modifiedAt',
  rating: 'rating'
};

export let listSatisfactionRatings = SlateTool.create(spec, {
  name: 'List Satisfaction Ratings',
  key: 'list_satisfaction_ratings',
  description: `Retrieve customer satisfaction ratings (Great, Okay, Not Good) with customer comments for a date range. Filter by mailbox and rating. Defaults to the last 30 days.`,
  tags: { readOnly: true },
  constraints: ['Ratings come from Help Scout reporting, available on Plus and Pro plans.']
})
  .input(
    z.object({
      mailboxId: z
        .number()
        .optional()
        .describe('Filter by mailbox ID. Call list_mailboxes to discover mailbox IDs.'),
      start: z
        .string()
        .optional()
        .describe('Start of the range in ISO 8601 format (defaults to 30 days before end)'),
      end: z
        .string()
        .optional()
        .describe('End of the range in ISO 8601 format (defaults to now)'),
      rating: z
        .enum(['great', 'ok', 'not-good', 'all'])
        .optional()
        .describe('Only return ratings with this value (default all)'),
      sortField: z
        .string()
        .optional()
        .describe('Field to sort by: number, modifiedAt, or rating'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      page: z.number().optional().describe('Page number')
    })
  )
  .output(
    z.object({
      ratings: z.array(
        z.object({
          ratingId: z
            .number()
            .describe('Rating value code: 1 = great, 2 = okay, 3 = not good'),
          rating: z.string().describe('Rating value (great, okay, not-good)'),
          comment: z.string().nullable().describe('Customer comment'),
          conversationId: z.number().optional().describe('Related conversation ID'),
          conversationNumber: z.number().optional().describe('Related conversation number'),
          conversationType: z.string().optional().describe('Conversation type'),
          threadId: z.number().optional().describe('Rated reply thread ID'),
          createdAt: z.string().describe('Rating submission timestamp'),
          customerId: z.number().nullable().optional().describe('Customer ID'),
          customerName: z.string().nullable().optional().describe('Customer name'),
          userId: z.number().nullable().optional().describe('ID of the rated user'),
          userName: z.string().nullable().optional().describe('Name of the rated user')
        })
      ),
      totalCount: z.number().describe('Total ratings'),
      currentPage: z.number().describe('Current page'),
      totalPages: z.number().describe('Total pages')
    })
  )
  .handleInvocation(async ctx => {
    let end = ctx.input.end ?? new Date().toISOString();
    let start = ctx.input.start;
    if (!start) {
      let endDate = new Date(end);
      if (Number.isNaN(endDate.getTime())) {
        throw helpscoutServiceError('end must be an ISO 8601 date-time.');
      }
      start = new Date(
        endDate.getTime() - DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000
      ).toISOString();
    }

    let sortField: string | undefined;
    if (ctx.input.sortField) {
      sortField = sortFields[ctx.input.sortField.toLowerCase()];
      if (!sortField) {
        throw helpscoutServiceError('sortField must be one of number, modifiedAt, or rating.');
      }
    }

    let client = new HelpScoutClient(ctx.auth.token);
    let data = await client.listHappinessRatings({
      start,
      end,
      mailboxes: ctx.input.mailboxId !== undefined ? String(ctx.input.mailboxId) : undefined,
      rating: ctx.input.rating,
      page: ctx.input.page,
      sortField,
      sortOrder: ctx.input.sortOrder?.toUpperCase()
    });

    let results: any[] = Array.isArray(data?.results) ? data.results : [];
    let ratings = results.map(r => ({
      ratingId: r.ratingId,
      rating: ratingLabels[r.ratingId] ?? String(r.ratingId),
      comment: r.ratingComments ?? null,
      conversationId: r.id,
      conversationNumber: r.number,
      conversationType: r.type,
      threadId: r.threadid ?? r.threadId,
      createdAt: r.ratingCreatedAt,
      customerId: r.ratingCustomerId ?? null,
      customerName: r.ratingCustomerName ?? null,
      userId: r.ratingUserId ?? null,
      userName: r.ratingUserName ?? null
    }));

    let totalCount = typeof data?.count === 'number' ? data.count : ratings.length;
    let currentPage = typeof data?.page === 'number' ? data.page : (ctx.input.page ?? 1);
    let totalPages = typeof data?.pages === 'number' ? data.pages : 1;

    return {
      output: {
        ratings,
        totalCount,
        currentPage,
        totalPages
      },
      message: `Found **${totalCount}** satisfaction ratings between ${start} and ${end} (page ${currentPage} of ${totalPages}).`
    };
  })
  .build();
