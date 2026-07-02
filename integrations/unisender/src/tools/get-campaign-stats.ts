import { SlateTool } from 'slates';
import { z } from 'zod';
import { UnisenderClient } from '../lib/client';
import { spec } from '../spec';

export let getCampaignStats = SlateTool.create(spec, {
  name: 'Get Campaign Statistics',
  key: 'get_campaign_stats',
  description: `Retrieve statistics for a campaign including delivery status, open rates, click rates, unsubscribes, spam complaints, and visited links. Combines campaign status, common stats, and link visit data into a single response.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z.number().describe('ID of the campaign to get statistics for'),
      includeVisitedLinks: z
        .boolean()
        .optional()
        .describe('Whether to include visited link details'),
      groupLinks: z.boolean().optional().describe('Whether to group visited links')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Current campaign status'),
      creationTime: z.string().optional().describe('When the campaign was created'),
      startTime: z.string().optional().describe('When the campaign started sending'),
      stats: z
        .object({
          total: z.number().describe('Total recipients'),
          sent: z.number().describe('Messages sent'),
          delivered: z.number().describe('Messages delivered'),
          readUnique: z.number().describe('Unique opens'),
          readAll: z.number().describe('Total opens'),
          clickedUnique: z.number().describe('Unique link clicks'),
          clickedAll: z.number().describe('Total link clicks'),
          unsubscribed: z.number().describe('Unsubscribes'),
          spam: z.number().describe('Spam complaints')
        })
        .optional()
        .describe('Common campaign statistics'),
      visitedLinks: z.any().optional().describe('Visited link details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new UnisenderClient({
      token: ctx.auth.token,
      locale: ctx.config.locale
    });

    let statusResult = await client.getCampaignStatus(ctx.input.campaignId);

    let stats: any;
    try {
      let commonStats = await client.getCampaignCommonStats(ctx.input.campaignId);
      stats = {
        total: commonStats.total,
        sent: commonStats.sent,
        delivered: commonStats.delivered,
        readUnique: commonStats.read_unique,
        readAll: commonStats.read_all,
        clickedUnique: commonStats.clicked_unique,
        clickedAll: commonStats.clicked_all,
        unsubscribed: commonStats.unsubscribed,
        spam: commonStats.spam
      };
    } catch (_e) {
      ctx.warn('Could not fetch common stats — campaign may not have started yet');
    }

    let visitedLinks: any;
    if (ctx.input.includeVisitedLinks) {
      try {
        visitedLinks = await client.getVisitedLinks({
          campaign_id: ctx.input.campaignId,
          group: ctx.input.groupLinks ? 1 : 0
        });
      } catch (_e) {
        ctx.warn('Could not fetch visited links');
      }
    }

    return {
      output: {
        status: statusResult.status,
        creationTime: statusResult.creation_time,
        startTime: statusResult.start_time,
        stats,
        visitedLinks
      },
      message: `Campaign \`${ctx.input.campaignId}\` — status: **${statusResult.status}**${stats ? `, ${stats.delivered} delivered, ${stats.readUnique} opened, ${stats.clickedUnique} clicked` : ''}`
    };
  })
  .build();
