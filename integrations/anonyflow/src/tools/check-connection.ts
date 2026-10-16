import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let checkConnection = SlateTool.create(spec, {
  name: 'Check Connection',
  key: 'check_connection',
  description: 'Check whether the configured API key can connect to the AnonyFlow API.',
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      status: z.boolean().describe('Whether the provider accepted the connection check.'),
      response: z.record(z.string(), z.unknown()).describe('Full AnonyFlow API response.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.checkConnection();
    return {
      output: { status: result.status, response: result },
      message: 'AnonyFlow accepted the API key connection check.'
    };
  })
  .build();
