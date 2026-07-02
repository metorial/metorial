import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { googleAdsActionScopes } from '../scopes';
import { spec } from '../spec';

export let manageAdGroups = SlateTool.create(spec, {
  name: 'Manage Ad Groups',
  key: 'manage_ad_groups',
  description: `Create, update, or remove ad groups within a Google Ads campaign. Ad groups organize ads and keywords within a campaign.

Supports setting the ad group name, status, type, CPC bid, and targeting URL.`,
  instructions: [
    'CPC bid values use micros (1 currency unit = 1,000,000 micros).',
    'Ad group resource names follow: customers/{customerId}/adGroups/{adGroupId}'
  ]
})
  .scopes(googleAdsActionScopes.manageAdGroups)
  .input(
    z.object({
      customerId: z.string().describe('The Google Ads customer account ID'),
      operation: z.enum(['create', 'update', 'remove']).describe('The operation to perform'),
      adGroupId: z.string().optional().describe('Ad group ID (required for update/remove)'),
      campaignId: z.string().optional().describe('Campaign ID (required for create)'),
      name: z.string().optional().describe('Ad group name'),
      status: z.enum(['ENABLED', 'PAUSED', 'REMOVED']).optional().describe('Ad group status'),
      type: z
        .enum([
          'SEARCH_STANDARD',
          'DISPLAY_STANDARD',
          'SHOPPING_PRODUCT_ADS',
          'VIDEO_BUMPER',
          'VIDEO_TRUE_VIEW_IN_STREAM',
          'VIDEO_NON_SKIPPABLE_IN_STREAM'
        ])
        .optional()
        .describe('Ad group type (required for create)'),
      cpcBidMicros: z.string().optional().describe('CPC bid in micros'),
      finalUrls: z.array(z.string()).optional().describe('Final URLs for the ad group')
    })
  )
  .output(
    z.object({
      adGroupResourceName: z
        .string()
        .optional()
        .describe('Resource name of the created/updated ad group'),
      mutateResults: z.any().optional().describe('Raw API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let { customerId, operation } = ctx.input;
    let cid = customerId.replace(/-/g, '');

    if (operation === 'remove') {
      if (!ctx.input.adGroupId) throw new Error('adGroupId is required for remove operation');
      let result = await client.mutateAdGroups(cid, [
        {
          remove: `customers/${cid}/adGroups/${ctx.input.adGroupId}`
        }
      ]);
      return {
        output: {
          adGroupResourceName: `customers/${cid}/adGroups/${ctx.input.adGroupId}`,
          mutateResults: result
        },
        message: `Ad group **${ctx.input.adGroupId}** removed.`
      };
    }

    if (operation === 'create') {
      if (!ctx.input.campaignId)
        throw new Error('campaignId is required for create operation');
      let adGroupData: Record<string, any> = {
        name: ctx.input.name,
        campaign: `customers/${cid}/campaigns/${ctx.input.campaignId}`,
        status: ctx.input.status || 'ENABLED'
      };
      if (ctx.input.type) adGroupData.type = ctx.input.type;
      if (ctx.input.cpcBidMicros) adGroupData.cpcBidMicros = ctx.input.cpcBidMicros;
      if (ctx.input.finalUrls) adGroupData.finalUrls = ctx.input.finalUrls;

      let result = await client.mutateAdGroups(cid, [{ create: adGroupData }]);
      return {
        output: {
          adGroupResourceName: result.results?.[0]?.resourceName,
          mutateResults: result
        },
        message: `Ad group **${ctx.input.name}** created.`
      };
    }

    // Update
    if (!ctx.input.adGroupId) throw new Error('adGroupId is required for update operation');
    let resourceName = `customers/${cid}/adGroups/${ctx.input.adGroupId}`;
    let updateData: Record<string, any> = { resourceName };
    let maskFields: string[] = [];

    if (ctx.input.name !== undefined) {
      updateData.name = ctx.input.name;
      maskFields.push('name');
    }
    if (ctx.input.status !== undefined) {
      updateData.status = ctx.input.status;
      maskFields.push('status');
    }
    if (ctx.input.cpcBidMicros !== undefined) {
      updateData.cpcBidMicros = ctx.input.cpcBidMicros;
      maskFields.push('cpcBidMicros');
    }

    let result = await client.mutateAdGroups(cid, [
      {
        update: updateData,
        updateMask: maskFields.join(',')
      }
    ]);

    return {
      output: { adGroupResourceName: resourceName, mutateResults: result },
      message: `Ad group **${ctx.input.adGroupId}** updated (fields: ${maskFields.join(', ')}).`
    };
  })
  .build();
