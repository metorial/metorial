import { createBase64Attachment, createTextAttachment, SlateTool } from 'slates';
import { z } from 'zod';
import { ApifyClient } from '../lib/client';
import { apifyValidationError } from '../lib/errors';
import { spec } from '../spec';
import {
  ensureAtLeastOne,
  mapKeyValueStore,
  paginationInput,
  pickDefined,
  requireOneOf,
  requireString
} from './shared';

let isTextContentType = (contentType: string) =>
  contentType.startsWith('text/') ||
  ['application/xml', 'application/rss+xml', 'application/xhtml+xml'].includes(contentType);

export let manageKeyValueStore = SlateTool.create(spec, {
  name: 'Manage Key-Value Store',
  key: 'manage_key_value_store',
  description: `Manage Apify key-value stores and records. JSON records are returned inline; text and binary records are returned as Slate attachments.`,
  instructions: [
    'Use store actions for key-value store CRUD.',
    'Use list_keys to inspect record keys in a store.',
    'Use get_record for JSON inline values or file attachments for text/binary values.',
    'Use set_record with exactly one of recordValue, recordText, or recordValueBase64.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'list_stores',
          'get_store',
          'create_store',
          'update_store',
          'delete_store',
          'list_keys',
          'get_record',
          'set_record',
          'delete_record'
        ])
        .describe('Action to perform'),
      storeId: z.string().optional().describe('Key-value store ID for store-specific actions'),
      name: z.string().optional().describe('Store name for create/update'),
      recordKey: z.string().optional().describe('Record key for record actions'),
      recordValue: z
        .any()
        .optional()
        .describe('JSON value to store for set_record; mutually exclusive with text/base64'),
      recordText: z
        .string()
        .optional()
        .describe('Text value to store for set_record; mutually exclusive with JSON/base64'),
      recordValueBase64: z
        .string()
        .optional()
        .describe('Base64 binary value to store for set_record'),
      contentType: z
        .string()
        .optional()
        .describe('MIME content type for set_record; defaults from the value type'),
      exclusiveStartKey: z.string().optional().describe('Pagination cursor for list_keys'),
      ...paginationInput
    })
  )
  .output(
    z.object({
      storeId: z.string().optional().describe('Store ID'),
      name: z.string().optional().describe('Store name'),
      createdAt: z.string().optional(),
      modifiedAt: z.string().optional(),
      accessedAt: z.string().optional(),
      stores: z.array(z.record(z.string(), z.any())).optional().describe('Store list'),
      total: z.number().optional().describe('Total stores count'),
      keys: z
        .array(
          z.object({
            key: z.string().describe('Record key'),
            size: z.number().describe('Record size in bytes')
          })
        )
        .optional(),
      isTruncated: z.boolean().optional(),
      nextExclusiveStartKey: z.string().optional(),
      recordKey: z.string().optional().describe('Record key'),
      recordValue: z.any().optional().describe('JSON record value for JSON records only'),
      mimeType: z.string().optional().describe('Record attachment MIME type'),
      byteLength: z.number().optional().describe('Record byte length'),
      attachmentCount: z.number().optional().describe('Number of Slate attachments returned'),
      saved: z.boolean().optional().describe('Whether the record was saved'),
      deleted: z.boolean().optional().describe('Whether the store/record was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ApifyClient({ token: ctx.auth.token });

    if (ctx.input.action === 'list_stores') {
      let result = await client.listKeyValueStores({
        limit: ctx.input.limit,
        offset: ctx.input.offset,
        desc: ctx.input.descending
      });
      let stores = result.items.map(mapKeyValueStore);
      return {
        output: { stores, total: result.total },
        message: `Found **${result.total}** key-value store(s), showing **${stores.length}**.`
      };
    }

    if (ctx.input.action === 'get_store') {
      let storeId = requireString(ctx.input.storeId, 'storeId', 'get_store');
      let store = await client.getKeyValueStore(storeId);
      return {
        output: mapKeyValueStore(store),
        message: `Retrieved key-value store \`${store.id ?? storeId}\`.`
      };
    }

    if (ctx.input.action === 'create_store') {
      let store = await client.createKeyValueStore({ name: ctx.input.name });
      return {
        output: mapKeyValueStore(store),
        message: `Created key-value store \`${store.id}\`.`
      };
    }

    if (ctx.input.action === 'update_store') {
      let storeId = requireString(ctx.input.storeId, 'storeId', 'update_store');
      let body = pickDefined({ name: ctx.input.name });
      ensureAtLeastOne(body, 'update the key-value store');
      let store = await client.updateKeyValueStore(storeId, body);
      return {
        output: mapKeyValueStore(store),
        message: `Updated key-value store \`${store.id ?? storeId}\`.`
      };
    }

    if (ctx.input.action === 'delete_store') {
      let storeId = requireString(ctx.input.storeId, 'storeId', 'delete_store');
      await client.deleteKeyValueStore(storeId);
      return {
        output: { storeId, deleted: true },
        message: `Deleted key-value store \`${storeId}\`.`
      };
    }

    if (ctx.input.action === 'list_keys') {
      let storeId = requireString(ctx.input.storeId, 'storeId', 'list_keys');
      let result = await client.listKeyValueStoreKeys(storeId, {
        limit: ctx.input.limit,
        exclusiveStartKey: ctx.input.exclusiveStartKey
      });

      return {
        output: {
          storeId,
          keys: result.items,
          isTruncated: result.isTruncated,
          nextExclusiveStartKey: result.nextExclusiveStartKey
        },
        message: `Found **${result.items.length}** key(s) in store \`${storeId}\`${result.isTruncated ? ' (more available)' : ''}.`
      };
    }

    if (ctx.input.action === 'get_record') {
      let storeId = requireString(ctx.input.storeId, 'storeId', 'get_record');
      let recordKey = requireString(ctx.input.recordKey, 'recordKey', 'get_record');
      let record = await client.getKeyValueStoreRecord(storeId, recordKey);

      if (record.isJson) {
        return {
          output: {
            storeId,
            recordKey,
            recordValue: record.jsonValue,
            mimeType: record.contentType,
            byteLength: record.byteLength,
            attachmentCount: 0
          },
          message: `Retrieved JSON record \`${recordKey}\` from store \`${storeId}\`.`
        };
      }

      let attachment = isTextContentType(record.contentType)
        ? createTextAttachment(record.contentText ?? '', record.contentType)
        : createBase64Attachment(record.contentBase64, record.contentType);

      return {
        output: {
          storeId,
          recordKey,
          mimeType: record.contentType,
          byteLength: record.byteLength,
          attachmentCount: 1
        },
        attachments: [attachment],
        message: `Retrieved record \`${recordKey}\` from store \`${storeId}\` as an attachment.`
      };
    }

    if (ctx.input.action === 'set_record') {
      let storeId = requireString(ctx.input.storeId, 'storeId', 'set_record');
      let recordKey = requireString(ctx.input.recordKey, 'recordKey', 'set_record');
      let source = requireOneOf(
        [
          { field: 'recordValue', value: ctx.input.recordValue },
          { field: 'recordText', value: ctx.input.recordText },
          { field: 'recordValueBase64', value: ctx.input.recordValueBase64 }
        ],
        'Provide exactly one of recordValue, recordText, or recordValueBase64 for set_record.'
      );

      let value: unknown;
      let contentType = ctx.input.contentType;
      if (source === 'recordValue') {
        value = ctx.input.recordValue;
        contentType ??= 'application/json';
      } else if (source === 'recordText') {
        value = ctx.input.recordText;
        contentType ??= 'text/plain';
      } else {
        try {
          value = Buffer.from(ctx.input.recordValueBase64 ?? '', 'base64');
        } catch {
          throw apifyValidationError('recordValueBase64 must contain valid base64 data.');
        }
        contentType ??= 'application/octet-stream';
      }

      await client.setKeyValueStoreRecord({
        storeId,
        recordKey,
        value,
        contentType
      });

      return {
        output: { storeId, recordKey, saved: true, mimeType: contentType },
        message: `Saved record \`${recordKey}\` to store \`${storeId}\`.`
      };
    }

    let storeId = requireString(ctx.input.storeId, 'storeId', 'delete_record');
    let recordKey = requireString(ctx.input.recordKey, 'recordKey', 'delete_record');
    await client.deleteKeyValueStoreRecord(storeId, recordKey);
    return {
      output: {
        storeId,
        recordKey,
        deleted: true
      },
      message: `Deleted record \`${recordKey}\` from store \`${storeId}\`.`
    };
  })
  .build();
