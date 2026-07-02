import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageAccessTokens = SlateTool.create(spec, {
  name: 'Manage Access Tokens',
  key: 'manage_access_tokens',
  description: `Generate, retrieve, or delete access tokens for a token-protected conference room (access_type=3). Tokens control participant access and can be used for paid events distributed via CRM or email.`,
  instructions: [
    'The conference room must have access_type=3 (token-protected) for tokens to work.',
    'Use action "generate" to create new tokens, "list" to retrieve existing tokens, or "delete" to remove all tokens.'
  ]
})
  .input(
    z.object({
      roomId: z.string().describe('ID of the conference room'),
      action: z.enum(['generate', 'list', 'delete']).describe('Action to perform on tokens'),
      count: z
        .number()
        .optional()
        .describe('Number of tokens to generate (required for "generate" action)')
    })
  )
  .output(
    z.object({
      accessTokens: z
        .array(
          z.object({
            token: z.string().optional(),
            sentToEmail: z.string().nullable().optional(),
            firstUseDate: z.string().nullable().optional()
          })
        )
        .optional()
        .describe('List of access tokens'),
      deleted: z.boolean().optional().describe('Whether tokens were deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { roomId, action, count } = ctx.input;

    if (action === 'generate') {
      if (!count || count < 1) {
        throw new Error('count is required and must be >= 1 when generating tokens');
      }
      let result = await client.generateTokens(roomId, count);
      let tokens = (result?.access_tokens || []).map((t: any) => ({
        token: t.token,
        sentToEmail: t.sent_to_email ?? null,
        firstUseDate: t.first_use_date ?? null
      }));
      return {
        output: { accessTokens: tokens },
        message: `Generated **${tokens.length}** access token(s) for room ${roomId}.`
      };
    }

    if (action === 'list') {
      let result = await client.getTokens(roomId);
      let tokens = (result?.access_tokens || []).map((t: any) => ({
        token: t.token,
        sentToEmail: t.sent_to_email ?? null,
        firstUseDate: t.first_use_date ?? null
      }));
      return {
        output: { accessTokens: tokens },
        message: `Found **${tokens.length}** access token(s) for room ${roomId}.`
      };
    }

    // delete
    await client.deleteTokens(roomId);
    return {
      output: { deleted: true },
      message: `Deleted all access tokens for room ${roomId}.`
    };
  })
  .build();
