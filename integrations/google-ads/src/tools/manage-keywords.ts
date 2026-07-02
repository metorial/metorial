import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { googleAdsActionScopes } from '../scopes';
import { spec } from '../spec';

export let manageKeywords = SlateTool.create(spec, {
  name: 'Manage Keywords',
  key: 'manage_keywords',
  description: `Add, update, or remove keywords in an ad group. Also supports managing negative keywords at both the ad group and campaign levels.

Keywords determine when ads are shown based on user search queries. Each keyword has a match type controlling how broadly it matches search terms.`,
  instructions: [
    'Match types: EXACT (most restrictive), PHRASE (moderate), BROAD (widest reach).',
    'Use negative keywords to prevent ads from showing for irrelevant searches.',
    'Set isNegative to true and provide campaignId (for campaign-level) or adGroupId (for ad group-level) negative keywords.'
  ]
})
  .scopes(googleAdsActionScopes.manageKeywords)
  .input(
    z.object({
      customerId: z.string().describe('The Google Ads customer account ID'),
      operation: z.enum(['create', 'update', 'remove']).describe('The operation to perform'),
      adGroupId: z
        .string()
        .optional()
        .describe('Ad group ID (required for ad group keywords)'),
      campaignId: z
        .string()
        .optional()
        .describe('Campaign ID (required for campaign-level negative keywords)'),
      criterionId: z.string().optional().describe('Criterion ID (required for update/remove)'),
      keyword: z.string().optional().describe('The keyword text'),
      matchType: z
        .enum(['EXACT', 'PHRASE', 'BROAD'])
        .optional()
        .describe('Keyword match type'),
      isNegative: z.boolean().optional().describe('If true, creates a negative keyword'),
      cpcBidMicros: z.string().optional().describe('Keyword-level CPC bid in micros'),
      status: z.enum(['ENABLED', 'PAUSED', 'REMOVED']).optional().describe('Keyword status'),
      finalUrls: z.array(z.string()).optional().describe('Final URLs for the keyword')
    })
  )
  .output(
    z.object({
      criterionResourceName: z
        .string()
        .optional()
        .describe('Resource name of the keyword criterion'),
      mutateResults: z.any().optional().describe('Raw API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let { customerId, operation } = ctx.input;
    let cid = customerId.replace(/-/g, '');

    // Campaign-level negative keywords
    if (ctx.input.isNegative && ctx.input.campaignId) {
      if (operation === 'remove') {
        if (!ctx.input.criterionId) throw new Error('criterionId required for remove');
        let result = await client.mutateCampaignCriteria(cid, [
          {
            remove: `customers/${cid}/campaignCriteria/${ctx.input.campaignId}~${ctx.input.criterionId}`
          }
        ]);
        return {
          output: { mutateResults: result },
          message: `Campaign negative keyword removed.`
        };
      }

      if (operation === 'create') {
        let criterionData: Record<string, any> = {
          campaign: `customers/${cid}/campaigns/${ctx.input.campaignId}`,
          negative: true,
          keyword: {
            text: ctx.input.keyword,
            matchType: ctx.input.matchType || 'BROAD'
          }
        };
        let result = await client.mutateCampaignCriteria(cid, [{ create: criterionData }]);
        return {
          output: {
            criterionResourceName: result.results?.[0]?.resourceName,
            mutateResults: result
          },
          message: `Campaign-level negative keyword **"${ctx.input.keyword}"** added.`
        };
      }
    }

    // Ad group keywords
    if (operation === 'remove') {
      if (!ctx.input.adGroupId || !ctx.input.criterionId)
        throw new Error('adGroupId and criterionId required for remove');
      let result = await client.mutateAdGroupCriteria(cid, [
        {
          remove: `customers/${cid}/adGroupCriteria/${ctx.input.adGroupId}~${ctx.input.criterionId}`
        }
      ]);
      return {
        output: {
          criterionResourceName: `customers/${cid}/adGroupCriteria/${ctx.input.adGroupId}~${ctx.input.criterionId}`,
          mutateResults: result
        },
        message: `Keyword criterion removed.`
      };
    }

    if (operation === 'create') {
      if (!ctx.input.adGroupId) throw new Error('adGroupId is required for create');
      let criterionData: Record<string, any> = {
        adGroup: `customers/${cid}/adGroups/${ctx.input.adGroupId}`,
        status: ctx.input.status || 'ENABLED',
        keyword: {
          text: ctx.input.keyword,
          matchType: ctx.input.matchType || 'BROAD'
        }
      };
      if (ctx.input.isNegative) criterionData.negative = true;
      if (ctx.input.cpcBidMicros) criterionData.cpcBidMicros = ctx.input.cpcBidMicros;
      if (ctx.input.finalUrls) criterionData.finalUrls = ctx.input.finalUrls;

      let result = await client.mutateAdGroupCriteria(cid, [{ create: criterionData }]);
      return {
        output: {
          criterionResourceName: result.results?.[0]?.resourceName,
          mutateResults: result
        },
        message: `Keyword **"${ctx.input.keyword}"** (${ctx.input.matchType || 'BROAD'}) added to ad group.`
      };
    }

    // Update
    if (!ctx.input.adGroupId || !ctx.input.criterionId)
      throw new Error('adGroupId and criterionId required for update');
    let resourceName = `customers/${cid}/adGroupCriteria/${ctx.input.adGroupId}~${ctx.input.criterionId}`;
    let updateData: Record<string, any> = { resourceName };
    let maskFields: string[] = [];

    if (ctx.input.status !== undefined) {
      updateData.status = ctx.input.status;
      maskFields.push('status');
    }
    if (ctx.input.cpcBidMicros !== undefined) {
      updateData.cpcBidMicros = ctx.input.cpcBidMicros;
      maskFields.push('cpcBidMicros');
    }
    if (ctx.input.finalUrls !== undefined) {
      updateData.finalUrls = ctx.input.finalUrls;
      maskFields.push('finalUrls');
    }

    let result = await client.mutateAdGroupCriteria(cid, [
      {
        update: updateData,
        updateMask: maskFields.join(',')
      }
    ]);

    return {
      output: { criterionResourceName: resourceName, mutateResults: result },
      message: `Keyword criterion updated (fields: ${maskFields.join(', ')}).`
    };
  })
  .build();
