import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let healthCheck = SlateTool.create(spec, {
  name: 'Health Check',
  key: 'health_check',
  description: `Verifies that the StoreRocket API is accessible and responding. Use this to confirm API connectivity and that your authentication credentials are valid before performing other operations.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      healthy: z.boolean().describe('Whether the API is accessible and responding'),
      response: z.any().optional().describe('Raw response from the health check endpoint')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    try {
      let result = await client.ping();
      return {
        output: {
          healthy: true,
          response: result
        },
        message: `StoreRocket API is healthy and responding.`
      };
    } catch (error) {
      ctx.warn(
        `Health check failed: ${error instanceof Error ? error.message : String(error)}`
      );
      return {
        output: {
          healthy: false,
          response: undefined
        },
        message: `StoreRocket API health check failed. The API may be unavailable or credentials may be invalid.`
      };
    }
  })
  .build();
