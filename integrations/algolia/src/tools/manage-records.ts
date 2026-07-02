import { SlateTool } from 'slates';
import { z } from 'zod';
import { AlgoliaClient } from '../lib/client';
import { spec } from '../spec';

export let manageRecords = SlateTool.create(spec, {
  name: 'Manage Records',
  key: 'manage_records',
  description: `Create, read, update, partially update, or delete records (objects) in an Algolia index. Also supports batch operations, clearing all records, and deleting records by filter criteria.`,
  instructions: [
    'Set **action** to one of: "get", "add", "update", "partialUpdate", "delete", "batch", "clear", or "deleteBy".',
    'For "get", "update", "partialUpdate", and "delete", provide **objectId** identifying the record.',
    'For "add", "update", and "partialUpdate", provide the record data in **record**.',
    'For "partialUpdate", optionally set **createIfNotExists** to false to prevent creating a new record if the objectId does not exist.',
    'For "batch", provide an array of operations in **batchRequests** — each with an "action" (e.g., "addObject", "updateObject", "deleteObject", "partialUpdateObject", "partialUpdateObjectNoCreate") and a "body".',
    'For "deleteBy", provide filter parameters in **deleteByFilters** (e.g., { "filters": "category:electronics", "numericFilters": ["price > 100"] }).',
    'For "get", optionally provide **attributesToRetrieve** to limit which attributes are returned.'
  ],
  constraints: [
    'Batch requests are limited to 1,000 operations per call.',
    'The "clear" action removes ALL records from the index and cannot be undone.',
    'The "deleteBy" action is irreversible — ensure filters are correct before use.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'get',
          'add',
          'update',
          'partialUpdate',
          'delete',
          'batch',
          'clear',
          'deleteBy'
        ])
        .describe('The record operation to perform.'),
      indexName: z.string().describe('Name of the Algolia index to operate on.'),
      objectId: z
        .string()
        .optional()
        .describe(
          'The objectID of the record (required for get, update, partialUpdate, delete).'
        ),
      record: z
        .record(z.string(), z.any())
        .optional()
        .describe('Record data as key-value pairs (for add, update, partialUpdate).'),
      attributesToRetrieve: z
        .array(z.string())
        .optional()
        .describe(
          'List of attributes to retrieve (for get). If omitted, all attributes are returned.'
        ),
      createIfNotExists: z
        .boolean()
        .optional()
        .describe(
          'Whether to create the record if it does not exist (for partialUpdate). Defaults to true.'
        ),
      batchRequests: z
        .array(
          z.object({
            action: z
              .string()
              .describe(
                'Batch action type (e.g., "addObject", "updateObject", "deleteObject", "partialUpdateObject", "partialUpdateObjectNoCreate").'
              ),
            body: z
              .record(z.string(), z.any())
              .describe('Record data for this batch operation.')
          })
        )
        .optional()
        .describe('Array of batch operations (for batch action).'),
      deleteByFilters: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Filter parameters for deleteBy (e.g., { "filters": "category:books", "numericFilters": ["price < 10"] }).'
        )
    })
  )
  .output(z.any())
  .handleInvocation(async ctx => {
    let client = new AlgoliaClient({
      applicationId: ctx.auth.applicationId,
      token: ctx.auth.token,
      analyticsRegion: ctx.config.analyticsRegion
    });

    let { action, indexName } = ctx.input;

    if (action === 'get') {
      if (!ctx.input.objectId) {
        throw new Error('objectId is required for the "get" action.');
      }

      let result = await client.getRecord(
        indexName,
        ctx.input.objectId,
        ctx.input.attributesToRetrieve
      );

      return {
        output: result,
        message: `Retrieved record **${ctx.input.objectId}** from index "${indexName}".`
      };
    }

    if (action === 'add') {
      if (!ctx.input.record) {
        throw new Error('record is required for the "add" action.');
      }

      let result = await client.addRecord(indexName, ctx.input.record);

      return {
        output: result,
        message: `Added a new record to index "${indexName}" (taskID: ${result.taskID}).`
      };
    }

    if (action === 'update') {
      if (!ctx.input.objectId) {
        throw new Error('objectId is required for the "update" action.');
      }
      if (!ctx.input.record) {
        throw new Error('record is required for the "update" action.');
      }

      let result = await client.updateRecord(indexName, ctx.input.objectId, ctx.input.record);

      return {
        output: result,
        message: `Updated record **${ctx.input.objectId}** in index "${indexName}" (taskID: ${result.taskID}).`
      };
    }

    if (action === 'partialUpdate') {
      if (!ctx.input.objectId) {
        throw new Error('objectId is required for the "partialUpdate" action.');
      }
      if (!ctx.input.record) {
        throw new Error('record is required for the "partialUpdate" action.');
      }

      let result = await client.partialUpdateRecord(
        indexName,
        ctx.input.objectId,
        ctx.input.record,
        ctx.input.createIfNotExists
      );

      return {
        output: result,
        message: `Partially updated record **${ctx.input.objectId}** in index "${indexName}" (taskID: ${result.taskID}).`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.objectId) {
        throw new Error('objectId is required for the "delete" action.');
      }

      let result = await client.deleteRecord(indexName, ctx.input.objectId);

      return {
        output: result,
        message: `Deleted record **${ctx.input.objectId}** from index "${indexName}" (taskID: ${result.taskID}).`
      };
    }

    if (action === 'batch') {
      if (!ctx.input.batchRequests || ctx.input.batchRequests.length === 0) {
        throw new Error(
          'batchRequests is required and must not be empty for the "batch" action.'
        );
      }

      let result = await client.batch(indexName, ctx.input.batchRequests);

      return {
        output: result,
        message: `Executed batch of **${ctx.input.batchRequests.length}** operation(s) on index "${indexName}" (taskID: ${result.taskID}).`
      };
    }

    if (action === 'clear') {
      let result = await client.clearRecords(indexName);

      return {
        output: result,
        message: `Cleared all records from index "${indexName}" (taskID: ${result.taskID}).`
      };
    }

    // deleteBy
    if (!ctx.input.deleteByFilters) {
      throw new Error('deleteByFilters is required for the "deleteBy" action.');
    }

    let result = await client.deleteBy(indexName, ctx.input.deleteByFilters);

    return {
      output: result,
      message: `Deleted records matching filters from index "${indexName}" (taskID: ${result.taskID}).`
    };
  })
  .build();
