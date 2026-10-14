import { SlateTool } from 'slates';
import { z } from 'zod';
import { SendloopClient } from '../lib/client';
import { spec } from '../spec';

export let getCampaignReport = SlateTool.create(spec, {
  name: 'Get Campaign Report',
  key: 'get_campaign_report',
  description: `Retrieve detailed performance reports for a campaign including opens, clicks, bounces, unsubscriptions, forwards, and geographic open locations. Select which metrics to include. Opens are aggregate statistics; other sections return a page of event records.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z.string().describe('ID of the campaign to get the report for'),
      page: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe('Page of event data to retrieve; defaults to 1'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .describe('Event records per section; defaults to 10 and maximum is 50'),
      includeOpens: z.boolean().optional().default(true).describe('Include open statistics'),
      includeClicks: z.boolean().optional().default(true).describe('Include link click data'),
      includeBounces: z.boolean().optional().default(false).describe('Include bounce details'),
      includeUnsubscriptions: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include unsubscription data'),
      includeForwards: z.boolean().optional().default(false).describe('Include forward data'),
      includeOpenLocations: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include geographic open locations')
    })
  )
  .output(
    z.object({
      campaignId: z.string().describe('Campaign ID the report is for'),
      opens: z.any().optional().describe('Open statistics'),
      clicks: z.any().optional().describe('Link click data'),
      bounces: z.any().optional().describe('Bounce details'),
      unsubscriptions: z.any().optional().describe('Unsubscription data'),
      forwards: z.any().optional().describe('Forward data'),
      openLocations: z.any().optional().describe('Geographic open locations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SendloopClient({
      token: ctx.auth.token,
      subdomain: ctx.auth.subdomain || ctx.config.subdomain
    });

    let { campaignId, page, limit } = ctx.input;
    let pagination = { page, limit };
    let sections: string[] = [];

    let opens: any;
    let clicks: any;
    let bounces: any;
    let unsubscriptions: any;
    let forwards: any;
    let openLocations: any;

    if (ctx.input.includeOpens) {
      opens = await client.getCampaignOpens(campaignId);
      sections.push('opens');
    }

    if (ctx.input.includeClicks) {
      clicks = await client.getCampaignLinkClicks(campaignId, pagination);
      sections.push('clicks');
    }

    if (ctx.input.includeBounces) {
      bounces = await client.getCampaignBounceDetails(campaignId, pagination);
      sections.push('bounces');
    }

    if (ctx.input.includeUnsubscriptions) {
      unsubscriptions = await client.getCampaignUnsubscriptions(campaignId, pagination);
      sections.push('unsubscriptions');
    }

    if (ctx.input.includeForwards) {
      forwards = await client.getCampaignForwards(campaignId, pagination);
      sections.push('forwards');
    }

    if (ctx.input.includeOpenLocations) {
      openLocations = await client.getCampaignOpenLocations(campaignId, pagination);
      sections.push('open locations');
    }

    return {
      output: {
        campaignId,
        opens,
        clicks,
        bounces,
        unsubscriptions,
        forwards,
        openLocations
      },
      message: `Retrieved campaign report for **${campaignId}** including: ${sections.join(', ')}.`
    };
  })
  .build();
