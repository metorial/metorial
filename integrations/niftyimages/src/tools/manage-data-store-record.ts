import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageDataStoreRecord = SlateTool.create(spec, {
  name: 'Manage Data Store Record',
  key: 'manage_data_store_record',
  description: `Add or delete records in a NiftyImages Data Store. Data Stores allow you to display real-time, evergreen content (text, images, links) in personalized email images.
Use this to update offers, products, or content in emails that have already been sent.
Requires the **Data Store API Key** (found under Data Sources > choose a Data Store > "Use Our API").`,
  instructions: [
    'The Data Store API Key is different from your account API Key. Find it by going to Data Sources, choosing a Data Store, and clicking "Use Our API".',
    'When adding a record, provide field names and values as key-value pairs in the "fields" parameter.',
    'To delete, provide either a recordId or matchCriteria (field name/value pairs to match against).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      dataStoreApiKey: z
        .string()
        .describe(
          'The API Key for the specific Data Store (found under Data Sources > Data Store > "Use Our API").'
        ),
      action: z
        .enum(['add', 'delete_by_id', 'delete_by_match'])
        .describe('The action to perform on the Data Store.'),
      fields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Key-value pairs of field names and their values for adding a record.'),
      recordId: z
        .string()
        .optional()
        .describe('The record ID to delete (required for delete_by_id action).'),
      matchCriteria: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Field name/value pairs to match for deletion (required for delete_by_match action).'
        )
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful.'),
      result: z.any().optional().describe('The API response data.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result: any;

    if (ctx.input.action === 'add') {
      if (!ctx.input.fields) {
        throw new Error('Fields are required when adding a Data Store record.');
      }
      result = await client.addDataStoreRecord(ctx.input.dataStoreApiKey, ctx.input.fields);
      return {
        output: { success: true, result },
        message: `Successfully added a record to the Data Store.`
      };
    } else if (ctx.input.action === 'delete_by_id') {
      if (!ctx.input.recordId) {
        throw new Error('Record ID is required for delete_by_id action.');
      }
      result = await client.deleteDataStoreRecordById(
        ctx.input.dataStoreApiKey,
        ctx.input.recordId
      );
      return {
        output: { success: true, result },
        message: `Successfully deleted record **${ctx.input.recordId}** from the Data Store.`
      };
    } else {
      if (!ctx.input.matchCriteria) {
        throw new Error('Match criteria are required for delete_by_match action.');
      }
      result = await client.deleteDataStoreRecord(
        ctx.input.dataStoreApiKey,
        ctx.input.matchCriteria
      );
      return {
        output: { success: true, result },
        message: `Successfully deleted matching records from the Data Store.`
      };
    }
  })
  .build();
