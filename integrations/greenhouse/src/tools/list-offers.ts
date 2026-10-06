import { SlateTool } from 'slates';
import { z } from 'zod';
import { GreenhouseClient } from '../lib/client';
import { mapOffer, offerOutputSchema } from '../lib/mappers';
import { spec } from '../spec';
export const listOffersTool = SlateTool.create(spec, {
  key: 'list_offers',
  name: 'List Offers',
  description:
    'List offers by application, supported status or one date range. sentAt and startsAt are calendar dates. Sent is not a v3 status.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      cursor: z
        .string()
        .optional()
        .describe(
          'Opaque nextCursor from the preceding response. Pass cursor alone for subsequent pages.'
        ),
      applicationId: z
        .string()
        .optional()
        .describe('If provided, list offers only for this application'),
      page: z
        .number()
        .optional()
        .describe(
          'Legacy first-page selector. Only page 1 is supported; use cursor for subsequent pages.'
        ),
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
      offers: z.array(offerOutputSchema),
      hasMore: z.boolean(),
      nextCursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    const page = await new GreenhouseClient(ctx.auth, ctx.config).listOffers(ctx.input);
    return {
      output: {
        offers: page.items.map(mapOffer),
        hasMore: page.hasMore,
        nextCursor: page.nextCursor
      },
      message: `Retrieved ${page.items.length} result(s).`
    };
  })
  .build();
