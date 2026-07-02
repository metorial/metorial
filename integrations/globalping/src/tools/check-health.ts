import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let checkHealth = SlateTool.create(spec, {
  name: 'Check API Health',
  key: 'check_health',
  description: `Validate the Globalping API's health and availability. Returns whether the API is reachable and responding correctly.

Useful for verifying connectivity before running critical network tests or as part of automation health checks.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(z.object({}))
  .output(
    z.object({
      healthy: z.boolean().describe('Whether the API is healthy and responding'),
      statusCode: z.number().describe('HTTP status code returned by the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let { healthy, statusCode } = await client.checkHealth();

    return {
      output: {
        healthy,
        statusCode
      },
      message: healthy
        ? `Globalping API is **healthy** (HTTP ${statusCode}).`
        : `Globalping API is **unhealthy** (HTTP ${statusCode}).`
    };
  })
  .build();
