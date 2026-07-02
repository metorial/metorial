import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let numberValue = (value: unknown) => (typeof value === 'number' ? value : undefined);
let stringValue = (value: unknown) => (typeof value === 'string' ? value : undefined);
let booleanValue = (value: unknown) => (typeof value === 'boolean' ? value : undefined);

let apiKeyOutputSchema = z.object({
  keyHash: z.string().optional().describe('Hash identifier for the key'),
  key: z.string().optional().describe('New API key secret, returned only when creating a key'),
  name: z.string().optional().describe('API key name'),
  label: z.string().optional().describe('API key label'),
  usage: z.number().optional().describe('Total credits used by this key'),
  usageDaily: z.number().optional().describe('Daily usage for this key'),
  usageWeekly: z.number().optional().describe('Weekly usage for this key'),
  usageMonthly: z.number().optional().describe('Monthly usage for this key'),
  byokUsage: z.number().optional().describe('Total BYOK usage for this key'),
  limit: z.number().nullable().optional().describe('Spending limit (null = unlimited)'),
  limitRemaining: z.number().optional().describe('Remaining spend under the key limit'),
  limitReset: z
    .string()
    .nullable()
    .optional()
    .describe('Limit reset interval, or null for no reset'),
  includeByokInLimit: z
    .boolean()
    .optional()
    .describe('Whether BYOK usage counts toward this key limit'),
  disabled: z.boolean().optional().describe('Whether the key is disabled'),
  workspaceId: z.string().optional().describe('Workspace ID for the key'),
  creatorUserId: z.string().optional().describe('Creator user ID'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp'),
  expiresAt: z.string().nullable().optional().describe('Expiration timestamp')
});

let normalizeApiKey = (data: Record<string, unknown>, key?: string) => ({
  keyHash: stringValue(data.hash ?? data.key_hash),
  key,
  name: stringValue(data.name),
  label: stringValue(data.label),
  usage: numberValue(data.usage),
  usageDaily: numberValue(data.usage_daily),
  usageWeekly: numberValue(data.usage_weekly),
  usageMonthly: numberValue(data.usage_monthly),
  byokUsage: numberValue(data.byok_usage),
  limit: data.limit !== undefined ? (data.limit as number | null) : undefined,
  limitRemaining: numberValue(data.limit_remaining),
  limitReset: data.limit_reset !== undefined ? (data.limit_reset as string | null) : undefined,
  includeByokInLimit: booleanValue(data.include_byok_in_limit),
  disabled: booleanValue(data.disabled),
  workspaceId: stringValue(data.workspace_id),
  creatorUserId: stringValue(data.creator_user_id),
  createdAt: data.created_at ? String(data.created_at) : undefined,
  updatedAt: data.updated_at ? String(data.updated_at) : undefined,
  expiresAt: data.expires_at !== undefined ? (data.expires_at as string | null) : undefined
});

let createKeyFields = {
  name: z.string().describe('Name for the new API key'),
  limit: z
    .number()
    .nullable()
    .optional()
    .describe('Optional spending limit in USD; null means unlimited'),
  limitReset: z
    .enum(['daily', 'weekly', 'monthly'])
    .nullable()
    .optional()
    .describe('Credit limit reset interval; null means no reset'),
  includeByokInLimit: z
    .boolean()
    .optional()
    .describe('Whether BYOK usage should count toward the spending limit'),
  expiresAt: z
    .string()
    .nullable()
    .optional()
    .describe('Optional UTC ISO timestamp when the API key expires'),
  workspaceId: z.string().optional().describe('Workspace to create the key in'),
  creatorUserId: z
    .string()
    .nullable()
    .optional()
    .describe('Creator user ID for organization-owned keys')
};

export let listApiKeys = SlateTool.create(spec, {
  name: 'List API Keys',
  key: 'list_api_keys',
  description: `List API keys for the authenticated OpenRouter account, including usage, limits, BYOK usage, workspace, disabled state, and expiration metadata. Requires a Management API key.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeDisabled: z.boolean().optional().describe('Whether to include disabled API keys'),
      offset: z.number().min(0).optional().describe('Number of API keys to skip'),
      workspaceId: z.string().optional().describe('Filter API keys by workspace ID')
    })
  )
  .output(
    z.object({
      keys: z.array(apiKeyOutputSchema).describe('List of API keys')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      siteUrl: ctx.config.siteUrl,
      appTitle: ctx.config.appTitle
    });

    let rawKeys = await client.listApiKeys({
      includeDisabled: ctx.input.includeDisabled,
      offset: ctx.input.offset,
      workspaceId: ctx.input.workspaceId
    });
    let keys = rawKeys.map(key => normalizeApiKey(key));

    return {
      output: { keys },
      message: `Found **${keys.length}** API key(s).`
    };
  })
  .build();

export let createApiKey = SlateTool.create(spec, {
  name: 'Create API Key',
  key: 'create_api_key',
  description: `Create a new OpenRouter API key. Optionally set an expiration, spending limit, limit reset interval, BYOK-limit behavior, and workspace. Requires a Management API key.`,
  tags: {
    destructive: false
  }
})
  .input(z.object(createKeyFields))
  .output(apiKeyOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      siteUrl: ctx.config.siteUrl,
      appTitle: ctx.config.appTitle
    });

    let result = await client.createApiKey(ctx.input);
    let data = (result.data as Record<string, unknown>) || result;
    let output = normalizeApiKey(data, stringValue(result.key));

    return {
      output,
      message: `Created API key **${output.name || ctx.input.name}**.`
    };
  })
  .build();

export let getApiKey = SlateTool.create(spec, {
  name: 'Get API Key',
  key: 'get_api_key',
  description:
    'Retrieve metadata for a single OpenRouter API key by hash. Requires a Management API key.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      keyHash: z.string().describe('Hash identifier of the API key to retrieve')
    })
  )
  .output(apiKeyOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      siteUrl: ctx.config.siteUrl,
      appTitle: ctx.config.appTitle
    });

    let data = await client.getApiKey(ctx.input.keyHash);
    let output = normalizeApiKey(data);

    return {
      output,
      message: `Retrieved API key **${output.name || output.keyHash || ctx.input.keyHash}**.`
    };
  })
  .build();

export let updateApiKey = SlateTool.create(spec, {
  name: 'Update API Key',
  key: 'update_api_key',
  description:
    'Update an OpenRouter API key name, spending limit, limit reset interval, disabled state, or BYOK-limit behavior. Requires a Management API key.',
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      keyHash: z.string().describe('Hash identifier of the API key to update'),
      name: z.string().optional().describe('New API key name'),
      limit: z
        .number()
        .nullable()
        .optional()
        .describe('New spending limit in USD; null means unlimited'),
      limitReset: z
        .enum(['daily', 'weekly', 'monthly'])
        .nullable()
        .optional()
        .describe('New limit reset interval; null means no reset'),
      disabled: z.boolean().optional().describe('Whether to disable this API key'),
      includeByokInLimit: z
        .boolean()
        .optional()
        .describe('Whether BYOK usage should count toward this key limit')
    })
  )
  .output(apiKeyOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      siteUrl: ctx.config.siteUrl,
      appTitle: ctx.config.appTitle
    });

    let result = await client.updateApiKey(ctx.input.keyHash, {
      name: ctx.input.name,
      limit: ctx.input.limit,
      limitReset: ctx.input.limitReset,
      disabled: ctx.input.disabled,
      includeByokInLimit: ctx.input.includeByokInLimit
    });
    let output = normalizeApiKey(result);

    return {
      output,
      message: `Updated API key **${output.name || ctx.input.keyHash}**.`
    };
  })
  .build();

export let deleteApiKey = SlateTool.create(spec, {
  name: 'Delete API Key',
  key: 'delete_api_key',
  description: `Delete an OpenRouter API key by hash. This is irreversible and the key immediately stops working. Requires a Management API key.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      keyHash: z.string().describe('Hash identifier of the API key to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the key was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      siteUrl: ctx.config.siteUrl,
      appTitle: ctx.config.appTitle
    });

    let deleted = await client.deleteApiKey(ctx.input.keyHash);

    return {
      output: { deleted },
      message: `Deleted API key **${ctx.input.keyHash}**.`
    };
  })
  .build();
