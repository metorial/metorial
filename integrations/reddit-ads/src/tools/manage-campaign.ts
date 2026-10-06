import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { accountInput, resourceOutput } from '../lib/contracts';
import { campaignPayload } from '../lib/mappers';
import { spec } from '../spec';

export let manageCampaign = SlateTool.create(spec, {
  name: 'Manage Campaign',
  key: 'manage_campaign',
  description:
    'Create or update a Standard campaign. Creation requires an explicit status; ACTIVE may enable advertising spend. ARCHIVED/DELETED are retained states, not history erasure. Current API constraints and account ownership are checked before writing.',
  instructions: [
    'To create a campaign, omit the campaignId field. To update, provide the campaignId of the campaign to modify.',
    'Budget is in cents of the account currency. LIFETIME non-CBO is a spend cap; DAILY requires explicit CBO and its required Pixel, goal, bidding and schedule fields.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      accountId: accountInput,
      isCampaignBudgetOptimization: z
        .boolean()
        .optional()
        .describe(
          'Explicit CBO mode for a new campaign; immutable after publishing. DAILY campaign budgets require true.'
        ),
      fundingInstrumentId: z
        .string()
        .optional()
        .describe('Campaign funding instrument, when required by the account.'),
      conversionPixelId: z
        .string()
        .optional()
        .describe('Pixel ID required for new CBO campaigns.'),
      bidType: z.enum(['CPC', 'CPM', 'CPV6', 'CPV15']).optional().describe('CBO bid type.'),
      optimizationStrategy: z
        .enum(['BIDLESS', 'MAXIMIZE_VOLUME', 'TARGET_CPX'])
        .optional()
        .describe('CBO optimization strategy.'),
      bidCents: z.number().optional().describe('CBO bid cost cap in cents; omit for BIDLESS.'),
      optimizationGoal: z
        .string()
        .optional()
        .describe('Objective-specific goal for a new CBO campaign; immutable.'),
      appId: z.string().optional().describe('App identifier for a new app-install campaign.'),
      campaignId: z
        .string()
        .optional()
        .describe('Campaign ID to update; omit to create a new campaign'),
      name: z.string().optional().describe('Campaign name'),
      objective: z
        .enum([
          'BRAND_AWARENESS',
          'TRAFFIC',
          'CONVERSIONS',
          'VIDEO_VIEWS',
          'APP_INSTALLS',
          'CATALOG_SALES',
          'REACH',
          'ENGAGEMENT',
          'CLICKS',
          'IMPRESSIONS',
          'LEAD_GENERATION',
          'SALES',
          'VIDEO_VIEWABLE_IMPRESSIONS'
        ])
        .optional()
        .describe(
          'Current API objective. Legacy TRAFFIC/VIDEO_VIEWS/REACH/ENGAGEMENT are retained but fail with remediation; select documented current values.'
        ),
      budgetCents: z
        .number()
        .optional()
        .describe('Total budget in cents (e.g., 10000 = $100 USD)'),
      budgetType: z.enum(['DAILY', 'LIFETIME']).optional().describe('Budget type'),
      startDate: z.string().optional().describe('Campaign start date in ISO 8601 format'),
      endDate: z.string().optional().describe('Campaign end date in ISO 8601 format'),
      status: z
        .enum(['ACTIVE', 'PAUSED', 'ARCHIVED', 'DELETED'])
        .optional()
        .describe('Campaign status')
    })
  )
  .output(
    z.object({
      campaignId: z.string().optional(),
      name: z.string().optional(),
      objective: z.string().optional(),
      status: z.string().optional(),
      budgetCents: z.number().optional(),
      budgetType: z.string().optional(),
      raw: z.any().optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const payload = await campaignPayload(client, ctx.input);
    const result = await client.write('campaign', ctx.input.campaignId, payload);
    return {
      output: resourceOutput('campaign', result),
      message:
        'Reddit acknowledged the resource write. Read it back to verify its configured and effective delivery states.'
    };
  })
  .build();
