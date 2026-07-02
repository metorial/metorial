import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getRecord = SlateTool.create(spec, {
  name: 'Get Record',
  key: 'get_record',
  description: `Retrieve a single NetSuite record by its type and internal ID. Supports all standard and custom record types (e.g., customer, salesOrder, invoice, vendor, inventoryItem, journalEntry, employee, etc.).
Optionally expand sub-resources (like line items) and select specific fields to return.`,
  instructions: [
    'Use the exact NetSuite record type name in camelCase (e.g., "salesOrder", "inventoryItem", "journalEntry").',
    'Set expandSubResources to true to include sublists and related data inline.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      recordType: z
        .string()
        .describe(
          'NetSuite record type in camelCase (e.g., "customer", "salesOrder", "invoice", "vendor", "inventoryItem")'
        ),
      recordId: z.string().describe('Internal ID of the record to retrieve'),
      expandSubResources: z
        .boolean()
        .optional()
        .describe('Whether to expand sub-resources like line items inline'),
      fields: z
        .array(z.string())
        .optional()
        .describe('Specific fields to return (returns all fields if not specified)')
    })
  )
  .output(
    z.object({
      record: z.record(z.string(), z.any()).describe('The full NetSuite record data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      ...ctx.auth,
      accountId: ctx.config.accountId
    });

    let record = await client.getRecord(ctx.input.recordType, ctx.input.recordId, {
      expandSubResources: ctx.input.expandSubResources,
      fields: ctx.input.fields
    });

    return {
      output: { record },
      message: `Retrieved **${ctx.input.recordType}** record \`${ctx.input.recordId}\`.`
    };
  })
  .build();
