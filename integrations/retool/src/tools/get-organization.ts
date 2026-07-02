import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getOrganization = SlateTool.create(spec, {
  name: 'Get Organization',
  key: 'get_organization',
  description: `Retrieve information about the current Retool organization, including its name, plan, and configuration details.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      organization: z.record(z.string(), z.any()).describe('Organization information')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    let result = await client.getOrganization();

    return {
      output: {
        organization: result.data ?? result
      },
      message: `Retrieved organization information.`
    };
  })
  .build();
