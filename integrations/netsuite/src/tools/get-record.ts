import { SlateTool } from 'slates';
import { z } from 'zod';
import { connection } from '../lib/client';
import { spec } from '../spec';

export let getRecord = SlateTool.create(spec, {
  name: 'Get Record',
  key: 'get_record',
  description: `Retrieve a NetSuite record by its internal ID or eid:<externalId>. Discover types available to your role with list_record_types and supported reads with get_record_metadata.
Optionally expand sub-resources (like line items) and select specific fields to return.`,
  instructions: [
    'Use the exact native type name returned by list_record_types.',
    'Set expandSubResources to true to include sublists and related data inline.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      recordType: z.string().describe('Exact native record type from list_record_types'),
      recordId: z
        .string()
        .describe('Exact internal ID or eid:<externalId> of the record to retrieve'),
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
    const client = connection(ctx.auth, ctx.config);

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
