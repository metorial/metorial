import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listAccessTokens = SlateTool.create(spec, {
  name: 'List Access Tokens',
  key: 'list_access_tokens',
  description: `List all API access tokens configured for the Retool organization. Useful for auditing active API credentials.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      accessTokens: z
        .array(z.record(z.string(), z.any()))
        .describe('List of access token entries'),
      totalCount: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    let result = await client.listAccessTokens();

    return {
      output: {
        accessTokens: result.data,
        totalCount: result.total_count
      },
      message: `Found **${result.total_count}** access tokens.`
    };
  })
  .build();
