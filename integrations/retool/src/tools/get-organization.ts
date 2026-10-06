import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { spec } from '../spec';

export let getOrganization = SlateTool.create(spec, {
  name: 'Get Organization',
  key: 'get_organization',
  description: `Retrieve information about the current Retool organization, including its native organization ID and selected advanced settings. This is organization context, not current-user identity.`,
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
    let client = clientFor(ctx);

    let result = await client.getOrganization();

    return {
      output: {
        organization: result.data ?? result
      },
      message: `Retrieved organization information.`
    };
  })
  .build();
