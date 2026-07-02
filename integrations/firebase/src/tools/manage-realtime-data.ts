import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { RealtimeDbClient } from '../lib/client';
import { firebaseServiceError, missingRequiredFieldError } from '../lib/errors';
import { firebaseActionScopes } from '../scopes';
import { spec } from '../spec';

export let manageRealtimeData = SlateTool.create(spec, {
  name: 'Manage Realtime Database',
  key: 'manage_realtime_data',
  description: `Read, write, push, update, or delete data at any path in the Firebase Realtime Database. Supports querying with ordering, filtering, and pagination.
Requires the **databaseUrl** to be configured in the project settings.`,
  instructions: [
    '"get" reads data at the path. Use query parameters for ordering/filtering.',
    '"set" replaces data at the path entirely.',
    '"push" appends a new child with an auto-generated key.',
    '"update" merges data into the existing path (does not replace siblings).',
    '"delete" removes data at the path.'
  ],
  constraints: ['Requires databaseUrl to be set in the project configuration.'],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .scopes(firebaseActionScopes.manageRealtimeData)
  .input(
    z.object({
      operation: z
        .enum(['get', 'set', 'push', 'update', 'delete'])
        .describe('Operation to perform'),
      path: z.string().describe('Database path, e.g. "users/abc" or "messages"'),
      data: z
        .any()
        .optional()
        .describe('Data payload. Required for set, push, and update operations.'),
      query: z
        .object({
          orderBy: z
            .string()
            .optional()
            .describe(
              'Child key, value, or priority to order by. Use "$key", "$value", or a field name.'
            ),
          startAt: z
            .union([z.string(), z.number()])
            .optional()
            .describe('Start value for range query'),
          endAt: z
            .union([z.string(), z.number()])
            .optional()
            .describe('End value for range query'),
          equalTo: z
            .union([z.string(), z.number(), z.boolean()])
            .optional()
            .describe('Exact match filter'),
          limitToFirst: z.number().optional().describe('Return only the first N results'),
          limitToLast: z.number().optional().describe('Return only the last N results'),
          shallow: z
            .boolean()
            .optional()
            .describe('Return only keys (no nested data). Useful for large datasets.')
        })
        .optional()
        .describe('Query parameters for get operations')
    })
  )
  .output(
    z.object({
      data: z.any().optional().describe('Retrieved or written data'),
      generatedKey: z.string().optional().describe('Auto-generated key from push operation'),
      deleted: z.boolean().optional().describe('Whether the data was deleted')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.config.databaseUrl) {
      throw firebaseServiceError(
        'databaseUrl must be configured in project settings for Realtime Database operations'
      );
    }

    let client = new RealtimeDbClient({
      token: ctx.auth.token,
      databaseUrl: ctx.config.databaseUrl
    });

    let { operation, path, data, query } = ctx.input;

    if (operation === 'get') {
      let result = await client.getData(path, query);
      return {
        output: { data: result },
        message: `Retrieved data from \`${path}\`.`
      };
    }

    if (operation === 'set') {
      if (data === undefined) throw missingRequiredFieldError('data', 'set');
      let result = await client.setData(path, data);
      return {
        output: { data: result },
        message: `Set data at \`${path}\`.`
      };
    }

    if (operation === 'push') {
      if (data === undefined) throw missingRequiredFieldError('data', 'push');
      let result = await client.pushData(path, data);
      return {
        output: { generatedKey: result.generatedKey },
        message: `Pushed new child to \`${path}\` with key **${result.generatedKey}**.`
      };
    }

    if (operation === 'update') {
      if (data === undefined) throw missingRequiredFieldError('data', 'update');
      let result = await client.updateData(path, data);
      return {
        output: { data: result },
        message: `Updated data at \`${path}\`.`
      };
    }

    if (operation === 'delete') {
      await client.deleteData(path);
      return {
        output: { deleted: true },
        message: `Deleted data at \`${path}\`.`
      };
    }

    throw firebaseServiceError(`Unknown operation: ${operation}`);
  })
  .build();
