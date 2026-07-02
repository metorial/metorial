import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createEmbedToken = SlateTool.create(spec, {
  name: 'Create Embed Token',
  key: 'create_embed_token',
  description: `Generate a short-lived (15-minute) token for embedding a private Felt map. The token allows unauthenticated visitors to view the map without logging in. Each token must be associated with a workspace member's email.`,
  instructions: [
    'The user_email must belong to a member of the Felt workspace with viewer, editor, or admin role.',
    'Use the token as a query parameter in the embed URL: https://felt.com/embed/map/{mapId}?token={token}'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      mapId: z.string().describe('ID of the map to embed'),
      userEmail: z
        .string()
        .describe('Email of the workspace member to associate the token with')
    })
  )
  .output(
    z.object({
      token: z.string().describe('Short-lived embed token'),
      expiresAt: z.string().describe('Expiration timestamp of the token'),
      embedUrl: z.string().describe('Ready-to-use embed URL with token')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createEmbedToken(ctx.input.mapId, ctx.input.userEmail);

    let embedUrl = `https://felt.com/embed/map/${ctx.input.mapId}?token=${result.token}`;

    return {
      output: {
        token: result.token,
        expiresAt: result.expires_at,
        embedUrl
      },
      message: `Created embed token for map \`${ctx.input.mapId}\` (expires at ${result.expires_at}).`
    };
  })
  .build();
