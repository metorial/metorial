import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { numericIdAlias, toNumericId, toProviderId } from '../lib/response';
import { spec } from '../spec';

export let listSatisfactionRatings = SlateTool.create(spec, {
  name: 'List Satisfaction Ratings',
  key: 'list_satisfaction_ratings',
  description: `Retrieve customer satisfaction ratings. Filter by rating value, staff member, brand, or creation/update date range. Ratings cover all account brands by default. Requires the \`access_reports\` permission.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      rating: z.number().optional().describe('Filter by specific rating value (1-5)'),
      assigneeId: z.number().optional().describe('Filter by staff member ID'),
      brand: z
        .string()
        .optional()
        .describe(
          'Brand subdomain to filter by. Omit or use all_brands to include all account brands.'
        ),
      createdAfter: z
        .string()
        .optional()
        .describe('ISO 8601 date - only ratings created after this date'),
      createdBefore: z
        .string()
        .optional()
        .describe('ISO 8601 date - only ratings created before this date'),
      updatedAfter: z
        .string()
        .optional()
        .describe('ISO 8601 date - only ratings updated after this date'),
      updatedBefore: z
        .string()
        .optional()
        .describe('ISO 8601 date - only ratings updated before this date'),
      page: z.number().int().min(1).optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      pageSize: z.number().describe('Number of items per page'),
      pageCount: z.number().describe('Total number of pages'),
      totalCount: z.number().describe('Total number of matching ratings'),
      ratings: z
        .array(
          z.object({
            ratingId: z
              .number()
              .optional()
              .describe('Legacy numeric rating ID when available'),
            ratingIdentifier: z.string().nullable().describe('Canonical rating ID'),
            rating: z.number().nullable().describe('Rating value (1-5 or null)'),
            comment: z.string().nullable().optional().describe('Customer comment'),
            userId: z
              .number()
              .nullable()
              .optional()
              .describe('Legacy numeric customer user ID when available'),
            userIdentifier: z
              .string()
              .nullable()
              .optional()
              .describe('Canonical customer user ID'),
            assigneeId: z
              .number()
              .nullable()
              .optional()
              .describe('Legacy numeric assigned staff member ID when available'),
            assigneeIdentifier: z
              .string()
              .nullable()
              .optional()
              .describe('Canonical assigned staff member ID'),
            conversationId: z
              .number()
              .nullable()
              .optional()
              .describe('Legacy numeric conversation ID when available'),
            conversationIdentifier: z
              .string()
              .nullable()
              .optional()
              .describe('Canonical conversation ID or slug'),
            createdAt: z.string().optional().describe('ISO 8601 creation timestamp'),
            updatedAt: z.string().optional().describe('ISO 8601 last update timestamp')
          })
        )
        .describe('List of satisfaction ratings')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      loginEmail: ctx.auth.loginEmail,
      brandSubdomain: ctx.config.brandSubdomain
    });

    let result = await client.listSatisfactionRatings({
      rating: ctx.input.rating,
      assigneeId:
        ctx.input.assigneeId === undefined
          ? undefined
          : toNumericId(ctx.input.assigneeId, 'Assignee ID'),
      brand: ctx.input.brand,
      createdAfter: ctx.input.createdAfter,
      createdBefore: ctx.input.createdBefore,
      updatedAfter: ctx.input.updatedAfter,
      updatedBefore: ctx.input.updatedBefore,
      page: ctx.input.page
    });

    let optionalId = (value: unknown, label: string) =>
      value == null
        ? { numeric: value as null | undefined, identifier: value as null | undefined }
        : { numeric: numericIdAlias(value, label), identifier: toProviderId(value, label) };

    let ratings = (result.satisfaction_ratings || []).map((r: any) => {
      let id = optionalId(r.id, 'Satisfaction rating ID');
      let user = optionalId(r.user_id, 'Rating customer ID');
      let assignee = optionalId(r.assignee_id, 'Rating assignee ID');
      let conversation = optionalId(r.conversation_id, 'Rating conversation ID');
      return {
        ratingId: id.numeric ?? undefined,
        ratingIdentifier: id.identifier ?? null,
        rating: r.rating,
        comment: r.comment,
        userId: user.numeric,
        userIdentifier: user.identifier,
        assigneeId: assignee.numeric,
        assigneeIdentifier: assignee.identifier,
        conversationId: conversation.numeric,
        conversationIdentifier: conversation.identifier,
        createdAt: r.created_at,
        updatedAt: r.updated_at
      };
    });

    return {
      output: {
        pageSize: result.page_size,
        pageCount: result.page_count,
        totalCount: result.total_count,
        ratings
      },
      message: `Found **${result.total_count}** satisfaction ratings.`
    };
  })
  .build();
