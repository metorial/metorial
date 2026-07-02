import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCampaignReport = SlateTool.create(spec, {
  name: 'Get Campaign Report',
  key: 'get_campaign_report',
  description: `Retrieve performance metrics for a sent email campaign. Returns aggregate statistics including opens, clicks, bounces, unsubscribes, and abuse complaints. Optionally fetch detailed per-contact data for opens, clicks, bounces, or unsubscribes.`,
  instructions: [
    'Use `includeDetails` to also fetch individual contact-level records for specific metric types.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z.string().describe('ID of the campaign to get the report for'),
      includeDetails: z
        .array(z.enum(['opens', 'clicks', 'bounces', 'unsubscribes']))
        .optional()
        .describe('Include per-contact detail records for these metric types'),
      detailPageNumber: z
        .number()
        .optional()
        .describe('Page number for detail records (starts at 1)'),
      detailPageSize: z.number().optional().describe('Number of detail records per page')
    })
  )
  .output(
    z.object({
      campaignName: z.string().describe('Name of the campaign'),
      subject: z.string().describe('Email subject line'),
      sentDate: z.string().describe('Date the campaign was sent'),
      mailSent: z.number().describe('Total emails sent'),
      opens: z.number().describe('Total opens'),
      openRate: z.string().describe('Open percentage'),
      clicks: z.number().describe('Total clicks'),
      clickRate: z.string().describe('Click percentage'),
      bounces: z.number().describe('Total bounces'),
      bounceRate: z.string().describe('Bounce percentage'),
      unsubscribes: z.number().describe('Total unsubscribes'),
      unsubscribeRate: z.string().describe('Unsubscribe percentage'),
      abuseComplaints: z.number().describe('Total abuse complaints'),
      unopened: z.number().describe('Total unopened'),
      openDetails: z
        .array(
          z.object({
            contactId: z.string(),
            email: z.string(),
            name: z.string(),
            device: z.string(),
            date: z.string()
          })
        )
        .optional()
        .describe('Individual open records'),
      clickDetails: z
        .array(
          z.object({
            contactId: z.string(),
            email: z.string(),
            name: z.string(),
            clickCount: z.number(),
            date: z.string()
          })
        )
        .optional()
        .describe('Individual click records'),
      bounceDetails: z
        .array(
          z.object({
            contactId: z.string(),
            email: z.string(),
            name: z.string(),
            bounceType: z.string(),
            date: z.string()
          })
        )
        .optional()
        .describe('Individual bounce records'),
      unsubscribeDetails: z
        .array(
          z.object({
            contactId: z.string(),
            email: z.string(),
            name: z.string(),
            reason: z.string(),
            date: z.string()
          })
        )
        .optional()
        .describe('Individual unsubscribe records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { campaignId, includeDetails } = ctx.input;
    let pageParams = {
      pageNumber: ctx.input.detailPageNumber,
      pageSize: ctx.input.detailPageSize
    };

    let reportResult = await client.getCampaignReport(campaignId);
    let r = reportResult?.Data;

    let output: Record<string, any> = {
      campaignName: String(r?.EmailName ?? ''),
      subject: String(r?.Subject ?? ''),
      sentDate: String(r?.Completed ?? ''),
      mailSent: Number(r?.MailSent ?? 0),
      opens: Number(r?.Opens ?? 0),
      openRate: String(r?.OpenPer ?? '0%'),
      clicks: Number(r?.Clicks ?? 0),
      clickRate: String(r?.ClickPer ?? '0%'),
      bounces: Number(r?.Bounces ?? 0),
      bounceRate: String(r?.BouncePer ?? '0%'),
      unsubscribes: Number(r?.Unsubscribes ?? 0),
      unsubscribeRate: String(r?.UnsubscribePer ?? '0%'),
      abuseComplaints: Number(r?.Abuse ?? 0),
      unopened: Number(r?.Unopened ?? 0)
    };

    if (includeDetails?.includes('opens')) {
      let opens = await client.getCampaignOpens(campaignId, pageParams);
      output.openDetails = (opens?.Data ?? []).map((o: any) => ({
        contactId: String(o.ContactID ?? ''),
        email: String(o.Email ?? ''),
        name: String(o.Name ?? ''),
        device: String(o.Device ?? ''),
        date: String(o.Date ?? '')
      }));
    }

    if (includeDetails?.includes('clicks')) {
      let clicks = await client.getCampaignClicks(campaignId, pageParams);
      output.clickDetails = (clicks?.Data ?? []).map((c: any) => ({
        contactId: String(c.ContactID ?? ''),
        email: String(c.Email ?? ''),
        name: String(c.Name ?? ''),
        clickCount: Number(c.Count ?? 0),
        date: String(c.Date ?? '')
      }));
    }

    if (includeDetails?.includes('bounces')) {
      let bounces = await client.getCampaignBounces(campaignId, pageParams);
      output.bounceDetails = (bounces?.Data ?? []).map((b: any) => ({
        contactId: String(b.ContactID ?? ''),
        email: String(b.Email ?? ''),
        name: String(b.Name ?? ''),
        bounceType: String(b.ReportType ?? ''),
        date: String(b.Date ?? '')
      }));
    }

    if (includeDetails?.includes('unsubscribes')) {
      let unsubs = await client.getCampaignUnsubscribes(campaignId, pageParams);
      output.unsubscribeDetails = (unsubs?.Data ?? []).map((u: any) => ({
        contactId: String(u.ContactID ?? ''),
        email: String(u.Email ?? ''),
        name: String(u.Name ?? ''),
        reason: String(u.Reason ?? ''),
        date: String(u.Date ?? '')
      }));
    }

    return {
      output: output as any,
      message: `Campaign **"${output.campaignName}"**: ${output.mailSent} sent, ${output.opens} opens (${output.openRate}), ${output.clicks} clicks (${output.clickRate}), ${output.bounces} bounces, ${output.unsubscribes} unsubscribes.`
    };
  })
  .build();
