import { SlateTool } from 'slates';
import { z } from 'zod';
import { MoosendClient } from '../lib/client';
import { mapCampaign, optionalNumber, record, records } from '../lib/data';
import { spec } from '../spec';

let campaignSchema = z.object({
  campaignId: z.string().describe('Campaign ID'),
  name: z.string().describe('Campaign name'),
  subject: z.string().describe('Campaign subject line'),
  status: z.number().optional().describe('Campaign status code'),
  isTransactional: z.boolean().optional().describe('Whether the campaign is transactional'),
  createdOn: z.string().optional().describe('Creation timestamp'),
  deliveredOn: z.string().optional().describe('Delivery timestamp'),
  scheduledFor: z.string().optional().describe('Scheduled send timestamp'),
  scheduledForTimezone: z.string().optional().describe('Timezone of scheduled send'),
  totalSent: z.number().optional().describe('Total emails sent'),
  uniqueOpens: z.number().optional().describe('Unique opens count'),
  uniqueLinkClicks: z.number().optional().describe('Unique link clicks count'),
  recipientsCount: z.number().optional().describe('Number of recipients'),
  totalBounces: z.number().optional().describe('Total bounces'),
  totalComplaints: z.number().optional().describe('Total complaints'),
  totalUnsubscribes: z.number().optional().describe('Total unsubscribes')
});

export let getCampaigns = SlateTool.create(spec, {
  name: 'Get Campaigns',
  key: 'get_campaigns',
  description: `Retrieve a list of campaigns or details for a specific campaign. Returns campaign metadata, status, and high-level metrics. Use the campaign analytics tool for detailed performance data.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z
        .string()
        .optional()
        .describe(
          'Specific campaign ID to retrieve. If omitted, returns a paginated list of all campaigns.'
        ),
      page: z
        .number()
        .optional()
        .default(1)
        .describe('Page number for pagination (starts at 1)'),
      pageSize: z.number().optional().default(50).describe('Number of campaigns per page')
    })
  )
  .output(
    z.object({
      campaigns: z.array(campaignSchema).describe('List of campaigns'),
      totalCount: z.number().optional().describe('Total number of campaigns (when listing)'),
      currentPage: z.number().optional().describe('Current page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MoosendClient({ token: ctx.auth.token });

    if (ctx.input.campaignId) {
      let result = await client.getCampaign(ctx.input.campaignId);
      let campaign = mapCampaign(result);
      return {
        output: {
          campaigns: [campaign]
        },
        message: `Retrieved campaign **${campaign.name}** (${campaign.campaignId}).`
      };
    }

    let result = await client.getCampaigns(ctx.input.page, ctx.input.pageSize);
    let campaignsList = records(result.Campaigns, 'campaigns');
    let paging = result.Paging == null ? undefined : record(result.Paging, 'paging');

    let campaigns = campaignsList.map(mapCampaign);

    return {
      output: {
        campaigns,
        totalCount: optionalNumber(paging?.TotalResults),
        currentPage: ctx.input.page
      },
      message: `Retrieved **${campaigns.length}** campaign(s)${paging?.TotalResults ? ` of ${paging.TotalResults} total` : ''}.`
    };
  })
  .build();
