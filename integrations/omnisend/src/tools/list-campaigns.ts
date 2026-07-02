import { SlateTool } from 'slates';
import { z } from 'zod';
import { OmnisendClient } from '../lib/client';
import { spec } from '../spec';

let campaignSchema = z.object({
  campaignId: z.string().describe('Campaign ID'),
  name: z.string().optional().describe('Campaign name'),
  channel: z.string().optional().describe('Channel type (email, sms, push)'),
  type: z.string().optional().describe('Campaign type (standard or abTest)'),
  status: z.string().optional().describe('Campaign status (e.g., draft, sent)'),
  subjectLine: z.string().optional().describe('Email subject line'),
  startDate: z.string().optional().describe('Scheduled start date'),
  endDate: z.string().optional().describe('End date'),
  sendStartDate: z.string().optional().describe('Actual send start date'),
  sendEndDate: z.string().optional().describe('Actual send end date'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last updated timestamp'),
  tzoEnabled: z.boolean().optional().describe('Time zone optimization enabled')
});

export let listCampaigns = SlateTool.create(spec, {
  name: 'List Campaigns',
  key: 'list_campaigns',
  description: `List marketing campaigns from Omnisend. Returns campaign details including name, channel (email/SMS/push), status, and scheduling info. Optionally filter by update date.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      updatedAfter: z
        .string()
        .optional()
        .describe('Filter campaigns updated after this date (ISO 8601)')
    })
  )
  .output(
    z.object({
      campaigns: z.array(campaignSchema).describe('List of campaigns')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OmnisendClient(ctx.auth.token);

    let result = await client.listCampaigns({
      updatedAtFrom: ctx.input.updatedAfter
    });

    let campaigns = (result.campaigns || []).map((c: any) => ({
      campaignId: c.id,
      name: c.name,
      channel: c.channel,
      type: c.type,
      status: c.status,
      subjectLine: c.subjectLine,
      startDate: c.startDate,
      endDate: c.endDate,
      sendStartDate: c.sendStartDate,
      sendEndDate: c.sendEndDate,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      tzoEnabled: c.tzoEnabled
    }));

    return {
      output: { campaigns },
      message: `Retrieved **${campaigns.length}** campaigns.`
    };
  })
  .build();
