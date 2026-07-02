import { SlateTool } from 'slates';
import { z } from 'zod';
import { createSalesforceClient } from '../lib/client';
import { spec } from '../spec';

export let getRecord = SlateTool.create(spec, {
  name: 'Get Record',
  key: 'get_record',
  description: `Retrieve a single Salesforce record by its ID and object type. Supports fetching specific fields to reduce payload size. Works with any standard or custom sObject (Account, Contact, Lead, Opportunity, Case, custom objects, etc.).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      objectType: z
        .string()
        .describe(
          'The Salesforce object type (e.g., Account, Contact, Lead, Opportunity, Case, or a custom object like MyObject__c)'
        ),
      recordId: z.string().describe('The 15 or 18-character Salesforce record ID'),
      fields: z
        .array(z.string())
        .optional()
        .describe(
          'Specific fields to retrieve. If omitted, all accessible fields are returned.'
        )
    })
  )
  .output(
    z.object({
      record: z
        .record(z.string(), z.any())
        .describe('The retrieved record data with all requested fields')
    })
  )
  .handleInvocation(async ctx => {
    let client = createSalesforceClient({
      instanceUrl: ctx.auth.instanceUrl,
      apiVersion: ctx.config.apiVersion,
      token: ctx.auth.token
    });

    let record = await client.getRecord(
      ctx.input.objectType,
      ctx.input.recordId,
      ctx.input.fields
    );

    return {
      output: { record },
      message: `Retrieved **${ctx.input.objectType}** record \`${ctx.input.recordId}\``
    };
  })
  .build();
