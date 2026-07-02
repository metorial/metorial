import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateLeadCampaignStatus = SlateTool.create(spec, {
  name: 'Update Lead Campaign Status',
  key: 'update_lead_campaign_status',
  description: `Change the status of a lead within a specific La Growth Machine campaign. Use this to pause, resume, stop, convert, subscribe, or unsubscribe a lead in a campaign.`
})
  .input(
    z.object({
      campaignId: z.string().describe('ID of the campaign'),
      status: z
        .enum(['PAUSED', 'RESUME', 'STOPPED', 'CONVERTED', 'SUBSCRIBED', 'UNSUBSCRIBED'])
        .describe('New status for the lead in the campaign'),
      email: z.string().optional().describe('Email address to identify the lead'),
      leadId: z.string().optional().describe('La Growth Machine lead ID'),
      linkedinUrl: z.string().optional().describe('LinkedIn profile URL'),
      firstname: z
        .string()
        .optional()
        .describe('First name (use with lastname and company fields)'),
      lastname: z
        .string()
        .optional()
        .describe('Last name (use with firstname and company fields)'),
      companyName: z.string().optional().describe('Company name'),
      companyUrl: z.string().optional().describe('Company website URL')
    })
  )
  .output(
    z.object({
      result: z.any().describe('Confirmation of the status update')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.updateLeadStatus({
      campaignId: ctx.input.campaignId,
      status: ctx.input.status,
      email: ctx.input.email,
      leadId: ctx.input.leadId,
      linkedinUrl: ctx.input.linkedinUrl,
      firstname: ctx.input.firstname,
      lastname: ctx.input.lastname,
      companyName: ctx.input.companyName,
      companyUrl: ctx.input.companyUrl
    });

    return {
      output: { result },
      message: `Lead status updated to **${ctx.input.status}** in campaign **${ctx.input.campaignId}**.`
    };
  })
  .build();
