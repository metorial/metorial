import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getRecord = SlateTool.create(spec, {
  name: 'Get Record',
  key: 'get_record',
  description: `Retrieve a single record by its ID from any entity type in EspoCRM. Returns the full record with all fields, or a subset of fields if specified. Works with both built-in and custom entity types.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      entityType: z
        .string()
        .describe(
          'Entity type (e.g., Contact, Account, Lead, Opportunity, Case, Meeting, Call, Task)'
        ),
      recordId: z.string().describe('ID of the record to retrieve'),
      select: z
        .array(z.string())
        .optional()
        .describe('Specific fields to include in the response (returns all if not specified)')
    })
  )
  .output(
    z.object({
      record: z
        .record(z.string(), z.any())
        .describe('The retrieved record with all requested fields')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let record = await client.getRecord(
      ctx.input.entityType,
      ctx.input.recordId,
      ctx.input.select
    );

    return {
      output: {
        record
      },
      message: `Retrieved ${ctx.input.entityType} record **${record.name || record.id}**.`
    };
  })
  .build();
