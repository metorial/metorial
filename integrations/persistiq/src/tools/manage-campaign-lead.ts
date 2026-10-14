import { SlateTool } from 'slates';
import { z } from 'zod';
import { type CampaignLead, Client } from '../lib/client';
import { spec } from '../spec';

export let manageCampaignLead = SlateTool.create(spec, {
  name: 'Manage Campaign Lead',
  key: 'manage_campaign_lead',
  description: `Add or remove a lead from a campaign. When adding a lead, optionally select a sending mailbox; otherwise the campaign owner mailbox is used. Use List Users to find available mailbox IDs.`,
  instructions: [
    'mailboxId is optional when adding a lead; the campaign owner mailbox is the default.',
    'The mailboxId can be found in user data (default_mailbox_id) via the List Users tool.'
  ]
})
  .input(
    z.object({
      campaignId: z.string().describe('Campaign ID from list_campaigns'),
      leadId: z.string().describe('Lead ID from list_leads or list_campaign_leads'),
      operation: z
        .enum(['add', 'remove'])
        .describe('Whether to add or remove the lead from the campaign'),
      mailboxId: z
        .string()
        .optional()
        .describe(
          'Optional sending mailbox ID from list_users; defaults to the campaign owner mailbox'
        ),
      skipIfExists: z
        .boolean()
        .optional()
        .describe(
          'When adding, return the existing membership instead of an error if the lead is already in the campaign'
        )
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful'),
      operation: z.string().describe('The operation that was performed'),
      campaignLeadId: z
        .string()
        .optional()
        .describe('Campaign membership ID returned when adding a lead'),
      campaignId: z.string().optional().describe('Campaign ID'),
      leadId: z.string().optional().describe('Lead ID'),
      mailboxId: z
        .string()
        .optional()
        .describe('Sending mailbox ID returned when adding a lead')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let campaignLead: CampaignLead | undefined;
    if (ctx.input.operation === 'add') {
      let result = await client.addLeadToCampaign(
        ctx.input.campaignId,
        ctx.input.leadId,
        ctx.input.mailboxId,
        ctx.input.skipIfExists
      );
      campaignLead = result.campaign_lead;
    } else {
      await client.removeLeadFromCampaign(ctx.input.campaignId, ctx.input.leadId);
    }

    let verb = ctx.input.operation === 'add' ? 'Added' : 'Removed';
    let prep = ctx.input.operation === 'add' ? 'to' : 'from';

    return {
      output: {
        success: true,
        operation: ctx.input.operation,
        campaignLeadId: campaignLead?.id,
        campaignId: ctx.input.campaignId,
        leadId: ctx.input.leadId,
        mailboxId: campaignLead?.mailbox_id
      },
      message: `${verb} lead **${ctx.input.leadId}** ${prep} campaign **${ctx.input.campaignId}**.`
    };
  })
  .build();
