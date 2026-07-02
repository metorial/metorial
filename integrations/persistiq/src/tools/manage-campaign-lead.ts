import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageCampaignLead = SlateTool.create(spec, {
  name: 'Manage Campaign Lead',
  key: 'manage_campaign_lead',
  description: `Add or remove a lead from a campaign. When adding a lead, a mailbox ID is required to specify which mailbox sends emails for that campaign. Use the **List Users** tool to find available mailbox IDs.`,
  instructions: [
    'When adding a lead, the mailboxId parameter is required.',
    'The mailboxId can be found in user data (default_mailbox_id) via the List Users tool.'
  ]
})
  .input(
    z.object({
      campaignId: z.string().describe('ID of the campaign'),
      leadId: z.string().describe('ID of the lead to add or remove'),
      operation: z
        .enum(['add', 'remove'])
        .describe('Whether to add or remove the lead from the campaign'),
      mailboxId: z
        .string()
        .optional()
        .describe('Mailbox ID to use for sending (required when adding a lead)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful'),
      operation: z.string().describe('The operation that was performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.operation === 'add') {
      if (!ctx.input.mailboxId) {
        throw new Error('mailboxId is required when adding a lead to a campaign');
      }
      await client.addLeadToCampaign(
        ctx.input.campaignId,
        ctx.input.leadId,
        ctx.input.mailboxId
      );
    } else {
      await client.removeLeadFromCampaign(ctx.input.campaignId, ctx.input.leadId);
    }

    let verb = ctx.input.operation === 'add' ? 'Added' : 'Removed';
    let prep = ctx.input.operation === 'add' ? 'to' : 'from';

    return {
      output: {
        success: true,
        operation: ctx.input.operation
      },
      message: `${verb} lead **${ctx.input.leadId}** ${prep} campaign **${ctx.input.campaignId}**.`
    };
  })
  .build();
