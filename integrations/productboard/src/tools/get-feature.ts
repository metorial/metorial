import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getFeatureTool = SlateTool.create(spec, {
  name: 'Get Feature',
  key: 'get_feature',
  description: `Retrieve a single feature by its ID. Returns the full feature details including name, description, status, parent hierarchy, timeframe, and assignee.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      featureId: z.string().describe('The ID of the feature to retrieve')
    })
  )
  .output(
    z.object({
      feature: z.record(z.string(), z.any()).describe('The feature object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let feature = await client.getFeature(ctx.input.featureId);

    return {
      output: { feature },
      message: `Retrieved feature **${feature.name || ctx.input.featureId}**.`
    };
  })
  .build();
