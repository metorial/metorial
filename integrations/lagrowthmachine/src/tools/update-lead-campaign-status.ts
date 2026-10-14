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
      campaignId: z.string().describe('Campaign ID. Use get_campaigns to find campaigns.'),
      status: z
        .enum(['PAUSED', 'RESUME', 'STOPPED', 'CONVERTED', 'SUBSCRIBED', 'UNSUBSCRIBED'])
        .describe('New status for the lead in the campaign'),
      email: z.string().optional().describe('Email address to identify the lead'),
      proEmail: z
        .string()
        .optional()
        .describe('Professional email address to identify the lead'),
      persoEmail: z
        .string()
        .optional()
        .describe('Personal email address to identify the lead'),
      twitter: z.string().optional().describe('Twitter/X handle to identify the lead'),
      crmId: z.string().optional().describe('Contact ID in the connected CRM'),
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
      proEmail: ctx.input.proEmail,
      persoEmail: ctx.input.persoEmail,
      twitter: ctx.input.twitter,
      crmId: ctx.input.crmId,
      leadId: ctx.input.leadId,
      linkedinUrl: ctx.input.linkedinUrl,
      firstname: ctx.input.firstname,
      lastname: ctx.input.lastname,
      companyName: ctx.input.companyName,
      companyUrl: ctx.input.companyUrl
    });

    return {
      output: { result },
      message: result?.logs?.some((log: { leadUpdated?: boolean }) => log.leadUpdated)
        ? `Lead status updated to **${ctx.input.status}** in campaign **${ctx.input.campaignId}**.`
        : 'Status request completed without a confirmed lead update. Inspect the result logs for matching campaigns and reasons.'
    };
  })
  .build();
