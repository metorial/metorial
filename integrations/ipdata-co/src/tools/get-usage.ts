import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUsage = SlateTool.create(spec, {
  name: 'Get API Usage',
  key: 'get_usage',
  description:
    'Read the number of requests made by the connected API key in the last 24 hours. The provider updates this count once a minute.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      count: z.string().describe('Request count exactly as returned by the provider'),
      raw: z.record(z.string(), z.unknown()).describe('Complete original provider response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      useEuEndpoint: ctx.config.useEuEndpoint
    });
    let result = await client.getUsage();
    return {
      output: result,
      message: `This API key has made **${result.count}** requests in the last 24 hours.`
    };
  })
  .build();
