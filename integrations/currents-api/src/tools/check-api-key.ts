import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let checkApiKey = SlateTool.create(spec, {
  name: 'Check API Key',
  key: 'check_api_key',
  description:
    'Check the connected API key using Currents’ documented token-check endpoint. Returns the original provider response; this endpoint does not document an account profile.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      result: z
        .record(z.string(), z.unknown())
        .describe('Original token-check response from the provider')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.checkApiKey();
    return { output: { result }, message: 'Retrieved the API key check response.' };
  })
  .build();
