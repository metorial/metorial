import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageDatabaseValues = SlateTool.create(spec, {
  name: 'Manage Database Values',
  key: 'manage_database_values',
  description: `Add, update, or delete barcode values in a CodeREADr database. Supports single value operations as well as bulk upsert of up to 100 values at once. Use "add" for new values, "upsert" to insert or update, "edit" to modify metadata of existing values, or "delete" to remove values.`,
  instructions: [
    'Barcode values must be 100 characters or less.',
    'For bulk operations, use "upsert" with the "values" array (max 100 per request).',
    'For single value operations, provide "value" directly.'
  ],
  constraints: [
    'Maximum 100 values per bulk upsert request.',
    'Individual barcode values must be 100 characters or less.'
  ]
})
  .input(
    z.object({
      databaseId: z.string().describe('ID of the target database'),
      operation: z
        .enum(['add', 'upsert', 'edit', 'delete'])
        .describe('Operation to perform on the value(s)'),
      value: z
        .string()
        .optional()
        .describe('Barcode value for single operations (max 100 chars)'),
      response: z
        .string()
        .optional()
        .describe('Response text displayed when scanned (for add/upsert/edit)'),
      validity: z
        .enum(['0', '1'])
        .optional()
        .describe('Validity status: "1" for valid, "0" for invalid'),
      values: z
        .array(
          z.object({
            value: z.string().describe('Barcode value'),
            databaseId: z.string().optional().describe('Override database ID for this value'),
            response: z.string().optional().describe('Response text'),
            validity: z.enum(['0', '1']).optional().describe('Validity status')
          })
        )
        .optional()
        .describe(
          'Array of values for bulk upsert (max 100). Only used with "upsert" operation.'
        )
    })
  )
  .output(
    z.object({
      databaseId: z.string().describe('ID of the affected database'),
      operation: z.string().describe('Operation performed'),
      valuesProcessed: z.number().describe('Number of values processed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { operation, databaseId, value, response, validity, values } = ctx.input;

    if (operation === 'upsert' && values && values.length > 0) {
      await client.upsertMultiValues(databaseId, values);
      return {
        output: { databaseId, operation, valuesProcessed: values.length },
        message: `Upserted **${values.length}** value(s) in database **${databaseId}**.`
      };
    }

    if (!value) {
      throw new Error('A "value" is required for single-value operations.');
    }

    if (operation === 'add') {
      await client.addDatabaseValue(databaseId, value, response, validity);
    } else if (operation === 'upsert') {
      await client.upsertDatabaseValue(databaseId, value, response, validity);
    } else if (operation === 'edit') {
      await client.editDatabaseValue(databaseId, value, response, validity);
    } else if (operation === 'delete') {
      await client.deleteDatabaseValue(databaseId, value);
    }

    return {
      output: { databaseId, operation, valuesProcessed: 1 },
      message: `${operation === 'add' ? 'Added' : operation === 'upsert' ? 'Upserted' : operation === 'edit' ? 'Edited' : 'Deleted'} value **${value}** in database **${databaseId}**.`
    };
  })
  .build();
