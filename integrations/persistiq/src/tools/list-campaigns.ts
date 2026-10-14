import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let campaignSchema = z.object({
  campaignId: z.string().describe('Unique identifier for the campaign'),
  name: z.string().optional().nullable().describe('Name of the campaign'),
  creatorId: z.string().optional().nullable().describe('ID of the campaign creator'),
  creatorName: z.string().optional().nullable().describe('Name of the campaign creator'),
  creatorEmail: z.string().optional().nullable().describe('Email of the campaign creator'),
  prospectsContacted: z
    .number()
    .optional()
    .nullable()
    .describe('Number of prospects contacted'),
  prospectsReached: z.number().optional().nullable().describe('Number of prospects reached'),
  prospectsReplied: z
    .number()
    .optional()
    .nullable()
    .describe('Number of prospects who replied'),
  prospectsOpened: z
    .number()
    .optional()
    .nullable()
    .describe('Number of prospects who opened emails'),
  prospectsBounced: z.number().optional().nullable().describe('Number of bounced prospects'),
  prospectsOptedOut: z
    .number()
    .optional()
    .nullable()
    .describe('Number of prospects who opted out'),
  totalContacted: z
    .number()
    .optional()
    .nullable()
    .describe('Total number contacted, if supplied by the provider'),
  totalProspects: z
    .number()
    .optional()
    .nullable()
    .describe('Total number of prospects in the campaign')
});

export let listCampaigns = SlateTool.create(spec, {
  name: 'List Campaigns',
  key: 'list_campaigns',
  description: `List all outreach campaigns in your PersistIQ account. Returns campaign details including name, creator, and engagement statistics (contacted, replied, opened, bounced, opted out). Supports pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z
        .number()
        .min(0)
        .refine(Number.isSafeInteger, 'Page must be a safe whole number')
        .optional()
        .describe('Page number for pagination'),
      name: z.string().optional().describe('Filter by campaign name'),
      ownerId: z.string().optional().describe('Filter by owner user ID from list_users'),
      leadId: z
        .string()
        .optional()
        .describe('Filter campaigns containing a lead ID from list_leads')
    })
  )
  .output(
    z.object({
      campaigns: z.array(campaignSchema).describe('List of campaigns'),
      hasMore: z.boolean().describe('Whether there are more pages of results'),
      nextPage: z
        .string()
        .optional()
        .nullable()
        .describe('Provider continuation value for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listCampaigns(ctx.input);

    let campaigns = (result.campaigns || []).map(c => ({
      campaignId: c.id,
      name: c.name,
      creatorId: c.creator?.id,
      creatorName: c.creator?.name,
      creatorEmail: c.creator?.email,
      prospectsContacted: c.stats?.prospects_contacted,
      prospectsReached: c.stats?.prospects_reached,
      prospectsReplied: c.stats?.prospects_replied,
      prospectsOpened: c.stats?.prospects_opened,
      prospectsBounced: c.stats?.prospects_bounced,
      prospectsOptedOut: c.stats?.prospects_optedout,
      totalContacted: c.stats?.total_contacted,
      totalProspects: c.stats?.total_prospects
    }));

    let hasMore = result.has_more ?? !!result.next_page;

    return {
      output: { campaigns, hasMore, nextPage: result.next_page },
      message: `Retrieved **${campaigns.length}** campaigns${hasMore ? ' (more pages available)' : ''}.`
    };
  })
  .build();
