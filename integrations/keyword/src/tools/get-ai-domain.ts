import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { getResource } from '../lib/response';
import { spec } from '../spec';

export let getAiDomain = SlateTool.create(spec, {
  name: 'Get AI Visibility Domain',
  key: 'get_ai_domain',
  description:
    'Retrieve a tracked AI Visibility domain by its ID. Call list_ai_domains to discover domain IDs.',
  tags: { readOnly: true }
})
  .input(z.object({ domainId: z.string().describe('Domain ID from list_ai_domains') }))
  .output(z.object({ domain: z.record(z.string(), z.any()), rawResponse: z.any() }))
  .handleInvocation(async ctx => {
    let response = await new Client({ token: ctx.auth.token }).getAiDomain(ctx.input.domainId);
    return {
      message: 'Retrieved AI Visibility domain details.',
      output: { domain: getResource(response), rawResponse: response }
    };
  })
  .build();
