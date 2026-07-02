import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let checkHealth = SlateTool.create(spec, {
  name: 'Check API Health',
  key: 'check_health',
  description: `Verify that the Sendspark API is operational and that your credentials are valid.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      healthy: z.boolean(),
      message: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret,
      workspaceId: ctx.config.workspaceId
    });

    let result = await client.healthCheck();

    return {
      output: {
        healthy: true,
        message: result.message || 'API is operational'
      },
      message: `Sendspark API is **healthy**: ${result.message || 'everything is ok!'}`
    };
  })
  .build();
