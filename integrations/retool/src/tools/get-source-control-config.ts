import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSourceControlConfig = SlateTool.create(spec, {
  name: 'Get Source Control Config',
  key: 'get_source_control_config',
  description: `Retrieve the current source control configuration for the Retool organization. Shows the Git integration settings including repository URL and branch configuration.`,
  constraints: ['Available on Enterprise Base plan and above.'],
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
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    let result = await client.getSourceControlConfig();

    return {
      output: {
        sourceControlConfig: result.data ?? result
      },
      message: `Retrieved source control configuration.`
    };
  })
  .build();
