import { SlateTool } from 'slates';
import { z } from 'zod';
import { connection } from '../lib/client';
import { spec } from '../spec';

export let getRecordMetadata = SlateTool.create(spec, {
  name: 'Get Record Metadata',
  key: 'get_record_metadata',
  description: `Retrieve the native OpenAPI metadata for a NetSuite record type discovered with list_record_types. Returns field definitions, types, required fields, sublists, and operations exposed to your role.
Use this to discover available fields before creating or updating records, or to understand the structure of a record type.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      recordType: z.string().describe('Exact native record type from list_record_types')
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
    const client = connection(ctx.auth, ctx.config);

    let metadata = await client.getRecordMetadata(ctx.input.recordType);

    return {
      output: { metadata },
      message: `Retrieved metadata for **${ctx.input.recordType}** record type.`
    };
  })
  .build();
