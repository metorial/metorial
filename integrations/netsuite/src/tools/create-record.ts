import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createRecord = SlateTool.create(spec, {
  name: 'Create Record',
  key: 'create_record',
  description: `Create a new NetSuite record of any supported type. Supports all standard record types (customer, vendor, salesOrder, invoice, purchaseOrder, inventoryItem, journalEntry, employee, contact, etc.) and custom record types.
Pass the record's field values as key-value pairs in the fieldValues parameter.`,
  instructions: [
    'Use the exact NetSuite record type name in camelCase (e.g., "salesOrder", "inventoryItem").',
    'Sublists (like line items) should be nested under their sublist key in fieldValues (e.g., { "item": { "items": [...] } }).',
    'Required fields vary by record type — refer to NetSuite metadata for field requirements.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      recordType: z
        .string()
        .describe(
          'NetSuite record type in camelCase (e.g., "customer", "salesOrder", "invoice")'
        ),
      fieldValues: z
        .record(z.string(), z.any())
        .describe('Record field values as key-value pairs. Sublists can be nested objects.')
    })
  )
  .output(
    z.object({
      recordId: z.string().describe('Internal ID of the newly created record'),
      location: z.string().optional().describe('REST API URL of the created record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      ...ctx.auth,
      accountId: ctx.config.accountId
    });

    let result = await client.createRecord(ctx.input.recordType, ctx.input.fieldValues);

    return {
      output: {
        recordId: result.recordId || result.id || '',
        location: result.location
      },
      message: `Created **${ctx.input.recordType}** record with ID \`${result.recordId || result.id}\`.`
    };
  })
  .build();
