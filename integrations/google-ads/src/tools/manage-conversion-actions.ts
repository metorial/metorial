import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { googleAdsActionScopes } from '../scopes';
import { spec } from '../spec';

export let manageConversionActions = SlateTool.create(spec, {
  name: 'Manage Conversion Actions',
  key: 'manage_conversion_actions',
  description: `Create, update, or remove conversion actions for tracking valuable customer actions. Conversion actions track events like purchases, sign-ups, phone calls, or app installs.

Supports configuring conversion counting, attribution models, value settings, and conversion windows.`,
  instructions: [
    'Common conversion types: PURCHASE, SIGNUP, LEAD, PAGE_VIEW, DOWNLOAD, OTHER',
    'Categories: DEFAULT, PAGE_VIEW, PURCHASE, SIGNUP, LEAD, DOWNLOAD, ADD_TO_CART, BEGIN_CHECKOUT, SUBSCRIBE_PAID, PHONE_CALL_LEAD, IMPORTED_LEAD, SUBMIT_LEAD_FORM, BOOK_APPOINTMENT, REQUEST_QUOTE, GET_DIRECTIONS, OUTBOUND_CLICK, CONTACT, ENGAGEMENT, STORE_VISIT, STORE_SALE'
  ]
})
  .scopes(googleAdsActionScopes.manageConversionActions)
  .input(
    z.object({
      customerId: z.string().describe('The Google Ads customer account ID'),
      operation: z.enum(['create', 'update', 'remove']).describe('The operation to perform'),
      conversionActionId: z
        .string()
        .optional()
        .describe('Conversion action ID (required for update/remove)'),
      name: z.string().optional().describe('Name of the conversion action'),
      type: z
        .enum([
          'AD_CALL',
          'CLICK_TO_CALL',
          'GOOGLE_PLAY_DOWNLOAD',
          'GOOGLE_PLAY_IN_APP_PURCHASE',
          'UPLOAD',
          'UPLOAD_CALLS',
          'WEBPAGE',
          'WEBSITE_CALL',
          'STORE_SALES_DIRECT_UPLOAD',
          'STORE_SALES',
          'FIREBASE_ANDROID_FIRST_OPEN',
          'FIREBASE_ANDROID_IN_APP_PURCHASE',
          'FIREBASE_IOS_FIRST_OPEN',
          'FIREBASE_IOS_IN_APP_PURCHASE',
          'GOOGLE_HOSTED',
          'LEAD_FORM_SUBMIT',
          'SALESFORCE',
          'SEARCH_ADS_360',
          'SMART_CAMPAIGN_AD_CLICKS_TO_CALL',
          'SMART_CAMPAIGN_MAP_CLICKS_TO_CALL',
          'SMART_CAMPAIGN_MAP_DIRECTIONS',
          'SMART_CAMPAIGN_TRACKED_CALLS',
          'STORE_VISITS',
          'WEBPAGE_CODELESS'
        ])
        .optional()
        .describe('Conversion action type (required for create)'),
      category: z.string().optional().describe('Conversion category'),
      status: z
        .enum(['ENABLED', 'REMOVED', 'HIDDEN'])
        .optional()
        .describe('Conversion action status'),
      countingType: z
        .enum(['ONE_PER_CLICK', 'MANY_PER_CLICK'])
        .optional()
        .describe('How conversions are counted'),
      defaultValue: z.number().optional().describe('Default conversion value'),
      alwaysUseDefaultValue: z
        .boolean()
        .optional()
        .describe('Whether to always use the default value'),
      clickThroughLookbackWindowDays: z
        .number()
        .optional()
        .describe('Click-through conversion window in days (1-90)'),
      viewThroughLookbackWindowDays: z
        .number()
        .optional()
        .describe('View-through conversion window in days (1-90)'),
      attributionModel: z
        .enum([
          'EXTERNAL',
          'GOOGLE_ADS_LAST_CLICK',
          'GOOGLE_SEARCH_ATTRIBUTION_FIRST_CLICK',
          'GOOGLE_SEARCH_ATTRIBUTION_LINEAR',
          'GOOGLE_SEARCH_ATTRIBUTION_TIME_DECAY',
          'GOOGLE_SEARCH_ATTRIBUTION_POSITION_BASED',
          'GOOGLE_SEARCH_ATTRIBUTION_DATA_DRIVEN'
        ])
        .optional()
        .describe('Attribution model'),
      includeInConversionsMetric: z
        .boolean()
        .optional()
        .describe('Whether to include in the "Conversions" column')
    })
  )
  .output(
    z.object({
      conversionActionResourceName: z
        .string()
        .optional()
        .describe('Resource name of the conversion action'),
      mutateResults: z.any().optional().describe('Raw API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let { customerId, operation } = ctx.input;
    let cid = customerId.replace(/-/g, '');

    if (operation === 'remove') {
      if (!ctx.input.conversionActionId) throw new Error('conversionActionId required');
      let result = await client.mutateConversionActions(cid, [
        {
          remove: `customers/${cid}/conversionActions/${ctx.input.conversionActionId}`
        }
      ]);
      return {
        output: { mutateResults: result },
        message: `Conversion action **${ctx.input.conversionActionId}** removed.`
      };
    }

    if (operation === 'create') {
      let actionData: Record<string, any> = {
        name: ctx.input.name,
        type: ctx.input.type,
        status: ctx.input.status || 'ENABLED'
      };
      if (ctx.input.category) actionData.category = ctx.input.category;
      if (ctx.input.countingType) actionData.countingType = ctx.input.countingType;
      if (
        ctx.input.defaultValue !== undefined ||
        ctx.input.alwaysUseDefaultValue !== undefined
      ) {
        actionData.valueSettings = {};
        if (ctx.input.defaultValue !== undefined)
          actionData.valueSettings.defaultValue = ctx.input.defaultValue;
        if (ctx.input.alwaysUseDefaultValue !== undefined)
          actionData.valueSettings.alwaysUseDefaultValue = ctx.input.alwaysUseDefaultValue;
      }
      if (ctx.input.clickThroughLookbackWindowDays)
        actionData.clickThroughLookbackWindowDays = ctx.input.clickThroughLookbackWindowDays;
      if (ctx.input.viewThroughLookbackWindowDays)
        actionData.viewThroughLookbackWindowDays = ctx.input.viewThroughLookbackWindowDays;
      if (ctx.input.attributionModel) {
        actionData.attributionModelSettings = { attributionModel: ctx.input.attributionModel };
      }
      if (ctx.input.includeInConversionsMetric !== undefined)
        actionData.includeInConversionsMetric = ctx.input.includeInConversionsMetric;

      let result = await client.mutateConversionActions(cid, [{ create: actionData }]);
      return {
        output: {
          conversionActionResourceName: result.results?.[0]?.resourceName,
          mutateResults: result
        },
        message: `Conversion action **${ctx.input.name}** created.`
      };
    }

    // Update
    if (!ctx.input.conversionActionId) throw new Error('conversionActionId required');
    let resourceName = `customers/${cid}/conversionActions/${ctx.input.conversionActionId}`;
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
    if (ctx.input.category !== undefined) {
      updateData.category = ctx.input.category;
      maskFields.push('category');
    }
    if (ctx.input.countingType !== undefined) {
      updateData.countingType = ctx.input.countingType;
      maskFields.push('countingType');
    }
    if (
      ctx.input.defaultValue !== undefined ||
      ctx.input.alwaysUseDefaultValue !== undefined
    ) {
      updateData.valueSettings = {};
      if (ctx.input.defaultValue !== undefined)
        updateData.valueSettings.defaultValue = ctx.input.defaultValue;
      if (ctx.input.alwaysUseDefaultValue !== undefined)
        updateData.valueSettings.alwaysUseDefaultValue = ctx.input.alwaysUseDefaultValue;
      maskFields.push('valueSettings');
    }
    if (ctx.input.clickThroughLookbackWindowDays !== undefined) {
      updateData.clickThroughLookbackWindowDays = ctx.input.clickThroughLookbackWindowDays;
      maskFields.push('clickThroughLookbackWindowDays');
    }
    if (ctx.input.viewThroughLookbackWindowDays !== undefined) {
      updateData.viewThroughLookbackWindowDays = ctx.input.viewThroughLookbackWindowDays;
      maskFields.push('viewThroughLookbackWindowDays');
    }
    if (ctx.input.attributionModel !== undefined) {
      updateData.attributionModelSettings = { attributionModel: ctx.input.attributionModel };
      maskFields.push('attributionModelSettings');
    }
    if (ctx.input.includeInConversionsMetric !== undefined) {
      updateData.includeInConversionsMetric = ctx.input.includeInConversionsMetric;
      maskFields.push('includeInConversionsMetric');
    }

    let result = await client.mutateConversionActions(cid, [
      {
        update: updateData,
        updateMask: maskFields.join(',')
      }
    ]);

    return {
      output: { conversionActionResourceName: resourceName, mutateResults: result },
      message: `Conversion action **${ctx.input.conversionActionId}** updated (fields: ${maskFields.join(', ')}).`
    };
  })
  .build();
