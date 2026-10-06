import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { spec } from '../spec';

export let getSourceControlConfig = SlateTool.create(spec, {
  name: 'Get Source Control Config',
  key: 'get_source_control_config',
  description: `Retrieve the current source control configuration for the Retool organization. Returns repository, provider, branch, and selected non-secret connection metadata. Provider credentials and unsafe URLs are omitted.`,
  constraints: ['Requires the relevant API token scope and support in this deployment.'],
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      sourceControlConfig: z
        .record(z.string(), z.any())
        .describe('Source control configuration details')
    })
  )
  .handleInvocation(async ctx => {
    let client = clientFor(ctx);

    let result = await client.getSourceControlConfig();

    return {
      output: {
        sourceControlConfig: result.data ?? result
      },
      message: `Retrieved source control configuration.`
    };
  })
  .build();
