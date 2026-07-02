import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { googleAdsActionScopes } from '../scopes';
import { spec } from '../spec';

export let manageAds = SlateTool.create(spec, {
  name: 'Manage Ads',
  key: 'manage_ads',
  description: `Create, update, or remove ads within an ad group. Supports responsive search ads, expanded text ads, responsive display ads, and other ad formats.

For responsive search ads, provide headlines and descriptions. Google will automatically test combinations. Pin headlines/descriptions to specific positions if needed.`,
  instructions: [
    'Responsive search ads require at least 3 headlines and 2 descriptions.',
    'You can provide up to 15 headlines and 4 descriptions for responsive search ads.',
    'Use pinnedField to pin a headline/description to a specific position (HEADLINE_1, HEADLINE_2, HEADLINE_3, DESCRIPTION_1, DESCRIPTION_2).'
  ]
})
  .scopes(googleAdsActionScopes.manageAds)
  .input(
    z.object({
      customerId: z.string().describe('The Google Ads customer account ID'),
      operation: z.enum(['create', 'update', 'remove']).describe('The operation to perform'),
      adGroupId: z.string().optional().describe('Ad group ID (required for create)'),
      adGroupAdResourceName: z
        .string()
        .optional()
        .describe(
          'Full resource name of the ad group ad (required for update/remove, e.g., customers/{id}/adGroupAds/{adGroupId}~{adId})'
        ),
      status: z.enum(['ENABLED', 'PAUSED', 'REMOVED']).optional().describe('Ad status'),
      adType: z
        .enum(['RESPONSIVE_SEARCH_AD', 'RESPONSIVE_DISPLAY_AD', 'EXPANDED_TEXT_AD'])
        .optional()
        .describe('Type of ad to create'),
      responsiveSearchAd: z
        .object({
          headlines: z
            .array(
              z.object({
                text: z.string().describe('Headline text (max 30 chars)'),
                pinnedField: z.string().optional().describe('Pin position, e.g., HEADLINE_1')
              })
            )
            .describe('List of headlines'),
          descriptions: z
            .array(
              z.object({
                text: z.string().describe('Description text (max 90 chars)'),
                pinnedField: z
                  .string()
                  .optional()
                  .describe('Pin position, e.g., DESCRIPTION_1')
              })
            )
            .describe('List of descriptions'),
          path1: z.string().optional().describe('First part of display URL path'),
          path2: z.string().optional().describe('Second part of display URL path')
        })
        .optional()
        .describe('Responsive search ad content'),
      finalUrls: z.array(z.string()).optional().describe('Landing page URLs'),
      finalMobileUrls: z.array(z.string()).optional().describe('Mobile landing page URLs'),
      trackingUrlTemplate: z.string().optional().describe('Tracking URL template')
    })
  )
  .output(
    z.object({
      adGroupAdResourceName: z
        .string()
        .optional()
        .describe('Resource name of the ad group ad'),
      mutateResults: z.any().optional().describe('Raw API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let { customerId, operation } = ctx.input;
    let cid = customerId.replace(/-/g, '');

    if (operation === 'remove') {
      if (!ctx.input.adGroupAdResourceName)
        throw new Error('adGroupAdResourceName is required for remove');
      let result = await client.mutateAdGroupAds(cid, [
        { remove: ctx.input.adGroupAdResourceName }
      ]);
      return {
        output: {
          adGroupAdResourceName: ctx.input.adGroupAdResourceName,
          mutateResults: result
        },
        message: `Ad removed successfully.`
      };
    }

    if (operation === 'create') {
      if (!ctx.input.adGroupId) throw new Error('adGroupId is required for create');

      let adData: Record<string, any> = {
        adGroup: `customers/${cid}/adGroups/${ctx.input.adGroupId}`,
        status: ctx.input.status || 'ENABLED',
        ad: {} as Record<string, any>
      };

      if (ctx.input.finalUrls) adData.ad.finalUrls = ctx.input.finalUrls;
      if (ctx.input.finalMobileUrls) adData.ad.finalMobileUrls = ctx.input.finalMobileUrls;
      if (ctx.input.trackingUrlTemplate)
        adData.ad.trackingUrlTemplate = ctx.input.trackingUrlTemplate;

      if (ctx.input.adType === 'RESPONSIVE_SEARCH_AD' && ctx.input.responsiveSearchAd) {
        let rsa = ctx.input.responsiveSearchAd;
        adData.ad.responsiveSearchAd = {
          headlines: rsa.headlines.map(h => ({
            text: h.text,
            ...(h.pinnedField ? { pinnedField: h.pinnedField } : {})
          })),
          descriptions: rsa.descriptions.map(d => ({
            text: d.text,
            ...(d.pinnedField ? { pinnedField: d.pinnedField } : {})
          }))
        };
        if (rsa.path1) adData.ad.responsiveSearchAd.path1 = rsa.path1;
        if (rsa.path2) adData.ad.responsiveSearchAd.path2 = rsa.path2;
      }

      let result = await client.mutateAdGroupAds(cid, [{ create: adData }]);
      return {
        output: {
          adGroupAdResourceName: result.results?.[0]?.resourceName,
          mutateResults: result
        },
        message: `Ad created in ad group **${ctx.input.adGroupId}**.`
      };
    }

    // Update
    if (!ctx.input.adGroupAdResourceName)
      throw new Error('adGroupAdResourceName is required for update');
    let updateData: Record<string, any> = { resourceName: ctx.input.adGroupAdResourceName };
    let maskFields: string[] = [];

    if (ctx.input.status !== undefined) {
      updateData.status = ctx.input.status;
      maskFields.push('status');
    }

    let result = await client.mutateAdGroupAds(cid, [
      {
        update: updateData,
        updateMask: maskFields.join(',')
      }
    ]);

    return {
      output: {
        adGroupAdResourceName: ctx.input.adGroupAdResourceName,
        mutateResults: result
      },
      message: `Ad updated (fields: ${maskFields.join(', ')}).`
    };
  })
  .build();
