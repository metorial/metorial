import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTokensByEmail = SlateTool.create(spec, {
  key: 'get_tokens_by_email',
  name: 'Get Tokens by Email',
  description:
    'Retrieves access tokens assigned to an email address for a token-protected conference. Call list_conferences to discover room IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      roomId: z
        .string()
        .describe('Conference room ID. Call list_conferences to discover rooms'),
      email: z.string().describe('Email address to which the tokens were assigned')
    })
  )
  .output(
    z.object({
      tokens: z.array(z.string()).describe('Original token strings returned by the provider')
    })
  )
  .handleInvocation(async ctx => {
    let tokens = await new Client({ token: ctx.auth.token }).getTokensByEmail(
      ctx.input.roomId,
      ctx.input.email
    );
    return {
      output: { tokens },
      message: `Found **${tokens.length}** access token(s) assigned to **${ctx.input.email}**.`
    };
  })
  .build();
