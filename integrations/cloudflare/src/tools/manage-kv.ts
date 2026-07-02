import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { cloudflareServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageKvTool = SlateTool.create(spec, {
  name: 'Manage Workers KV',
  key: 'manage_kv',
  description: `Manage Workers KV (Key-Value) storage. List, create, retrieve, rename, or delete namespaces, and read/write/delete key-value pairs within a namespace.`,
  instructions: [
    'First list or create a namespace, then use the namespaceId to operate on keys.',
    'KV values are strings by default. For structured data, store JSON as a string.',
    'Key names are URL-encoded before calling Cloudflare, so names containing path separators are supported.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'list_namespaces',
          'create_namespace',
          'get_namespace',
          'rename_namespace',
          'delete_namespace',
          'list_keys',
          'get_value',
          'put_value',
          'delete_key'
        ])
        .describe('Operation to perform'),
      accountId: z.string().optional().describe('Account ID (uses config if not provided)'),
      namespaceId: z
        .string()
        .optional()
        .describe('KV namespace ID (required for key operations)'),
      namespaceName: z.string().optional().describe('Name/title for creating a namespace'),
      key: z.string().optional().describe('Key name for get/put/delete operations'),
      value: z.string().optional().describe('Value to store for put operation'),
      prefix: z.string().optional().describe('Key prefix filter for list_keys'),
      limit: z.number().optional().describe('Maximum number of keys to return')
    })
  )
  .output(
    z.object({
      namespaces: z
        .array(
          z.object({
            namespaceId: z.string(),
            title: z.string()
          })
        )
        .optional(),
      createdNamespace: z
        .object({
          namespaceId: z.string(),
          title: z.string()
        })
        .optional(),
      namespace: z
        .object({
          namespaceId: z.string(),
          title: z.string()
        })
        .optional(),
      keys: z
        .array(
          z.object({
            name: z.string(),
            expiration: z.number().optional(),
            metadata: z.any().optional()
          })
        )
        .optional(),
      value: z.string().optional(),
      deleted: z.boolean().optional(),
      success: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let accountId = ctx.input.accountId || ctx.config.accountId;
    if (!accountId) throw cloudflareServiceError('accountId is required');

    let client = new Client(ctx.auth);
    let { action } = ctx.input;

    if (action === 'list_namespaces') {
      let response = await client.listKvNamespaces(accountId);
      let namespaces = response.result.map((ns: any) => ({
        namespaceId: ns.id,
        title: ns.title
      }));
      return {
        output: { namespaces },
        message: `Found **${namespaces.length}** KV namespace(s).`
      };
    }

    if (action === 'create_namespace') {
      if (!ctx.input.namespaceName) throw cloudflareServiceError('namespaceName is required');
      let response = await client.createKvNamespace(accountId, ctx.input.namespaceName);
      return {
        output: {
          createdNamespace: {
            namespaceId: response.result.id,
            title: ctx.input.namespaceName
          }
        },
        message: `Created KV namespace **${ctx.input.namespaceName}**.`
      };
    }

    if (action === 'get_namespace') {
      if (!ctx.input.namespaceId) throw cloudflareServiceError('namespaceId is required');
      let response = await client.getKvNamespace(accountId, ctx.input.namespaceId);
      return {
        output: {
          namespace: {
            namespaceId: response.result.id,
            title: response.result.title
          }
        },
        message: `KV namespace **${response.result.title}**.`
      };
    }

    if (action === 'rename_namespace') {
      if (!ctx.input.namespaceId) throw cloudflareServiceError('namespaceId is required');
      if (!ctx.input.namespaceName) throw cloudflareServiceError('namespaceName is required');
      let response = await client.renameKvNamespace(
        accountId,
        ctx.input.namespaceId,
        ctx.input.namespaceName
      );
      return {
        output: {
          namespace: {
            namespaceId: response.result.id,
            title: response.result.title
          }
        },
        message: `Renamed KV namespace to **${response.result.title}**.`
      };
    }

    if (action === 'delete_namespace') {
      if (!ctx.input.namespaceId) throw cloudflareServiceError('namespaceId is required');
      await client.deleteKvNamespace(accountId, ctx.input.namespaceId);
      return {
        output: { deleted: true },
        message: `Deleted KV namespace \`${ctx.input.namespaceId}\`.`
      };
    }

    if (action === 'list_keys') {
      if (!ctx.input.namespaceId) throw cloudflareServiceError('namespaceId is required');
      let response = await client.listKvKeys(accountId, ctx.input.namespaceId, {
        prefix: ctx.input.prefix,
        limit: ctx.input.limit
      });
      let keys = response.result.map((k: any) => ({
        name: k.name,
        expiration: k.expiration,
        metadata: k.metadata
      }));
      return {
        output: { keys },
        message: `Found **${keys.length}** key(s) in namespace.`
      };
    }

    if (action === 'get_value') {
      if (!ctx.input.namespaceId || !ctx.input.key) {
        throw cloudflareServiceError('namespaceId and key are required');
      }
      let value = await client.getKvValue(accountId, ctx.input.namespaceId, ctx.input.key);
      let strValue = typeof value === 'string' ? value : JSON.stringify(value);
      return {
        output: { value: strValue },
        message: `Retrieved value for key \`${ctx.input.key}\`.`
      };
    }

    if (action === 'put_value') {
      if (!ctx.input.namespaceId || !ctx.input.key || ctx.input.value === undefined) {
        throw cloudflareServiceError('namespaceId, key, and value are required');
      }
      await client.putKvValue(
        accountId,
        ctx.input.namespaceId,
        ctx.input.key,
        ctx.input.value
      );
      return {
        output: { success: true },
        message: `Stored value for key \`${ctx.input.key}\`.`
      };
    }

    if (action === 'delete_key') {
      if (!ctx.input.namespaceId || !ctx.input.key) {
        throw cloudflareServiceError('namespaceId and key are required');
      }
      await client.deleteKvKey(accountId, ctx.input.namespaceId, ctx.input.key);
      return {
        output: { deleted: true },
        message: `Deleted key \`${ctx.input.key}\`.`
      };
    }

    throw cloudflareServiceError(`Unknown action: ${action}`);
  })
  .build();
