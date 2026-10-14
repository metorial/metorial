import { SlateTool } from 'slates';
import { z } from 'zod';
import { WhoisFreaksClient } from '../lib/client';
import { spec } from '../spec';

export let getApiUsage = SlateTool.create(spec, {
  name: 'Get API Usage',
  key: 'get_api_usage',
  description:
    'Retrieve subscription status, remaining API credits, served requests, and request limits for the connected API key.',
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(z.object({ usage: z.any().describe('API subscription and credit usage details') }))
  .handleInvocation(async ctx => {
    let client = new WhoisFreaksClient({ token: ctx.auth.token });
    let usage = await client.accountUsage();
    return { output: { usage }, message: 'Retrieved API subscription and credit usage.' };
  })
  .build();
