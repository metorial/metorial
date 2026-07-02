import { SlateTool } from 'slates';
import { z } from 'zod';
import { RecruiteeClient } from '../lib/client';
import { spec } from '../spec';

export let listOffers = SlateTool.create(spec, {
  name: 'List Job Offers',
  key: 'list_offers',
  description: `List job offers and/or talent pools. Filter by type (job or talent_pool) and scope (e.g., "active" for non-archived offers).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      kind: z.enum(['job', 'talent_pool']).optional().describe('Filter by offer type'),
      scope: z
        .string()
        .optional()
        .describe('Filter scope, e.g., "active" for non-archived offers')
    })
  )
  .output(
    z.object({
      offers: z
        .array(
          z.object({
            offerId: z.number().describe('Offer ID'),
            title: z.string().describe('Title'),
            kind: z.string().describe('Type: job or talent_pool'),
            status: z.string().describe('Status'),
            department: z.string().nullable().describe('Department name'),
            createdAt: z.string().describe('Creation timestamp')
          })
        )
        .describe('List of offers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RecruiteeClient({
      token: ctx.auth.token,
      companyId: ctx.config.companyId
    });

    let result = await client.listOffers({
      kind: ctx.input.kind,
      scope: ctx.input.scope
    });

    let offers = result.offers || [];

    return {
      output: {
        offers: offers.map((o: any) => ({
          offerId: o.id,
          title: o.title,
          kind: o.kind,
          status: o.status,
          department: o.department || null,
          createdAt: o.created_at
        }))
      },
      message: `Found ${offers.length} offers.`
    };
  })
  .build();
