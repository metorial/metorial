import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCurrentApiKey = SlateTool.create(spec, {
  name: 'Get Current API Key',
  key: 'get_current_api_key',
  description:
    'Check the current connection and return its API key label. This identifies the authorized key without exposing the secret.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(z.object({ apiKeyLabel: z.string().describe('Label of the authorized API key') }))
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).testAuth();
    return { output: result, message: `Connected with API key **${result.apiKeyLabel}**.` };
  })
  .build();
