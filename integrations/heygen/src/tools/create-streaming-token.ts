import { SlateTool } from 'slates';
import { z } from 'zod';
import { HeyGenClient } from '../lib/client';
import { spec } from '../spec';

export let createStreamingToken = SlateTool.create(spec, {
  name: 'Create Streaming Token',
  key: 'create_streaming_token',
  description: `Create a session token for Interactive Avatar streaming. The token is used to establish a real-time streaming session where an avatar can respond to user input. Required before starting a streaming session in your application.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(z.object({}))
  .output(
    z.object({
      sessionToken: z.string().describe('Session token for establishing a streaming session')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HeyGenClient({ token: ctx.auth.token });

    let result = await client.createStreamingToken();

    return {
      output: result,
      message: `Streaming session token created successfully. Use this token to establish a streaming session.`
    };
  })
  .build();
