import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listAccessTokens = SlateTool.create(spec, {
  name: 'List Access Tokens',
  key: 'list_access_tokens',
  description: `List personal access tokens (PATs) for the authenticated Docker Hub user. Shows token labels, scopes, creation dates, and activity status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination.'),
      pageSize: z.number().optional().describe('Number of results per page.')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of access tokens.'),
      tokens: z.array(
        z.object({
          tokenUuid: z.string().describe('UUID of the token.'),
          label: z.string().describe('Display label for the token.'),
          scopes: z.array(z.string()).describe('Permission scopes of the token.'),
          isActive: z.boolean().describe('Whether the token is active.'),
          createdAt: z.string().describe('ISO timestamp when the token was created.'),
          lastUsed: z
            .string()
            .nullable()
            .describe('ISO timestamp of the last use, or null if never used.')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listAccessTokens({
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    return {
      output: {
        totalCount: result.count,
        tokens: result.results.map(t => ({
          tokenUuid: t.uuid,
          label: t.token_label,
          scopes: t.scopes || [],
          isActive: t.is_active,
          createdAt: t.created_at,
          lastUsed: t.last_used
        }))
      },
      message: `Found **${result.count}** personal access tokens.`
    };
  })
  .build();

export let createAccessToken = SlateTool.create(spec, {
  name: 'Create Access Token',
  key: 'create_access_token',
  description: `Create a new personal access token (PAT) for Docker Hub. The token value is only shown once upon creation. PATs are a secure alternative to passwords for CLI and API authentication.`,
  instructions: [
    'The generated token value is only returned once - store it securely.',
    'Available scopes for paid plans: "repo:admin" (read, write, delete), "repo:write" (read, write), "repo:read" (read only), "repo:public_read" (public repos only).'
  ]
})
  .input(
    z.object({
      label: z
        .string()
        .describe('Display label for the token (e.g., "CI/CD Pipeline", "Dev Machine").'),
      scopes: z
        .array(z.string())
        .describe('Permission scopes for the token (e.g., ["repo:read"]).')
    })
  )
  .output(
    z.object({
      tokenUuid: z.string().describe('UUID of the created token.'),
      tokenValue: z
        .string()
        .describe('The generated token value. Store securely - this is only shown once.'),
      label: z.string().describe('Display label of the token.'),
      scopes: z.array(z.string()).describe('Permission scopes of the token.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let pat = await client.createAccessToken({
      token_label: ctx.input.label,
      scopes: ctx.input.scopes
    });

    return {
      output: {
        tokenUuid: pat.uuid,
        tokenValue: pat.token,
        label: pat.token_label,
        scopes: pat.scopes || []
      },
      message: `Created access token **${pat.token_label}**. Store the token value securely - it won't be shown again.`
    };
  })
  .build();

export let updateAccessToken = SlateTool.create(spec, {
  name: 'Update Access Token',
  key: 'update_access_token',
  description: `Update a personal access token's label or active status. Can be used to rename tokens or deactivate/reactivate them without deleting.`
})
  .input(
    z.object({
      tokenUuid: z.string().describe('UUID of the token to update.'),
      label: z.string().optional().describe('New display label for the token.'),
      isActive: z
        .boolean()
        .optional()
        .describe('Set to false to deactivate the token, true to reactivate.')
    })
  )
  .output(
    z.object({
      tokenUuid: z.string().describe('UUID of the updated token.'),
      label: z.string().describe('Updated display label.'),
      isActive: z.boolean().describe('Updated active status.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let pat = await client.updateAccessToken(ctx.input.tokenUuid, {
      token_label: ctx.input.label,
      is_active: ctx.input.isActive
    });

    return {
      output: {
        tokenUuid: pat.uuid,
        label: pat.token_label,
        isActive: pat.is_active
      },
      message: `Updated access token **${pat.token_label}** (${pat.is_active ? 'active' : 'inactive'}).`
    };
  })
  .build();

export let deleteAccessToken = SlateTool.create(spec, {
  name: 'Delete Access Token',
  key: 'delete_access_token',
  description: `Permanently delete a personal access token. Any systems using this token will immediately lose access.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      tokenUuid: z.string().describe('UUID of the token to delete.')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the token was successfully deleted.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteAccessToken(ctx.input.tokenUuid);

    return {
      output: { deleted: true },
      message: `Deleted access token **${ctx.input.tokenUuid}**.`
    };
  })
  .build();
