import { SlateTool } from 'slates';
import { z } from 'zod';
import { AblyRestClient } from '../lib/client';
import { spec } from '../spec';

export let getServiceTime = SlateTool.create(spec, {
  name: 'Get Service Time',
  key: 'get_service_time',
  description:
    'Retrieve Ably service time in milliseconds since the Unix epoch for clock synchronization and token request diagnostics.',
  instructions: [
    'Use an API Key connection. The service time endpoint itself does not require authentication.'
  ],
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      time: z
        .number()
        .describe('Actual Ably service time in milliseconds since the Unix epoch')
    })
  )
  .handleInvocation(async ctx => {
    let time = await new AblyRestClient(ctx.auth.token, ctx.auth.authType).getTime();
    return { output: { time }, message: `Ably service time: ${time}.` };
  })
  .build();
