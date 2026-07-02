import { SlateTool } from 'slates';
import { z } from 'zod';
import { FlowiseClient } from '../lib/client';
import { spec } from '../spec';

export let ping = SlateTool.create(spec, {
  name: 'Health Check',
  key: 'ping',
  description: `Check if the Flowise instance is running and accessible. Returns the server's response to a ping request.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(z.object({}))
  .output(
    z.object({
      healthy: z.boolean().describe('Whether the Flowise instance is reachable'),
      response: z.string().optional().describe('Raw response from the ping endpoint')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FlowiseClient({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let result = await client.ping();

    return {
      output: {
        healthy: true,
        response: typeof result === 'string' ? result : JSON.stringify(result)
      },
      message: `Flowise instance is **healthy** and responding.`
    };
  })
  .build();
