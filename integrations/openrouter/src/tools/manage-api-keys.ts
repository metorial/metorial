import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listApiKeys = SlateTool.create(spec, {
  name: 'List API Keys',
  key: 'list_api_keys',
  description: `List all API keys for your OpenRouter account. Returns key metadata including name, usage, limits, and status. Requires a Management API key.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      keys: z
        .array(
          z.object({
            keyHash: z.string().optional().describe('Hash identifier for the key'),
            name: z.string().optional().describe('Name/label of the key'),
            usage: z.number().optional().describe('Credits used by this key'),
            limit: z
              .number()
              .nullable()
              .optional()
              .describe('Credit limit for this key (null = unlimited)'),
            disabled: z.boolean().optional().describe('Whether the key is disabled'),
            createdAt: z.string().optional().describe('Key creation timestamp')
          })
        )
        .describe('List of API keys')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      siteUrl: ctx.config.siteUrl,
      appTitle: ctx.config.appTitle
    });

    let rawKeys = await client.listApiKeys();

    let keys = (Array.isArray(rawKeys) ? rawKeys : []).map((k: Record<string, unknown>) => ({
      keyHash: (k.hash as string) || (k.key_hash as string) || undefined,
      name: (k.name as string) || (k.label as string) || undefined,
      usage: (k.usage as number) || undefined,
      limit: k.limit !== undefined ? (k.limit as number | null) : undefined,
      disabled: (k.disabled as boolean) || undefined,
      createdAt: k.created_at ? String(k.created_at) : undefined
    }));

    return {
      output: { keys },
      message: `Found **${keys.length}** API key(s).`
    };
  })
  .build();

export let createApiKey = SlateTool.create(spec, {
  name: 'Create API Key',
  key: 'create_api_key',
  description: `Create a new API key for your OpenRouter account. Optionally set a credit limit or create it in a disabled state. Requires a Management API key.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name/label for the new API key'),
      limit: z.number().optional().describe('Credit limit for the key (omit for unlimited)'),
      disabled: z.boolean().optional().describe('Create the key in a disabled state')
    })
  )
  .output(
    z.object({
      key: z
        .string()
        .optional()
        .describe('The newly created API key (only returned once — store securely)'),
      keyHash: z.string().optional().describe('Hash identifier for the key'),
      name: z.string().optional().describe('Name of the created key'),
      limit: z.number().nullable().optional().describe('Credit limit for the key')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      siteUrl: ctx.config.siteUrl,
      appTitle: ctx.config.appTitle
    });

    let result = await client.createApiKey(ctx.input);
    let data = (result.data as Record<string, unknown>) || result;

    return {
      output: {
        key: (data.key as string) || (result.key as string) || undefined,
        keyHash: (data.hash as string) || (data.key_hash as string) || undefined,
        name: (data.name as string) || ctx.input.name,
        limit:
          data.limit !== undefined ? (data.limit as number | null) : (ctx.input.limit ?? null)
      },
      message: `Created API key **${ctx.input.name}**.`
    };
  })
  .build();

export let deleteApiKey = SlateTool.create(spec, {
  name: 'Delete API Key',
  key: 'delete_api_key',
  description: `Delete an API key by its hash. This is irreversible — the key will immediately stop working. Requires a Management API key.`,
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

    await client.deleteApiKey(ctx.input.keyHash);

    return {
      output: { deleted: true },
      message: `Deleted API key **${ctx.input.keyHash}**.`
    };
  })
  .build();
