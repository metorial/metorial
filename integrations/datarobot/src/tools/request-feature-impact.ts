import { SlateTool } from 'slates';
import { z } from 'zod';
import { DataRobotClient } from '../lib/client';
import { spec } from '../spec';

export let requestFeatureImpact = SlateTool.create(spec, {
  key: 'request_feature_impact',
  name: 'Request Feature Impact',
  description:
    'Request feature impact computation for a trained model. Once computation finishes, use Get Model Details with includeFeatureImpact=true to retrieve scores.'
})
  .input(z.object({ projectId: z.string(), modelId: z.string() }))
  .output(z.object({ projectId: z.string(), modelId: z.string(), requested: z.boolean() }))
  .handleInvocation(async ctx => {
    let client = new DataRobotClient({
      token: ctx.auth.token,
      endpointUrl: ctx.auth.endpointUrl ?? ctx.config.endpointUrl
    });
    await client.requestFeatureImpact(ctx.input.projectId, ctx.input.modelId);
    return {
      output: { ...ctx.input, requested: true },
      message: 'Requested feature impact computation.'
    };
  })
  .build();
