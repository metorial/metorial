import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import { createPendoClient, validateMultiAppFilter } from './helpers';

export let listFeatures = SlateTool.create(spec, {
  name: 'List Features',
  key: 'list_features',
  description: `List all tagged features in Pendo. Returns feature names, IDs, and click selectors. Optionally filter by application ID for multi-app subscriptions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      appId: z
        .string()
        .optional()
        .describe('Application ID to filter features for a specific app'),
      expandAll: z
        .boolean()
        .optional()
        .describe('Set to true to return features from all apps in a multi-app subscription')
    })
  )
  .output(
    z.object({
      features: z
        .array(
          z.object({
            featureId: z.string().describe('Feature ID'),
            name: z.string().describe('Feature name'),
            raw: z.any().describe('Full raw feature record')
          })
        )
        .describe('List of features'),
      totalCount: z.number().describe('Total number of features returned')
    })
  )
  .handleInvocation(async ctx => {
    validateMultiAppFilter(ctx.input);
    let client = createPendoClient(ctx);

    let features = await client.listFeatures({
      appId: ctx.input.appId,
      expandAll: ctx.input.expandAll
    });

    let mappedFeatures = (Array.isArray(features) ? features : []).map((f: any) => ({
      featureId: f.id || f.featureId || '',
      name: f.name || '',
      raw: f
    }));

    return {
      output: {
        features: mappedFeatures,
        totalCount: mappedFeatures.length
      },
      message: `Found **${mappedFeatures.length}** feature(s) in Pendo.`
    };
  })
  .build();
