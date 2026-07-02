import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let campaignSummarySchema = z.object({
  processed: z.number().optional(),
  completed: z.number().optional(),
  errored: z.number().optional(),
  deleted: z.number().optional()
});

let prospectItemSchema = z.object({
  prospectId: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  status: z.string().optional()
});

let campaignItemSchema = z.object({
  campaignId: z.string(),
  name: z.string(),
  status: z.string().optional(),
  createdAt: z.string().optional(),
  summary: campaignSummarySchema.optional(),
  prospects: z.array(prospectItemSchema).optional()
});

let paginationSchema = z.object({
  offset: z.number().optional(),
  limit: z.number().optional(),
  total: z.number().optional()
});

export let listCampaigns = SlateTool.create(spec, {
  name: 'List Campaigns',
  key: 'list_campaigns',
  description: `List dynamic video campaigns in your Sendspark workspace. Supports pagination, filtering by creator, and searching by campaign name.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      offset: z.number().optional().describe('Page offset for pagination (starts at 1)'),
      limit: z
        .number()
        .optional()
        .describe('Number of campaigns per page (max 20, default 10)'),
      creatorId: z.string().optional().describe('Filter campaigns by creator ID'),
      search: z.string().optional().describe('Search campaigns by name')
    })
  )
  .output(
    z.object({
      campaigns: z.array(campaignItemSchema),
      pagination: paginationSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret,
      workspaceId: ctx.config.workspaceId
    });

    let result = await client.listCampaigns({
      offset: ctx.input.offset,
      limit: ctx.input.limit,
      filters: ctx.input.creatorId,
      search: ctx.input.search
    });

    let responseData = result.response || result;
    let campaignsRaw = responseData.data || [];

    let campaigns = campaignsRaw.map((c: any) => ({
      campaignId: c._id,
      name: c.name,
      status: c.status,
      createdAt: c.createdAt,
      summary: c.summary,
      prospects: c.prospectList?.map((p: any) => ({
        prospectId: p._id,
        contactName: p.contactName,
        contactEmail: p.contactEmail,
        company: p.company,
        jobTitle: p.jobTitle,
        status: p.status
      }))
    }));

    let pagination = responseData.pagination;

    return {
      output: { campaigns, pagination },
      message: `Found **${campaigns.length}** campaign(s)${pagination?.total ? ` out of ${pagination.total} total` : ''}.`
    };
  })
  .build();
