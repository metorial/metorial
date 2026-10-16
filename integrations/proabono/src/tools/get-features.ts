import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { ProAbonoClient } from '../lib/client';
import { spec } from '../spec';

export let getFeatures = SlateTool.create(spec, {
  name: 'Get Features',
  key: 'get_features',
  description:
    'Discover feature references, localized names, feature types, and visibility before checking or updating customer usage.',
  instructions: [
    'Use list to discover ReferenceFeature values for manage_usages and quote_pricing.',
    'Use get with referenceFeature to retrieve one feature.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      action: z.enum(['get', 'list']).describe('Retrieve one feature or a page of features'),
      referenceFeature: z
        .string()
        .optional()
        .describe('Required for get; discover references with list'),
      referenceSegment: z
        .string()
        .optional()
        .describe('Segment used for localized feature labels'),
      referenceCustomer: z
        .string()
        .optional()
        .describe('Customer used to select the language'),
      language: z.string().optional().describe('Language override, such as en or fr'),
      isVisible: z.boolean().optional().describe('For list: filter by feature visibility'),
      page: z.number().optional().describe('Page number'),
      sizePage: z.number().optional().describe('Maximum items per page')
    })
  )
  .output(
    z.object({
      feature: z.any().optional().describe('Unmodified feature resource for get'),
      features: z.array(z.any()).optional().describe('Unmodified feature resources for list'),
      totalItems: z.number().optional().describe('Total matching features when returned'),
      page: z.number().optional().describe('Current page when returned'),
      rawResponse: z.any().optional().describe('Complete provider response when returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ProAbonoClient({
      token: ctx.auth.token,
      apiEndpoint: ctx.config.apiEndpoint
    });
    let params = {
      ReferenceSegment: ctx.input.referenceSegment ?? ctx.config.defaultSegment,
      ReferenceCustomer: ctx.input.referenceCustomer,
      Language: ctx.input.language
    };
    if (ctx.input.action === 'get') {
      if (!ctx.input.referenceFeature)
        throw createApiServiceError('referenceFeature is required for get.');
      let result = await client.getFeature(ctx.input.referenceFeature, params);
      return {
        output: { feature: result || undefined, rawResponse: result || undefined },
        message: result
          ? `Retrieved feature **${ctx.input.referenceFeature}**`
          : 'No feature was returned.'
      };
    }
    let result = await client.listFeatures({
      ...params,
      IsVisible: ctx.input.isVisible,
      Page: ctx.input.page,
      SizePage: ctx.input.sizePage
    });
    return {
      output: {
        features: result?.Items,
        totalItems: result?.TotalItems,
        page: result?.Page,
        rawResponse: result || undefined
      },
      message: result ? 'Retrieved available features.' : 'No features are available.'
    };
  })
  .build();
