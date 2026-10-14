import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { MapboxClient } from '../lib/client';
import { spec } from '../spec';

export let whoAmITool = SlateTool.create(spec, {
  name: 'Who Am I',
  key: 'who_am_i',
  description: 'Identify the Mapbox account and token type for the current connection.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      username: z.string().describe('Username of the account that owns the access token'),
      tokenId: z
        .string()
        .optional()
        .describe('Authorization identifier for a public or secret token'),
      usage: z.string().optional().describe('Token type: pk, sk, or tk'),
      scopes: z.array(z.string()).optional().describe('Scopes included in a temporary token'),
      expiresAt: z.string().optional().describe('Expiration timestamp for a temporary token')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MapboxClient({ token: ctx.auth.token, username: ctx.config.username });
    let result = await client.validateToken();
    if (result.code !== 'TokenValid' || !result.token?.user) {
      throw createApiServiceError(
        `Mapbox access token is not valid (${result.code || 'unknown status'}). Reconnect with an active token.`,
        { upstreamCode: result.code }
      );
    }
    return {
      output: {
        username: result.token.user,
        tokenId: result.token.authorization,
        usage: result.token.usage,
        scopes: result.token.scopes,
        expiresAt: result.token.expires
      },
      message: `Connected to Mapbox account **${result.token.user}**.`
    };
  });
