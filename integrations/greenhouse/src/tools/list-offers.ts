import { SlateTool } from 'slates';
import { z } from 'zod';
import { GreenhouseClient } from '../lib/client';
import { mapOffer } from '../lib/mappers';
import { spec } from '../spec';

export let listOffersTool = SlateTool.create(spec, {
  name: 'List Offers',
  key: 'list_offers',
  description: `List offers in Greenhouse. Can list all offers globally or filter by a specific application. Supports filtering by status and date ranges.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      applicationId: z
        .string()
        .optional()
        .describe('If provided, list offers only for this application'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      perPage: z
        .number()
        .optional()
        .describe('Number of results per page (max 500, default 50)'),
      status: z
        .enum(['created', 'sent', 'accepted', 'rejected', 'deprecated'])
        .optional()
        .describe('Filter by offer status'),
      createdAfter: z
        .string()
        .optional()
        .describe('Only return offers created after this ISO 8601 timestamp'),
      createdBefore: z
        .string()
        .optional()
        .describe('Only return offers created before this ISO 8601 timestamp'),
      updatedAfter: z
        .string()
        .optional()
        .describe('Only return offers updated after this ISO 8601 timestamp'),
      updatedBefore: z
        .string()
        .optional()
        .describe('Only return offers updated before this ISO 8601 timestamp')
    })
  )
  .output(
    z.object({
      offers: z.array(
        z.object({
          offerId: z.string(),
          version: z.number().nullable(),
          applicationId: z.string(),
          candidateId: z.string().nullable(),
          jobId: z.string().nullable(),
          status: z.string().nullable(),
          createdAt: z.string().nullable(),
          sentAt: z.string().nullable(),
          resolvedAt: z.string().nullable(),
          startsAt: z.string().nullable(),
          customFields: z.record(z.string(), z.any())
        })
      ),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GreenhouseClient({
      token: ctx.auth.token,
      onBehalfOf: ctx.config.onBehalfOf
    });
    let perPage = ctx.input.perPage || 50;

    let results: any[];
    if (ctx.input.applicationId) {
      results = await client.listOffersForApplication(
        Number.parseInt(ctx.input.applicationId, 10)
      );
    } else {
      results = await client.listOffers({
        page: ctx.input.page,
        perPage,
        status: ctx.input.status,
        createdAfter: ctx.input.createdAfter,
        createdBefore: ctx.input.createdBefore,
        updatedAfter: ctx.input.updatedAfter,
        updatedBefore: ctx.input.updatedBefore
      });
    }

    let offers = results.map(mapOffer);

    return {
      output: {
        offers,
        hasMore: !ctx.input.applicationId && results.length >= perPage
      },
      message: `Found ${offers.length} offer(s)${ctx.input.applicationId ? ` for application ${ctx.input.applicationId}` : ''}.`
    };
  })
  .build();
