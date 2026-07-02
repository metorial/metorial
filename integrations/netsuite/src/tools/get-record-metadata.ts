import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getRecordMetadata = SlateTool.create(spec, {
  name: 'Get Record Metadata',
  key: 'get_record_metadata',
  description: `Retrieve the metadata schema for a NetSuite record type. Returns field definitions, types, required fields, sublists, and supported operations.
Use this to discover available fields before creating or updating records, or to understand the structure of a record type.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      recordType: z
        .string()
        .describe(
          'NetSuite record type in camelCase (e.g., "customer", "salesOrder", "invoice", "inventoryItem")'
        )
    })
  )
  .output(
    z.object({
      metadata: z
        .record(z.string(), z.any())
        .describe('Record type metadata including fields, sublists, and supported operations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      ...ctx.auth,
      accountId: ctx.config.accountId
    });

    let metadata = await client.getRecordMetadata(ctx.input.recordType);

    return {
      output: { metadata },
      message: `Retrieved metadata for **${ctx.input.recordType}** record type.`
    };
  })
  .build();
