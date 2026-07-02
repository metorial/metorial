import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageAccountCampaignMappings = SlateTool.create(spec, {
  name: 'Manage Account Campaign Mappings',
  key: 'manage_account_campaign_mappings',
  description: `List, create, or remove mappings between email sending accounts and campaigns. These mappings control which accounts send emails for each campaign.`,
  instructions: [
    'Use action "list" to view which accounts are linked to a campaign.',
    'Use action "add" to link a sending account to a campaign.',
    'Use action "remove" to unlink an account from a campaign.'
  ]
})
  .input(
    z.object({
      action: z.enum(['list', 'add', 'remove']).describe('Action to perform.'),
      campaignId: z
        .string()
        .optional()
        .describe('Campaign ID (for "list" and "add" actions).'),
      accountEmail: z
        .string()
        .optional()
        .describe('Sending account email address (for "add" action).'),
      mappingId: z.string().optional().describe('Mapping ID to remove (for "remove" action).'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of mappings to return (for "list" action).'),
      startingAfter: z
        .string()
        .optional()
        .describe('Cursor for pagination (for "list" action).')
    })
  )
  .output(
    z.object({
      mappings: z
        .array(
          z.object({
            mappingId: z.string().describe('Mapping ID'),
            campaignId: z.string().optional().describe('Campaign ID'),
            accountEmail: z.string().optional().describe('Account email')
          })
        )
        .optional()
        .describe('List of mappings (for "list" action)'),
      nextStartingAfter: z.string().nullable().optional().describe('Cursor for next page'),
      createdMapping: z.any().optional().describe('Created mapping details'),
      success: z.boolean().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action } = ctx.input;

    if (action === 'list') {
      let result = await client.listAccountCampaignMappings({
        limit: ctx.input.limit,
        startingAfter: ctx.input.startingAfter,
        campaignId: ctx.input.campaignId
      });

      let mappings = result.items.map((m: any) => ({
        mappingId: m.id,
        campaignId: m.campaign_id,
        accountEmail: m.email
      }));

      return {
        output: {
          mappings,
          nextStartingAfter: result.next_starting_after,
          success: true
        },
        message: `Found **${mappings.length}** account-campaign mapping(s).`
      };
    }

    if (action === 'add' && ctx.input.campaignId && ctx.input.accountEmail) {
      let result = await client.createAccountCampaignMapping({
        campaignId: ctx.input.campaignId,
        accountEmail: ctx.input.accountEmail
      });
      return {
        output: { createdMapping: result, success: true },
        message: `Linked **${ctx.input.accountEmail}** to campaign ${ctx.input.campaignId}.`
      };
    }

    if (action === 'remove' && ctx.input.mappingId) {
      await client.deleteAccountCampaignMapping(ctx.input.mappingId);
      return {
        output: { success: true },
        message: `Removed account-campaign mapping ${ctx.input.mappingId}.`
      };
    }

    return {
      output: { success: false },
      message: 'Missing required parameters for the specified action.'
    };
  })
  .build();
