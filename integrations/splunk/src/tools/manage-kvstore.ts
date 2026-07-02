import { SlateTool } from 'slates';
import { z } from 'zod';
import { splunkServiceError } from '../lib/errors';
import { createSplunkClient } from '../lib/helpers';
import { spec } from '../spec';

export let listKVStoreCollections = SlateTool.create(spec, {
  name: 'List KV Store Collections',
  key: 'list_kvstore_collections',
  description: `List all KV Store collections within a given Splunk app. Returns collection names, field definitions, and ownership info.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      app: z.string().describe('Splunk app context (e.g. "search")'),
      owner: z.string().optional().describe('Owner username (default: "nobody")')
    })
  )
  .output(
    z.object({
      collections: z.array(
        z.object({
          name: z.string().optional(),
          app: z.string().optional(),
          owner: z.string().optional(),
          fields: z.record(z.string(), z.any()).optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = createSplunkClient(ctx);
    let response = await client.listKVStoreCollections({
      app: ctx.input.app,
      owner: ctx.input.owner
    });

    return {
      output: response,
      message: `Found **${response.collections.length}** KV Store collection(s) in app **${ctx.input.app}**.`
    };
  })
  .build();

export let createKVStoreCollection = SlateTool.create(spec, {
  name: 'Create KV Store Collection',
  key: 'create_kvstore_collection',
  description: `Create a new KV Store collection in a Splunk app. The collection serves as a key-value data store for app state and data.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      app: z.string().describe('Splunk app context'),
      collectionName: z.string().describe('Name for the new collection'),
      owner: z.string().optional().describe('Owner username (default: "nobody")')
    })
  )
  .output(
    z.object({
      collectionName: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = createSplunkClient(ctx);
    await client.createKVStoreCollection({
      app: ctx.input.app,
      name: ctx.input.collectionName,
      owner: ctx.input.owner
    });

    return {
      output: { collectionName: ctx.input.collectionName },
      message: `KV Store collection **${ctx.input.collectionName}** created in app **${ctx.input.app}**.`
    };
  })
  .build();

export let deleteKVStoreCollection = SlateTool.create(spec, {
  name: 'Delete KV Store Collection',
  key: 'delete_kvstore_collection',
  description: `Delete an entire KV Store collection and all its records from a Splunk app.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      app: z.string().describe('Splunk app context'),
      collectionName: z.string().describe('Name of the collection to delete'),
      owner: z.string().optional().describe('Owner username (default: "nobody")')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = createSplunkClient(ctx);
    await client.deleteKVStoreCollection({
      app: ctx.input.app,
      collectionName: ctx.input.collectionName,
      owner: ctx.input.owner
    });

    return {
      output: { deleted: true },
      message: `KV Store collection **${ctx.input.collectionName}** deleted from app **${ctx.input.app}**.`
    };
  })
  .build();

export let queryKVStoreRecords = SlateTool.create(spec, {
  name: 'Query KV Store Records',
  key: 'query_kvstore_records',
  description: `Query records from a KV Store collection. Supports MongoDB-style query syntax for filtering, field projection, sorting, and pagination.`,
  instructions: [
    'Query uses MongoDB-like syntax, e.g. {"status": "active"} or {"count": {"$gt": 10}}.',
    'Sort format is a comma-separated list of fields with optional minus prefix for descending: "name,-timestamp".',
    'Fields format is a comma-separated list of field names to include in the response.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      app: z.string().describe('Splunk app context'),
      collectionName: z.string().describe('Collection name to query'),
      query: z
        .string()
        .optional()
        .describe('MongoDB-style query JSON string (e.g. {"status": "active"})'),
      sort: z.string().optional().describe('Sort fields (e.g. "name,-timestamp")'),
      fields: z.string().optional().describe('Comma-separated field names to return'),
      limit: z.number().optional().describe('Maximum number of records to return'),
      skip: z.number().optional().describe('Number of records to skip (pagination)'),
      owner: z.string().optional().describe('Owner username (default: "nobody")')
    })
  )
  .output(
    z.object({
      records: z.array(z.record(z.string(), z.any())),
      recordCount: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = createSplunkClient(ctx);
    let records = await client.getKVStoreRecords({
      app: ctx.input.app,
      collectionName: ctx.input.collectionName,
      query: ctx.input.query,
      sort: ctx.input.sort,
      fields: ctx.input.fields,
      limit: ctx.input.limit,
      skip: ctx.input.skip,
      owner: ctx.input.owner
    });

    return {
      output: {
        records,
        recordCount: records.length
      },
      message: `Returned **${records.length}** record(s) from collection **${ctx.input.collectionName}**.`
    };
  })
  .build();

export let upsertKVStoreRecord = SlateTool.create(spec, {
  name: 'Upsert KV Store Record',
  key: 'upsert_kvstore_record',
  description: `Insert a new record or update an existing record in a KV Store collection. To update, provide the record's \`_key\`. All updates are wholesale replacements - the entire record is overwritten.`,
  instructions: [
    'If recordKey is provided, the existing record with that _key will be wholly replaced.',
    'If recordKey is omitted, a new record is created and a _key is auto-generated.',
    'Partial updates are not supported - always provide the complete record.'
  ],
  tags: { destructive: false }
})
  .input(
    z.object({
      app: z.string().describe('Splunk app context'),
      collectionName: z.string().describe('Collection name'),
      record: z.record(z.string(), z.any()).describe('Record data as key-value pairs'),
      recordKey: z
        .string()
        .optional()
        .describe('Existing record _key for update (omit to insert new)'),
      owner: z.string().optional().describe('Owner username (default: "nobody")')
    })
  )
  .output(
    z.object({
      record: z.record(z.string(), z.any()).describe('The inserted/updated record response')
    })
  )
  .handleInvocation(async ctx => {
    let client = createSplunkClient(ctx);

    let result: Record<string, any>;
    if (ctx.input.recordKey) {
      result = await client.updateKVStoreRecord({
        app: ctx.input.app,
        collectionName: ctx.input.collectionName,
        recordKey: ctx.input.recordKey,
        record: ctx.input.record,
        owner: ctx.input.owner
      });
    } else {
      result = await client.insertKVStoreRecord({
        app: ctx.input.app,
        collectionName: ctx.input.collectionName,
        record: ctx.input.record,
        owner: ctx.input.owner
      });
    }

    return {
      output: { record: result },
      message: ctx.input.recordKey
        ? `Record **${ctx.input.recordKey}** updated in collection **${ctx.input.collectionName}**.`
        : `New record inserted into collection **${ctx.input.collectionName}**.`
    };
  })
  .build();

export let deleteKVStoreRecords = SlateTool.create(spec, {
  name: 'Delete KV Store Records',
  key: 'delete_kvstore_records',
  description: `Delete one or more records from a KV Store collection. Delete a single record by key, or delete multiple records matching a MongoDB-style query.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      app: z.string().describe('Splunk app context'),
      collectionName: z.string().describe('Collection name'),
      recordKey: z.string().optional().describe('Specific record _key to delete'),
      query: z
        .string()
        .optional()
        .describe('MongoDB-style query to match records for deletion'),
      owner: z.string().optional().describe('Owner username (default: "nobody")')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = createSplunkClient(ctx);

    if (ctx.input.recordKey) {
      await client.deleteKVStoreRecord({
        app: ctx.input.app,
        collectionName: ctx.input.collectionName,
        recordKey: ctx.input.recordKey,
        owner: ctx.input.owner
      });
      return {
        output: { deleted: true },
        message: `Record **${ctx.input.recordKey}** deleted from collection **${ctx.input.collectionName}**.`
      };
    } else if (ctx.input.query) {
      await client.deleteKVStoreRecordsByQuery({
        app: ctx.input.app,
        collectionName: ctx.input.collectionName,
        query: ctx.input.query,
        owner: ctx.input.owner
      });
      return {
        output: { deleted: true },
        message: `Records matching query deleted from collection **${ctx.input.collectionName}**.`
      };
    }

    throw splunkServiceError('Either recordKey or query must be provided to delete records.');
  })
  .build();
