import { SlateTool } from 'slates';
import { z } from 'zod';
import { ToneDenClient } from '../lib/client';
import { spec } from '../spec';

let audienceSchema = z
  .object({
    type: z.string().describe('Audience type identifier'),
    value: z.any().optional().describe('Audience targeting value')
  })
  .passthrough();

let campaignOutputSchema = z.object({
  campaignId: z.number().describe('Unique campaign ID'),
  title: z.string().describe('Campaign title'),
  platform: z.string().describe('Ad platform (facebook or google)'),
  status: z.string().describe('Campaign status'),
  budgetType: z.string().optional().describe('Budget type'),
  budgetAmount: z
    .number()
    .optional()
    .describe('Budget amount in lowest currency denomination'),
  currency: z.string().optional().describe('3-letter currency code'),
  startTimestamp: z.number().optional().describe('Campaign start time (UNIX timestamp)'),
  endTimestamp: z.number().optional().describe('Campaign end time (UNIX timestamp)'),
  isContinuous: z
    .boolean()
    .optional()
    .describe('Whether the campaign runs until manually paused'),
  externalId: z.string().optional().describe('External ad platform campaign ID')
});

export let manageCampaign = SlateTool.create(spec, {
  name: 'Manage Ad Campaign',
  key: 'manage_campaign',
  description: `Create, retrieve, update, or delete an ad campaign on Facebook or Google.
When creating, specify platform, objective, budget, targeting, and creatives.
When updating, only the fields you provide will be changed.
Supports A/B testing through multiple creative variations in the creatives field.`,
  instructions: [
    'To create a campaign, set action to "create" and provide platform, title, targetType, and budget fields.',
    'To update a campaign, set action to "update" and provide campaignId plus the fields to modify.',
    'Budget amounts are in the lowest currency denomination (e.g., cents for USD).'
  ]
})
  .input(
    z.object({
      action: z.enum(['create', 'get', 'update', 'delete']).describe('Operation to perform'),
      campaignId: z
        .number()
        .optional()
        .describe('Campaign ID (required for get, update, delete)'),
      title: z.string().optional().describe('Campaign name'),
      platform: z.enum(['facebook', 'google']).optional().describe('Ad platform'),
      status: z
        .enum(['active', 'inactive', 'draft', 'paused'])
        .optional()
        .describe('Campaign status'),
      targetType: z
        .enum([
          'app',
          'conversion',
          'dynamic_product',
          'event',
          'likes',
          'link',
          'page_messaging',
          'post_engagement',
          'video_views'
        ])
        .optional()
        .describe('Campaign objective/target type'),
      target: z.string().optional().describe('Target URL or platform-specific ID'),
      budgetType: z.enum(['daily', 'lifetime']).optional().describe('Budget type'),
      budgetAmount: z
        .number()
        .optional()
        .describe('Budget amount in lowest currency denomination'),
      currency: z.string().optional().describe('3-letter currency code'),
      startTimestamp: z.number().optional().describe('Start time as UNIX timestamp'),
      endTimestamp: z.number().optional().describe('End time as UNIX timestamp'),
      isContinuous: z.boolean().optional().describe('Run until manually paused'),
      audiences: z.array(audienceSchema).optional().describe('Audience targeting groups'),
      creatives: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Creative configuration (platform-specific). Each field accepts an array of variations for A/B testing.'
        ),
      targeting: z
        .record(z.string(), z.any())
        .optional()
        .describe('Campaign-level targeting settings'),
      externalAdAccountId: z.string().optional().describe('Facebook/Google ad account ID'),
      externalPosterId: z.string().optional().describe('External poster ID'),
      instagramAccountId: z
        .string()
        .optional()
        .describe('Instagram account ID for the campaign'),
      objective: z.string().optional().describe('Facebook pixel ID for conversion tracking'),
      optimizationId: z.string().optional().describe('Conversion event name for optimization')
    })
  )
  .output(
    z.object({
      campaign: campaignOutputSchema
        .optional()
        .describe('Campaign details (for create, get, update)'),
      deleted: z.boolean().optional().describe('Whether the campaign was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ToneDenClient({ token: ctx.auth.token });
    let { action, campaignId } = ctx.input;

    if (action === 'get') {
      if (!campaignId) throw new Error('campaignId is required for get action');
      let campaign = await client.getCampaign(campaignId);
      return {
        output: {
          campaign: {
            campaignId: campaign.id,
            title: campaign.title,
            platform: campaign.platform,
            status: campaign.status,
            budgetType: campaign.budget_type,
            budgetAmount: campaign.budget_amount,
            currency: campaign.currency,
            startTimestamp: campaign.start_timestamp,
            endTimestamp: campaign.end_timestamp,
            isContinuous: campaign.is_continuous,
            externalId: campaign.external_id
          }
        },
        message: `Retrieved campaign **"${campaign.title}"** (ID: ${campaign.id}).`
      };
    }

    if (action === 'delete') {
      if (!campaignId) throw new Error('campaignId is required for delete action');
      await client.deleteCampaign(campaignId);
      return {
        output: { deleted: true },
        message: `Deleted campaign ID **${campaignId}**.`
      };
    }

    let data: Record<string, any> = {};
    if (ctx.input.title) data.title = ctx.input.title;
    if (ctx.input.platform) data.platform = ctx.input.platform;
    if (ctx.input.status) data.status = ctx.input.status;
    if (ctx.input.targetType) data.target_type = ctx.input.targetType;
    if (ctx.input.target) data.target = ctx.input.target;
    if (ctx.input.budgetType) data.budget_type = ctx.input.budgetType;
    if (ctx.input.budgetAmount !== undefined) data.budget_amount = ctx.input.budgetAmount;
    if (ctx.input.currency) data.currency = ctx.input.currency;
    if (ctx.input.startTimestamp) data.start_timestamp = ctx.input.startTimestamp;
    if (ctx.input.endTimestamp) data.end_timestamp = ctx.input.endTimestamp;
    if (ctx.input.isContinuous !== undefined) data.is_continuous = ctx.input.isContinuous;
    if (ctx.input.audiences) data.audiences = ctx.input.audiences;
    if (ctx.input.creatives) data.creatives = ctx.input.creatives;
    if (ctx.input.targeting) data.targeting = ctx.input.targeting;
    if (ctx.input.externalAdAccountId)
      data.external_ad_account_id = ctx.input.externalAdAccountId;
    if (ctx.input.externalPosterId) data.external_poster_id = ctx.input.externalPosterId;
    if (ctx.input.instagramAccountId) data.instagram_account_id = ctx.input.instagramAccountId;
    if (ctx.input.objective) data.objective = ctx.input.objective;
    if (ctx.input.optimizationId) data.optimization_id = ctx.input.optimizationId;

    if (action === 'create') {
      let campaign = await client.createCampaign(data);
      return {
        output: {
          campaign: {
            campaignId: campaign.id,
            title: campaign.title,
            platform: campaign.platform,
            status: campaign.status,
            budgetType: campaign.budget_type,
            budgetAmount: campaign.budget_amount,
            currency: campaign.currency,
            startTimestamp: campaign.start_timestamp,
            endTimestamp: campaign.end_timestamp,
            isContinuous: campaign.is_continuous,
            externalId: campaign.external_id
          }
        },
        message: `Created campaign **"${campaign.title}"** (ID: ${campaign.id}) on ${campaign.platform}.`
      };
    }

    // update
    if (!campaignId) throw new Error('campaignId is required for update action');
    let campaign = await client.updateCampaign(campaignId, data);
    return {
      output: {
        campaign: {
          campaignId: campaign.id,
          title: campaign.title,
          platform: campaign.platform,
          status: campaign.status,
          budgetType: campaign.budget_type,
          budgetAmount: campaign.budget_amount,
          currency: campaign.currency,
          startTimestamp: campaign.start_timestamp,
          endTimestamp: campaign.end_timestamp,
          isContinuous: campaign.is_continuous,
          externalId: campaign.external_id
        }
      },
      message: `Updated campaign **"${campaign.title}"** (ID: ${campaign.id}).`
    };
  })
  .build();
