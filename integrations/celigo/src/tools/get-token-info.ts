import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTokenInfo = SlateTool.create(spec, {
  name: 'Get Token Info',
  key: 'get_token_info',
  description: `Verify the current API token and retrieve its associated user ID and scope. Useful for confirming authentication is working and checking token permissions.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().describe('User ID associated with the token'),
      scope: z.string().optional().describe('Token scope/permissions'),
      rawTokenInfo: z.any().describe('Full token info response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let tokenInfo = await client.getTokenInfo();

    return {
      output: {
        userId: tokenInfo._userId,
        scope: tokenInfo.scope,
        rawTokenInfo: tokenInfo
      },
      message: `Token is valid. User ID: **${tokenInfo._userId}**, scope: ${tokenInfo.scope || 'full access'}.`
    };
  })
  .build();
