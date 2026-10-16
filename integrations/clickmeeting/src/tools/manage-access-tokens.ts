import { createApiServiceError, isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageAccessTokens = SlateTool.create(spec, {
  name: 'Manage Access Tokens',
  key: 'manage_access_tokens',
  description: `Generate, retrieve, or delete access tokens for a token-protected conference room (access_type=3). Tokens control participant access and can be used for paid events distributed via CRM or email.`,
  instructions: [
    'The conference room must have access_type=3 (token-protected) for tokens to work.',
    'Use action "generate" to create new tokens, "list" to retrieve existing tokens, or "delete" to deactivate access tokens.'
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
      if (count === undefined || !Number.isInteger(count) || count < 1 || count > 1000) {
        throw createApiServiceError(
          'count must be an integer from 1 to 1000 when generating tokens'
        );
      }
      let result = await client.generateTokens(roomId, count);
      let tokens = mapTokens(result);
      return {
        output: { accessTokens: tokens },
        message: `Generated **${tokens.length}** access token(s) for room ${roomId}.`
      };
    }

    if (action === 'list') {
      let result = await client.getTokens(roomId);
      let tokens = mapTokens(result);
      return {
        output: { accessTokens: tokens },
        message: `Found **${tokens.length}** access token(s) for room ${roomId}.`
      };
    }

    // delete
    await client.deleteTokens(roomId);
    return {
      output: { deleted: true },
      message: `Deleted access tokens for room ${roomId}.`
    };
  })
  .build();

function mapTokens(result: Record<string, unknown>) {
  if (!Array.isArray(result.access_tokens)) {
    throw createApiServiceError('ClickMeeting returned an invalid access token list.');
  }
  return result.access_tokens.map(token => {
    if (
      !isApiErrorRecord(token) ||
      typeof token.token !== 'string' ||
      (token.sent_to_email !== undefined &&
        token.sent_to_email !== null &&
        typeof token.sent_to_email !== 'string') ||
      (token.first_use_date !== undefined &&
        token.first_use_date !== null &&
        typeof token.first_use_date !== 'string')
    ) {
      throw createApiServiceError('ClickMeeting returned an invalid access token.');
    }
    return {
      token: token.token,
      ...(token.sent_to_email !== undefined
        ? { sentToEmail: token.sent_to_email as string | null }
        : {}),
      ...(token.first_use_date !== undefined
        ? { firstUseDate: token.first_use_date as string | null }
        : {})
    };
  });
}
