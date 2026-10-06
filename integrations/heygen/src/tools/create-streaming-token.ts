import { SlateTool } from 'slates';
import { z } from 'zod';
import { HeyGenClient } from '../lib/client';
import { spec } from '../spec';

export let createStreamingToken = SlateTool.create(spec, {
  name: 'Create Streaming Token',
  key: 'create_streaming_token',
  description: `Create a legacy Interactive Avatar streaming token for an account that still has streaming access. New streaming applications use the separate LiveAvatar API. The token is used to establish a real-time streaming session where an avatar can respond to user input. Required before starting a streaming session in your application.`,
  constraints: [
    'This legacy endpoint has no drop-in HeyGen v3 replacement. See developers.heygen.com/live-avatar for the current streaming product.'
  ],
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
    let client = new HeyGenClient(ctx.auth);

    let result = await client.createStreamingToken();

    return {
      output: result,
      message: `Streaming session token created successfully. Use this token to establish a streaming session.`
    };
  })
  .build();
