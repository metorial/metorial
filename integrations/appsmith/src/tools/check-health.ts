import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let checkHealth = SlateTool.create(spec, {
  name: 'Check Instance Health',
  key: 'check_health',
  description: `Check whether an Appsmith instance is operational. This endpoint does not require authentication and can be used to monitor self-hosted instances.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      isHealthy: z.boolean().describe('Whether the Appsmith instance is operational.'),
      status: z.string().describe('Status message or response from the health endpoint.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token ?? ''
    });

    let result = await client.checkHealth();

    return {
      output: result,
      message: result.isHealthy
        ? `Appsmith instance is **healthy**.`
        : `Appsmith instance is **unhealthy**: ${result.status}`
    };
  })
  .build();
