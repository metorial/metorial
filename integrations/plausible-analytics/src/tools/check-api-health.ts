import { SlateTool } from 'slates';
import { z } from 'zod';
import { EventsClient } from '../lib/client';
import { spec } from '../spec';

export let checkApiHealth = SlateTool.create(spec, {
  name: 'Check API Health',
  key: 'check_api_health',
  description:
    'Check the Plausible instance readiness endpoint to diagnose service availability when tracking or analytics requests fail. Returns the HTTP status and provider health details. This check does not validate API key permissions.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      healthy: z.boolean().describe('Whether the instance returned HTTP 200'),
      status: z.number().describe('HTTP status from the readiness endpoint'),
      details: z.any().describe('Health details returned by the instance')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EventsClient({ baseUrl: ctx.config.baseUrl });
    let result = await client.getHealth();
    let healthy = result.status === 200;
    return {
      output: { healthy, status: result.status, details: result.details },
      message: healthy
        ? 'The Plausible instance is ready to serve requests.'
        : `The Plausible instance reported an unhealthy readiness status (HTTP ${result.status}).`
    };
  })
  .build();
