import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const listCampaigns = SlateTool.create(spec, {
  name: 'List Campaigns',
  key: 'list_campaigns',
  description:
    'Discover outbound campaigns with status and page-based pagination before managing a campaign.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      page: z.number().int().min(1).optional().describe('Page number; defaults to 1'),
      limit: z
        .number()
        .int()
        .min(0)
        .max(1000)
        .optional()
        .describe('Maximum results per page; defaults to 100'),
      status: z
        .enum(['scheduled', 'in-progress', 'ended', 'cancelled', 'archived'])
        .optional()
        .describe('Filter by campaign status'),
      createdAfter: z.string().optional().describe('Exclusive ISO timestamp lower bound'),
      createdBefore: z.string().optional().describe('Exclusive ISO timestamp upper bound')
    })
  )
  .output(
    z.object({
      campaigns: z.array(
        z.object({
          campaignId: z.string(),
          name: z.string().optional(),
          status: z.string().optional(),
          assistantId: z.string().optional(),
          squadId: z.string().optional(),
          phoneNumberId: z.string().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional()
        })
      ),
      count: z.number(),
      page: z.number(),
      totalItems: z.number(),
      nextPage: z.number().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth.token, ctx.auth.region).listCampaigns({
      page: ctx.input.page,
      limit: ctx.input.limit,
      status: ctx.input.status,
      createdAtGt: ctx.input.createdAfter,
      createdAtLt: ctx.input.createdBefore
    });
    let page = result.metadata.currentPage;
    let hasNext =
      result.metadata.hasNextPage ??
      (result.metadata.totalPages !== undefined && page < result.metadata.totalPages);
    return {
      output: {
        campaigns: result.results.map(campaign => ({
          campaignId: campaign.id,
          name: campaign.name,
          status: campaign.status,
          assistantId: campaign.assistantId,
          squadId: campaign.squadId,
          phoneNumberId: campaign.phoneNumberId,
          createdAt: campaign.createdAt,
          updatedAt: campaign.updatedAt
        })),
        count: result.results.length,
        page,
        totalItems: result.metadata.totalItems,
        nextPage: hasNext ? page + 1 : null
      },
      message: `Found ${result.results.length} campaign(s) on page ${page}.`
    };
  })
  .build();
