import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getConfiguration = SlateTool.create(spec, {
  name: 'Get Build Configuration',
  key: 'get_configuration',
  description: 'Retrieves the settings and signing configuration of one build configuration.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      profileId: z
        .string()
        .describe('Build profile ID. Use list_build_profiles to discover it.'),
      configurationId: z.string().describe('Configuration ID from list_configurations.')
    })
  )
  .output(z.object({}).passthrough())
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.getConfiguration(ctx.input.profileId, ctx.input.configurationId);
    return { output: result, message: 'Retrieved get build configuration information.' };
  })
  .build();
