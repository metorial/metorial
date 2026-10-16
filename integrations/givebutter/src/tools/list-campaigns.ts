import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let campaignSchema = z.object({
  campaignId: z.number().describe('Unique identifier of the campaign'),
  accountId: z.string().nullable().describe('Account ID that owns the campaign'),
  type: z.string().nullable().describe('Campaign type: general, collect, fundraise, or event'),
  title: z.string().nullable().describe('Campaign title'),
  subtitle: z.string().nullable().describe('Campaign subtitle'),
  slug: z.string().nullable().describe('URL slug of the campaign'),
  url: z.string().nullable().describe('Public URL of the campaign'),
  goal: z.number().nullable().describe('Fundraising goal amount'),
  raised: z.number().nullable().describe('Total amount raised'),
  donors: z.number().nullable().describe('Number of donors'),
  currency: z.string().nullable().describe('Currency code (e.g. USD)'),
  status: z.string().nullable().describe('Campaign status: active, inactive, or unpublished'),
  endAt: z.string().nullable().describe('Campaign end date'),
  createdAt: z.string().nullable().describe('When the campaign was created'),
  updatedAt: z.string().nullable().describe('When the campaign was last updated')
});

let listCampaignsOutputSchema = z.object({
  campaigns: z.array(campaignSchema).describe('List of campaigns'),
  totalCount: z.number().describe('Total number of campaigns'),
  currentPage: z.number().describe('Current page number'),
  lastPage: z.number().describe('Last page number')
});

export let listCampaigns = SlateTool.create(spec, {
  name: 'List Campaigns',
  key: 'list_campaigns',
  description: `Retrieve a paginated list of fundraising campaigns. Supports filtering by scope for beneficiary or chapter account campaigns.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (default: 1)'),
      perPage: z.number().optional().describe('Items per page, from 1 to 100'),
      scope: z
        .string()
        .optional()
        .describe('Scope filter for campaigns (e.g. "beneficiary" or "chapter")')
    })
  )
  .output(listCampaignsOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listCampaigns({
      page: ctx.input.page,
      per_page: ctx.input.perPage,
      scope: ctx.input.scope
    });

    let campaigns = result.data.map((c: any) => ({
      campaignId: c.id,
      accountId: c.account_id,
      type: c.type,
      title: c.title,
      subtitle: c.subtitle,
      slug: c.slug,
      url: c.url,
      goal: c.goal,
      raised: c.raised,
      donors: c.donors,
      currency: c.currency,
      status: c.status,
      endAt: c.end_at,
      createdAt: c.created_at,
      updatedAt: c.updated_at
    }));

    return {
      output: client.output(listCampaignsOutputSchema, {
        campaigns,
        totalCount: result.meta.total,
        currentPage: result.meta.current_page,
        lastPage: result.meta.last_page
      }),
      message: client.publicData(
        `Found **${result.meta.total}** campaigns (page ${result.meta.current_page} of ${result.meta.last_page}).`
      )
    };
  })
  .build();
