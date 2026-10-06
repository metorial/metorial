import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
export let getApiStatus = SlateTool.create(spec, {
  key: 'get_api_status',
  name: 'Get API Status',
  description:
    'Check the connected Digital Product Delivery API credentials with its authenticated ping endpoint. Reports the configured username separately; DPD does not return a verified person or account identity.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      status: z.literal('SUCCESS'),
      configuredUsername: z
        .string()
        .describe(
          'Configured Basic Auth username, not a profile claim returned by the provider.'
        )
    })
  )
  .handleInvocation(async ctx => ({
    output: { ...(await new Client(ctx.auth).ping()), configuredUsername: ctx.auth.username },
    message: 'DPD confirmed an authenticated API response.'
  }))
  .build();
