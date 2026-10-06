import { SlateTool } from 'slates';
import { z } from 'zod';
import { ImgixClient } from '../lib/client';
import { mapSource, publicDeployment, sourceId, sourceOutput } from '../lib/schemas';
import { spec } from '../spec';
export const getSource = SlateTool.create(spec, {
  name: 'Get Source',
  key: 'get_source',
  description:
    'Read a source discovered by list_sources, including deployment status and safe configuration. Storage credentials and signing tokens are not returned.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({ sourceId }))
  .output(
    sourceOutput.extend({
      deployment: publicDeployment.optional(),
      secureUrlToken: z
        .string()
        .optional()
        .describe(
          'Deprecated: signing tokens are never returned. Pass sourceId to generate_signed_url or download_asset instead.'
        )
    })
  )
  .handleInvocation(async ctx => {
    const source = (await new ImgixClient(ctx.auth.token).getSource(ctx.input.sourceId)).data;
    return {
      output: { ...mapSource(source), deployment: source.attributes.deployment },
      message: `Source ${source.id} is ${source.attributes.deployment_status}; enabled is ${source.attributes.enabled}.`
    };
  })
  .build();
