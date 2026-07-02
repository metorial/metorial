import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import { createPendoClient, firstPendoRecord } from './helpers';

export let getFeature = SlateTool.create(spec, {
  name: 'Get Feature',
  key: 'get_feature',
  description: `Retrieve a specific tagged feature from Pendo by feature ID. Returns the feature name and raw feature configuration.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      featureId: z.string().describe('The tagged feature ID to retrieve')
    })
  )
  .output(
    z.object({
      featureId: z.string().describe('Feature ID'),
      name: z.string().describe('Feature name'),
      raw: z.any().describe('Full raw feature record from Pendo')
    })
  )
  .handleInvocation(async ctx => {
    let client = createPendoClient(ctx);
    let feature = firstPendoRecord(await client.getFeature(ctx.input.featureId));

    return {
      output: {
        featureId: feature.id || feature.featureId || ctx.input.featureId,
        name: feature.name || '',
        raw: feature
      },
      message: `Retrieved feature **${feature.name || ctx.input.featureId}** from Pendo.`
    };
  })
  .build();
