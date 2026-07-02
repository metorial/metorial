import { SlateTool } from 'slates';
import { z } from 'zod';
import { DatabricksClient } from '../lib/client';
import { spec } from '../spec';

export let manageSecrets = SlateTool.create(spec, {
  name: 'Manage Secrets',
  key: 'manage_secrets',
  description: `Manage secret scopes and secrets. Create/delete scopes, put/delete secrets, or list scopes and secret keys. Secret values cannot be read back — only metadata is returned.`,
  instructions: [
    'Secret values are write-only and cannot be retrieved after being set.',
    'Listing secrets returns only the key names, not the values.'
  ]
})
  .input(
    z.object({
      action: z
        .enum([
          'list_scopes',
          'create_scope',
          'delete_scope',
          'list_secrets',
          'put_secret',
          'delete_secret'
        ])
        .describe('Action to perform'),
      scope: z.string().optional().describe('Secret scope name (required for most actions)'),
      secretKey: z
        .string()
        .optional()
        .describe('Secret key name (required for put_secret, delete_secret)'),
      secretValue: z.string().optional().describe('Secret value (required for put_secret)'),
      initialManagePrincipal: z
        .string()
        .optional()
        .describe('Initial manage principal for scope creation (e.g., "users")')
    })
  )
  .output(
    z.object({
      scopes: z
        .array(
          z.object({
            scopeName: z.string().describe('Scope name'),
            backendType: z
              .string()
              .optional()
              .describe('Backend type (DATABRICKS or AZURE_KEYVAULT)')
          })
        )
        .optional()
        .describe('List of secret scopes'),
      secrets: z
        .array(
          z.object({
            secretKey: z.string().describe('Secret key name'),
            lastUpdatedTimestamp: z
              .string()
              .optional()
              .describe('Last update time in epoch ms')
          })
        )
        .optional()
        .describe('List of secrets in a scope'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DatabricksClient({
      workspaceUrl: ctx.config.workspaceUrl,
      token: ctx.auth.token
    });

    switch (ctx.input.action) {
      case 'list_scopes': {
        let scopes = await client.listSecretScopes();
        let mapped = scopes.map((s: any) => ({
          scopeName: s.name,
          backendType: s.backend_type
        }));
        return {
          output: { scopes: mapped, success: true },
          message: `Found **${mapped.length}** secret scope(s).`
        };
      }
      case 'create_scope': {
        if (!ctx.input.scope) throw new Error('scope is required');
        await client.createSecretScope(ctx.input.scope, ctx.input.initialManagePrincipal);
        return {
          output: { success: true },
          message: `Created secret scope **${ctx.input.scope}**.`
        };
      }
      case 'delete_scope': {
        if (!ctx.input.scope) throw new Error('scope is required');
        await client.deleteSecretScope(ctx.input.scope);
        return {
          output: { success: true },
          message: `Deleted secret scope **${ctx.input.scope}**.`
        };
      }
      case 'list_secrets': {
        if (!ctx.input.scope) throw new Error('scope is required');
        let secrets = await client.listSecrets(ctx.input.scope);
        let mapped = secrets.map((s: any) => ({
          secretKey: s.key,
          lastUpdatedTimestamp: s.last_updated_timestamp
            ? String(s.last_updated_timestamp)
            : undefined
        }));
        return {
          output: { secrets: mapped, success: true },
          message: `Found **${mapped.length}** secret(s) in scope **${ctx.input.scope}**.`
        };
      }
      case 'put_secret': {
        if (!ctx.input.scope || !ctx.input.secretKey || !ctx.input.secretValue) {
          throw new Error('scope, secretKey, and secretValue are required');
        }
        await client.putSecret(ctx.input.scope, ctx.input.secretKey, ctx.input.secretValue);
        return {
          output: { success: true },
          message: `Stored secret **${ctx.input.secretKey}** in scope **${ctx.input.scope}**.`
        };
      }
      case 'delete_secret': {
        if (!ctx.input.scope || !ctx.input.secretKey) {
          throw new Error('scope and secretKey are required');
        }
        await client.deleteSecret(ctx.input.scope, ctx.input.secretKey);
        return {
          output: { success: true },
          message: `Deleted secret **${ctx.input.secretKey}** from scope **${ctx.input.scope}**.`
        };
      }
    }
  })
  .build();
