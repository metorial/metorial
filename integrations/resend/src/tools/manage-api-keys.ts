import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createApiKey = SlateTool.create(spec, {
  name: 'Create API Key',
  key: 'create_api_key',
  description: `Create a new Resend API key with specific permissions. The key value is only returned once at creation — store it securely.`,
  constraints: [
    'Key name must be max 50 characters.',
    'Domain scoping is only available with sending_access permission.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the API key (max 50 chars).'),
      permission: z
        .enum(['full_access', 'sending_access'])
        .optional()
        .describe('Permission level. Defaults to full_access.'),
      domainId: z
        .string()
        .optional()
        .describe('Restrict key to a specific domain. Only with sending_access.')
    })
  )
  .output(
    z.object({
      apiKeyId: z.string().describe('ID of the created API key.'),
      apiKeyToken: z.string().describe('The API key value (shown only once).')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createApiKey({
      name: ctx.input.name,
      permission: ctx.input.permission,
      domainId: ctx.input.domainId
    });

    return {
      output: {
        apiKeyId: result.id,
        apiKeyToken: result.token
      },
      message: `API key **${ctx.input.name}** created. **Store the token securely — it won't be shown again.**`
    };
  })
  .build();

export let listApiKeys = SlateTool.create(spec, {
  name: 'List API Keys',
  key: 'list_api_keys',
  description: `List all API keys in your Resend account. Key values are not included — only metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Max results (default 20, max 100).'),
      after: z.string().optional().describe('Cursor for forward pagination.'),
      before: z.string().optional().describe('Cursor for backward pagination.')
    })
  )
  .output(
    z.object({
      apiKeys: z
        .array(
          z.object({
            apiKeyId: z.string().describe('API key ID.'),
            name: z.string().describe('API key name.'),
            createdAt: z.string().optional().describe('Creation timestamp.'),
            lastUsedAt: z.string().optional().nullable().describe('Last usage timestamp.')
          })
        )
        .describe('List of API keys.'),
      hasMore: z.boolean().describe('Whether more results are available.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listApiKeys({
      limit: ctx.input.limit,
      after: ctx.input.after,
      before: ctx.input.before
    });

    let apiKeys = (result.data || []).map((k: any) => ({
      apiKeyId: k.id,
      name: k.name,
      createdAt: k.created_at,
      lastUsedAt: k.last_used_at
    }));

    return {
      output: {
        apiKeys,
        hasMore: result.has_more ?? false
      },
      message: `Found **${apiKeys.length}** API key(s).`
    };
  })
  .build();

export let deleteApiKey = SlateTool.create(spec, {
  name: 'Delete API Key',
  key: 'delete_api_key',
  description: `Permanently revoke an API key. Any integrations using this key will stop working immediately.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      apiKeyId: z.string().describe('ID of the API key to delete.')
    })
  )
  .output(
    z.object({
      apiKeyId: z.string().describe('ID of the deleted API key.'),
      deleted: z.boolean().describe('Whether the key was successfully deleted.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteApiKey(ctx.input.apiKeyId);

    return {
      output: {
        apiKeyId: ctx.input.apiKeyId,
        deleted: true
      },
      message: `API key \`${ctx.input.apiKeyId}\` has been **revoked**.`
    };
  })
  .build();
