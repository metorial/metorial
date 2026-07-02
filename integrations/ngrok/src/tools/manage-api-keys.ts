import { SlateTool } from 'slates';
import { z } from 'zod';
import { NgrokClient } from '../lib/client';
import { spec } from '../spec';

let apiKeyOutputSchema = z.object({
  apiKeyId: z.string().describe('API key ID'),
  uri: z.string().describe('API resource URI'),
  createdAt: z.string().describe('Creation timestamp'),
  description: z.string().describe('Description'),
  metadata: z.string().describe('Metadata'),
  apiKeyToken: z
    .string()
    .optional()
    .nullable()
    .describe('API key token value (only available at creation time)'),
  ownerId: z.string().describe('Owner user or bot user ID')
});

let mapApiKey = (k: any) => ({
  apiKeyId: k.id,
  uri: k.uri || '',
  createdAt: k.created_at || '',
  description: k.description || '',
  metadata: k.metadata || '',
  apiKeyToken: k.token || null,
  ownerId: k.owner_id || ''
});

export let listApiKeys = SlateTool.create(spec, {
  name: 'List API Keys',
  key: 'list_api_keys',
  description: `List all API keys for your ngrok account. API keys authenticate requests to the ngrok REST API.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      beforeId: z.string().optional().describe('Pagination cursor'),
      limit: z.number().optional().describe('Max results per page')
    })
  )
  .output(
    z.object({
      apiKeys: z.array(apiKeyOutputSchema),
      nextPageUri: z.string().optional().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    let result = await client.listApiKeys({
      beforeId: ctx.input.beforeId,
      limit: ctx.input.limit
    });
    let apiKeys = (result.keys || []).map(mapApiKey);
    return {
      output: { apiKeys, nextPageUri: result.next_page_uri || null },
      message: `Found **${apiKeys.length}** API key(s).`
    };
  })
  .build();

export let getApiKey = SlateTool.create(spec, {
  name: 'Get API Key',
  key: 'get_api_key',
  description: `Retrieve details of a specific API key. Note: the token value is only available at creation time.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      apiKeyId: z.string().describe('API key ID (e.g., ak_xxx)')
    })
  )
  .output(apiKeyOutputSchema)
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    let k = await client.getApiKey(ctx.input.apiKeyId);
    return {
      output: mapApiKey(k),
      message: `Retrieved API key **${k.id}**.`
    };
  })
  .build();

export let createApiKey = SlateTool.create(spec, {
  name: 'Create API Key',
  key: 'create_api_key',
  description: `Create a new API key for authenticating with the ngrok API. **Important:** The token value is only returned once at creation time — save it immediately.`,
  instructions: ['Save the returned apiKeyToken immediately as it cannot be retrieved later.'],
  tags: { destructive: false }
})
  .input(
    z.object({
      description: z.string().optional().describe('Description (max 255 bytes)'),
      metadata: z.string().optional().describe('Metadata (max 4096 bytes)'),
      ownerId: z.string().optional().describe('Owner user ID or bot user ID')
    })
  )
  .output(apiKeyOutputSchema)
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    let k = await client.createApiKey({
      description: ctx.input.description,
      metadata: ctx.input.metadata,
      ownerId: ctx.input.ownerId
    });
    return {
      output: mapApiKey(k),
      message: `Created API key **${k.id}**. ⚠️ Save the token now — it won't be shown again.`
    };
  })
  .build();

export let updateApiKey = SlateTool.create(spec, {
  name: 'Update API Key',
  key: 'update_api_key',
  description: `Update an API key's description or metadata.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      apiKeyId: z.string().describe('API key ID to update'),
      description: z.string().optional().describe('New description'),
      metadata: z.string().optional().describe('New metadata')
    })
  )
  .output(apiKeyOutputSchema)
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    let k = await client.updateApiKey(ctx.input.apiKeyId, {
      description: ctx.input.description,
      metadata: ctx.input.metadata
    });
    return {
      output: mapApiKey(k),
      message: `Updated API key **${k.id}**.`
    };
  })
  .build();

export let deleteApiKey = SlateTool.create(spec, {
  name: 'Delete API Key',
  key: 'delete_api_key',
  description: `Delete an API key. Requests using this key will no longer be authenticated.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      apiKeyId: z.string().describe('API key ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    await client.deleteApiKey(ctx.input.apiKeyId);
    return {
      output: { success: true },
      message: `Deleted API key **${ctx.input.apiKeyId}**.`
    };
  })
  .build();
