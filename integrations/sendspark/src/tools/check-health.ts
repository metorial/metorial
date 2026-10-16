import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
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
      message: z.string(),
      raw: z.unknown().optional().describe('Complete provider response')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.healthCheck();
    if (typeof result?.message !== 'string') {
      throw createApiServiceError('Sendspark did not return an API health message.');
    }

    return {
      output: {
        healthy: true,
        message: result.message,
        raw: result
      },
      message: `Sendspark API health response: ${result.message}`
    };
  })
  .build();
