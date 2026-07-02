import { SlateTool } from 'slates';
import { z } from 'zod';
import { MapboxClient } from '../lib/client';
import { spec } from '../spec';

let tokenSchema = z.object({
  tokenId: z.string().optional().describe('Token ID'),
  note: z.string().optional().describe('Token description/note'),
  usage: z.string().optional().describe('Token usage type (pk, sk, tk)'),
  scopes: z.array(z.string()).optional().describe('Token scopes'),
  allowedUrls: z.array(z.string()).optional().describe('URL restrictions'),
  created: z.string().optional().describe('Creation timestamp'),
  modified: z.string().optional().describe('Last modified timestamp'),
  tokenValue: z.string().optional().describe('The token string (only returned on create)'),
  isDefault: z.boolean().optional().describe('Whether this is the default token')
});

export let manageTokensTool = SlateTool.create(spec, {
  name: 'Manage Tokens',
  key: 'manage_tokens',
  description: `List, create, update, delete, or validate Mapbox access tokens. Tokens control API access permissions through scopes. Use this to manage API credentials for your applications.`,
  instructions: [
    'Use action "list" to see all tokens on the account.',
    'Use action "create" to generate a new token — specify scopes for permissions.',
    'Use action "validate" to check if a token is valid and see its scopes.',
    'Common scopes: styles:read, styles:write, datasets:read, datasets:write, uploads:read, uploads:write, fonts:read, tokens:read, tokens:write.'
  ],
  constraints: [
    'Requires a secret token (sk.*) with tokens:write scope for create/update/delete operations.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'update', 'delete', 'validate'])
        .describe('Operation to perform'),
      tokenId: z.string().optional().describe('Token ID (required for update, delete)'),
      tokenToValidate: z
        .string()
        .optional()
        .describe('Token string to validate (for validate action; defaults to current token)'),
      note: z.string().optional().describe('Token description (for create/update)'),
      scopes: z.array(z.string()).optional().describe('Token scopes (for create/update)'),
      allowedUrls: z
        .array(z.string())
        .optional()
        .describe('URL restrictions (for create/update)')
    })
  )
  .output(
    z.object({
      tokenInfo: tokenSchema.optional().describe('Token details (for create/update/validate)'),
      tokens: z.array(tokenSchema).optional().describe('List of tokens (for list)'),
      deleted: z.boolean().optional().describe('Whether the token was deleted'),
      valid: z.boolean().optional().describe('Whether the validated token is valid')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MapboxClient({
      token: ctx.auth.token,
      username: ctx.config.username
    });

    let { action } = ctx.input;

    let mapToken = (t: any) => ({
      tokenId: t.id,
      note: t.note,
      usage: t.usage,
      scopes: t.scopes,
      allowedUrls: t.allowedUrls,
      created: t.created,
      modified: t.modified,
      tokenValue: t.token,
      isDefault: t.default
    });

    if (action === 'list') {
      let tokens = await client.listTokens();
      let mapped = (tokens || []).map(mapToken);
      return {
        output: { tokens: mapped },
        message: `Found **${mapped.length}** token${mapped.length !== 1 ? 's' : ''}.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.scopes || ctx.input.scopes.length === 0) {
        throw new Error('At least one scope is required to create a token');
      }
      let t = await client.createToken({
        note: ctx.input.note,
        scopes: ctx.input.scopes,
        allowedUrls: ctx.input.allowedUrls
      });
      return {
        output: { tokenInfo: mapToken(t) },
        message: `Created token **"${t.note || t.id}"** with ${ctx.input.scopes.length} scope${ctx.input.scopes.length !== 1 ? 's' : ''}.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.tokenId) throw new Error('tokenId is required for update');
      let updateData: Record<string, any> = {};
      if (ctx.input.note !== undefined) updateData.note = ctx.input.note;
      if (ctx.input.scopes !== undefined) updateData.scopes = ctx.input.scopes;
      if (ctx.input.allowedUrls !== undefined) updateData.allowedUrls = ctx.input.allowedUrls;
      let t = await client.updateToken(ctx.input.tokenId, updateData);
      return {
        output: { tokenInfo: mapToken(t) },
        message: `Updated token **${ctx.input.tokenId}**.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.tokenId) throw new Error('tokenId is required for delete');
      await client.deleteToken(ctx.input.tokenId);
      return {
        output: { deleted: true },
        message: `Deleted token **${ctx.input.tokenId}**.`
      };
    }

    if (action === 'validate') {
      let result = await client.validateToken(ctx.input.tokenToValidate);
      let isValid = result.code === 'TokenValid';
      return {
        output: {
          valid: isValid,
          tokenInfo: result.token
            ? {
                tokenId: result.token.id,
                usage: result.token.usage,
                scopes: result.token.scopes,
                note: result.token.note,
                created: result.token.created,
                modified: result.token.modified,
                isDefault: result.token.default
              }
            : undefined
        },
        message: isValid ? 'Token is **valid**.' : 'Token is **invalid**.'
      };
    }

    throw new Error(`Unknown action: ${action}`);
  });
