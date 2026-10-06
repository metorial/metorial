import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, invalid } from '../lib/client';
import { spec } from '../spec';

export let manageAccountCampaignMappings = SlateTool.create(spec, {
  name: 'Manage Account Campaign Mappings',
  key: 'manage_account_campaign_mappings',
  description:
    'Read campaigns associated with a sending account, or the sender list of a campaign. The current documented API has no mapping create/delete operation or opaque mapping ID; legacy add/remove actions are retained but cannot execute.',
  instructions: [
    'Use list with accountEmail for paginated campaign associations, or campaignId to read the campaign sender list.',
    'To change senders, use update_campaign with sendingAccounts, which explicitly replaces the full sender list.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'add', 'remove'])
        .describe('Action. Current documented API supports list only.'),
      campaignId: z
        .string()
        .optional()
        .describe(
          'Campaign ID for reading the complete sender list. Retained for legacy add calls.'
        ),
      accountEmail: z
        .string()
        .optional()
        .describe(
          'Sending-account email address for paginated association discovery. Retained for legacy add calls.'
        ),
      mappingId: z
        .string()
        .optional()
        .describe(
          'Legacy opaque mapping ID. The current documented API does not expose or delete mappings by ID.'
        ),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Page size when reading associations by accountEmail.'),
      startingAfter: z
        .string()
        .optional()
        .describe('Cursor when reading associations by accountEmail.')
    })
  )
  .output(
    z.object({
      mappings: z
        .array(
          z.object({
            mappingId: z
              .string()
              .optional()
              .describe(
                'Legacy mapping identifier, omitted because current responses contain no mapping ID.'
              ),
            campaignId: z.string().optional().describe('Campaign ID.'),
            campaignName: z
              .string()
              .optional()
              .describe('Campaign name when supplied by the provider.'),
            accountEmail: z.string().optional().describe('Sending account email.')
          })
        )
        .optional(),
      nextStartingAfter: z.string().nullable().optional(),
      createdMapping: z
        .any()
        .optional()
        .describe('Legacy creation output; current add requests cannot execute.'),
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.action !== 'list') {
      throw invalid(
        'The current documented API has no standalone mapping add/remove operation. Use update_campaign with the complete sendingAccounts list; opaque mappingId cannot be resolved.'
      );
    }
    let client = new Client({ token: ctx.auth.token });
    if (ctx.input.accountEmail) {
      let result = await client.listAccountCampaignMappings(ctx.input.accountEmail, ctx.input);
      let mappings = result.items
        .filter(item => !ctx.input.campaignId || item.campaign_id === ctx.input.campaignId)
        .map(item => ({
          campaignId: item.campaign_id,
          campaignName: item.campaign_name,
          accountEmail: ctx.input.accountEmail
        }));
      return {
        output: { mappings, nextStartingAfter: result.next_starting_after, success: true },
        message: `Found ${mappings.length} campaign association(s) on this page. No mapping IDs are available.`
      };
    }
    if (!ctx.input.campaignId)
      throw invalid('Provide accountEmail or campaignId to read sender associations.');
    if (ctx.input.startingAfter !== undefined)
      throw invalid(
        'Campaign sender-list reads are not paginated; use accountEmail for cursor pagination.'
      );
    let campaign = await client.getCampaign(ctx.input.campaignId);
    if (
      !Array.isArray(campaign.email_list) ||
      !campaign.email_list.every((email: unknown) => typeof email === 'string')
    ) {
      throw invalid('The campaign response did not contain a valid sending-account list.');
    }
    let mappings = campaign.email_list.map((email: string) => ({
      campaignId: ctx.input.campaignId,
      campaignName: campaign.name,
      accountEmail: email
    }));
    return {
      output: { mappings, nextStartingAfter: null, success: true },
      message: `Read ${mappings.length} configured sender(s). No mapping IDs are available.`
    };
  })
  .build();
