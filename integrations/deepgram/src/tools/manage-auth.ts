import { SlateTool } from 'slates';
import { z } from 'zod';
import { DeepgramClient } from '../lib/client';
import { spec } from '../spec';

export let createTemporaryTokenTool = SlateTool.create(spec, {
  name: 'Create Temporary Token',
  key: 'create_temporary_token',
  description: `Create a short-lived Deepgram JWT for client-side or temporary use with core voice APIs. Deepgram temporary tokens do not work with Manage API endpoints.`,
  constraints: [
    'Requires an API key with Member or higher permissions.',
    'The temporary token is intended for short-lived core voice API access, not Deepgram Manage APIs.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      ttlSeconds: z
        .number()
        .min(1)
        .max(3600)
        .optional()
        .describe('Token lifetime in seconds. Deepgram defaults to 30 and allows 1-3600.')
    })
  )
  .output(
    z.object({
      accessToken: z.string().describe('Temporary Deepgram JWT access token.'),
      expiresIn: z.number().optional().describe('Token lifetime in seconds.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DeepgramClient(ctx.auth.token);
    let result = await client.createTemporaryToken({
      ttlSeconds: ctx.input.ttlSeconds
    });

    return {
      output: {
        accessToken: result.access_token,
        expiresIn: result.expires_in
      },
      message: `Created temporary Deepgram token${result.expires_in ? ` valid for ${result.expires_in}s` : ''}.`
    };
  })
  .build();
