import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCampaignLeads = SlateTool.create(spec, {
  name: 'List Campaign Leads',
  key: 'list_campaign_leads',
  description:
    'List prospects enrolled in a campaign, including their lead IDs, sending mailbox, contact details, and current status. Call list_campaigns to discover campaign IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      campaignId: z.string().min(1).describe('Campaign ID from list_campaigns'),
      page: z.number().int().min(0).optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      campaignLeads: z
        .array(
          z.object({
            campaignLeadId: z.string().describe('Campaign membership ID'),
            campaignId: z.string().optional().describe('Campaign ID'),
            mailboxId: z.string().optional().describe('Sending mailbox ID'),
            leadId: z
              .string()
              .optional()
              .describe('Lead ID to use with get_lead or manage_campaign_lead'),
            email: z.string().optional().nullable().describe('Prospect email address'),
            firstName: z.string().optional().nullable().describe('Prospect first name'),
            lastName: z.string().optional().nullable().describe('Prospect last name'),
            status: z.string().optional().nullable().describe('Current prospect status'),
            optedOut: z
              .boolean()
              .optional()
              .nullable()
              .describe('Whether the prospect opted out'),
            bounced: z
              .boolean()
              .optional()
              .nullable()
              .describe('Whether emails to the prospect bounced')
          })
        )
        .describe('Campaign memberships and prospect details'),
      hasMore: z.boolean().describe('Whether more memberships are available'),
      nextPage: z
        .string()
        .optional()
        .nullable()
        .describe('Provider continuation value for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).listCampaignLeads(
      ctx.input.campaignId,
      ctx.input.page
    );
    let campaignLeads = (result.campaign_leads || []).map(membership => ({
      campaignLeadId: membership.id,
      campaignId: membership.campaign_id,
      mailboxId: membership.mailbox_id,
      leadId: membership.lead?.id,
      email: membership.lead?.data?.email,
      firstName: membership.lead?.data?.first_name,
      lastName: membership.lead?.data?.last_name,
      status: membership.lead?.status,
      optedOut: membership.lead?.optedout,
      bounced: membership.lead?.bounced
    }));
    return {
      output: {
        campaignLeads,
        hasMore: result.has_more ?? !!result.next_page,
        nextPage: result.next_page
      },
      message: `Retrieved **${campaignLeads.length}** campaign leads.`
    };
  })
  .build();
