import { SlateTool } from 'slates';
import { z } from 'zod';
import { ApifyClient } from '../lib/client';
import { spec } from '../spec';

export let manageKeyValueStore = SlateTool.create(spec, {
  name: 'Manage Key-Value Store',
  key: 'manage_key_value_store',
  description: `Interact with Apify Key-Value Stores: list stores, list keys, get a record, set a record, or delete a record. Key-value stores hold arbitrary data (JSON, HTML, images, etc.) identified by string keys.`,
  instructions: [
    'Use action "list_stores" to list all key-value stores.',
    'Use action "list_keys" with storeId to list keys in a store.',
    'Use action "get" with storeId and recordKey to retrieve a record.',
    'Use action "set" with storeId, recordKey, and recordValue to create or update a record.',
    'Use action "delete" with storeId and recordKey to delete a record.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list_stores', 'list_keys', 'get', 'set', 'delete'])
        .describe('Action to perform'),
      storeId: z
        .string()
        .optional()
        .describe('Key-value store ID (required for list_keys, get, set, delete)'),
      recordKey: z.string().optional().describe('Record key (required for get, set, delete)'),
      recordValue: z.any().optional().describe('Value to store (required for set)'),
      contentType: z
        .string()
        .optional()
        .describe('MIME content type for the record (for set, defaults to application/json)'),
      limit: z.number().optional().default(25).describe('Max items for list operations'),
      offset: z.number().optional().default(0).describe('Pagination offset for list_stores'),
      exclusiveStartKey: z.string().optional().describe('Pagination cursor for list_keys')
    })
  )
  .output(
    z.object({
      stores: z
        .array(
          z.object({
            storeId: z.string().describe('Store ID'),
            name: z.string().optional().describe('Store name'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .optional()
        .describe('List of key-value stores'),
      total: z.number().optional().describe('Total stores count'),
      keys: z
        .array(
          z.object({
            key: z.string().describe('Record key'),
            size: z.number().describe('Record size in bytes')
          })
        )
        .optional()
        .describe('List of keys in the store'),
      isTruncated: z.boolean().optional().describe('Whether the key list is truncated'),
      nextExclusiveStartKey: z.string().optional().describe('Cursor for next page of keys'),
      recordKey: z.string().optional().describe('Retrieved/set/deleted record key'),
      recordValue: z.any().optional().describe('Record value (for get)'),
      deleted: z.boolean().optional().describe('Whether the record was deleted'),
      saved: z.boolean().optional().describe('Whether the record was saved')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ApifyClient({ token: ctx.auth.token });

    if (ctx.input.action === 'list_stores') {
      let result = await client.listKeyValueStores({
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });

      let stores = result.items.map(item => ({
        storeId: item.id,
        name: item.name,
        createdAt: item.createdAt
      }));

      return {
        output: { stores, total: result.total },
        message: `Found **${result.total}** key-value store(s), showing **${stores.length}**.`
      };
    }

    if (ctx.input.action === 'list_keys') {
      let result = await client.listKeyValueStoreKeys(ctx.input.storeId!, {
        limit: ctx.input.limit,
        exclusiveStartKey: ctx.input.exclusiveStartKey
      });

      return {
        output: {
          keys: result.items,
          isTruncated: result.isTruncated,
          nextExclusiveStartKey: result.nextExclusiveStartKey
        },
        message: `Found **${result.items.length}** key(s) in store \`${ctx.input.storeId}\`${result.isTruncated ? ' (more available)' : ''}.`
      };
    }

    if (ctx.input.action === 'get') {
      let value = await client.getKeyValueStoreRecord(
        ctx.input.storeId!,
        ctx.input.recordKey!
      );
      return {
        output: {
          recordKey: ctx.input.recordKey,
          recordValue: value
        },
        message: `Retrieved record \`${ctx.input.recordKey}\` from store \`${ctx.input.storeId}\`.`
      };
    }

    if (ctx.input.action === 'set') {
      await client.setKeyValueStoreRecord(
        ctx.input.storeId!,
        ctx.input.recordKey!,
        ctx.input.recordValue,
        ctx.input.contentType
      );
      return {
        output: {
          recordKey: ctx.input.recordKey,
          saved: true
        },
        message: `Saved record \`${ctx.input.recordKey}\` to store \`${ctx.input.storeId}\`.`
      };
    }

    // delete
    await client.deleteKeyValueStoreRecord(ctx.input.storeId!, ctx.input.recordKey!);
    return {
      output: {
        recordKey: ctx.input.recordKey,
        deleted: true
      },
      message: `Deleted record \`${ctx.input.recordKey}\` from store \`${ctx.input.storeId}\`.`
    };
  })
  .build();
