import { SlateTool } from 'slates';
import { z } from 'zod';
import { createSalesforceClient } from '../lib/client';
import { spec } from '../spec';

export let upsertRecord = SlateTool.create(spec, {
  name: 'Upsert Record',
  key: 'upsert_record',
  description: `Insert or update (upsert) a Salesforce record using an external ID field. If a record with the given external ID value exists, it is updated; otherwise a new record is created. Commonly used for data synchronization with external systems.`,
  instructions: [
    'The external ID field must be marked as an External ID in Salesforce Setup.',
    'Do not include the external ID field in the fieldValues — it is set via the externalIdValue parameter.'
  ]
})
  .input(
    z.object({
      objectType: z
        .string()
        .describe('The Salesforce object type (e.g., Account, Contact, or a custom object)'),
      externalIdField: z
        .string()
        .describe('The API name of the external ID field (e.g., External_Id__c)'),
      externalIdValue: z.string().describe('The external ID value to match on'),
      fieldValues: z
        .record(z.string(), z.any())
        .describe('Field name-value pairs to set on the record')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the upsert was successful'),
      recordId: z.string().optional().describe('The ID of the created or updated record'),
      created: z
        .boolean()
        .optional()
        .describe('True if a new record was created, false if an existing record was updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = createSalesforceClient({
      instanceUrl: ctx.auth.instanceUrl,
      apiVersion: ctx.config.apiVersion,
      token: ctx.auth.token
    });

    let result = await client.upsertRecord(
      ctx.input.objectType,
      ctx.input.externalIdField,
      ctx.input.externalIdValue,
      ctx.input.fieldValues
    );

    return {
      output: {
        success: result.success ?? true,
        recordId: result.id,
        created: result.created
      },
      message: result.created
        ? `Created new **${ctx.input.objectType}** record via upsert`
        : `Updated existing **${ctx.input.objectType}** record via upsert`
    };
  })
  .build();
