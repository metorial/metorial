import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createStreamingToken = SlateTool.create(spec, {
  name: 'Create Streaming Token',
  key: 'create_streaming_token',
  description: `Generate a temporary authentication token for use with AssemblyAI's real-time streaming speech-to-text WebSocket API.
Use this to securely authenticate client-side streaming without exposing your main API key. Each token is single-use and valid for one streaming session.`,
  constraints: [
    'Token expiration must be between 1 and 600 seconds.',
    'Each token can only be used for a single streaming session.',
    'Session duration defaults to 3 hours (10800 seconds) if not specified.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      expiresInSeconds: z
        .number()
        .min(1)
        .max(600)
        .describe('Token validity duration in seconds (1-600).'),
      maxSessionDurationSeconds: z
        .number()
        .min(60)
        .max(10800)
        .optional()
        .describe(
          'Maximum streaming session duration in seconds (60-10800). Defaults to 10800.'
        )
    })
  )
  .output(
    z.object({
      streamingToken: z.string().describe('The temporary authentication token for streaming.'),
      expiresInSeconds: z.number().describe('Token expiration time in seconds.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.createStreamingToken(
      ctx.input.expiresInSeconds,
      ctx.input.maxSessionDurationSeconds
    );

    return {
      output: {
        streamingToken: result.token,
        expiresInSeconds: result.expires_in_seconds
      },
      message: `Streaming token created. Expires in **${result.expires_in_seconds}** seconds.`
    };
  })
  .build();
