import { SlateTool } from 'slates';
import { z } from 'zod';
import { DriftClient } from '../lib/client';
import { spec } from '../spec';

let parseOrgId = (authenticatedUserId: unknown) =>
  typeof authenticatedUserId === 'string'
    ? authenticatedUserId.replace(/^orgId:/, '')
    : undefined;

let parseScopes = (scope: unknown) =>
  typeof scope === 'string' && scope.trim() ? scope.split(/\s+/).filter(Boolean) : [];

export let getTokenInfo = SlateTool.create(spec, {
  name: 'Get Token Info',
  key: 'get_token_info',
  description: `Inspect Drift metadata for the current access token, including organization ID, scopes, app credential ID, and expiration metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      tokenId: z.string().optional().describe('Unique Drift token identifier'),
      orgId: z.string().optional().describe('Drift organization ID'),
      credentialId: z
        .string()
        .optional()
        .describe('App credential ID associated with the token'),
      tokenType: z.string().optional().describe('Token type'),
      expiresIn: z
        .number()
        .optional()
        .describe('Milliseconds until expiration, or 0 for non-expiring tokens'),
      createdAt: z
        .number()
        .optional()
        .describe('Token creation timestamp in epoch milliseconds'),
      scopes: z.array(z.string()).describe('Scopes granted to the current token')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DriftClient(ctx.auth.token);
    let tokenInfo = await client.getTokenInfo(ctx.auth.token);
    let scopes = parseScopes(tokenInfo.scope);

    return {
      output: {
        tokenId: tokenInfo.id,
        orgId: parseOrgId(tokenInfo.authenticated_userid),
        credentialId: tokenInfo.credential_id,
        tokenType: tokenInfo.token_type,
        expiresIn: tokenInfo.expires_in,
        createdAt: tokenInfo.created_at,
        scopes
      },
      message: `Current Drift token has **${scopes.length}** scope(s).`
    };
  })
  .build();
