import { SlateTool } from 'slates';
import { z } from 'zod';
import { BiginClient } from '../lib/client';
import { spec } from '../spec';

export let upsertRecords = SlateTool.create(spec, {
  name: 'Upsert Records',
  key: 'upsert_records',
  description: `Insert or update records in a single call. If a record with matching duplicate check fields exists, it will be updated; otherwise, a new record is created. This is useful for syncing data from external systems.`,
  instructions: [
    'Specify duplicate_check_fields to control which fields determine uniqueness.',
    'If no duplicate check fields are provided, Bigin uses default uniqueness rules for the module.',
    'A maximum of 100 records can be upserted per call.'
  ]
})
  .input(
    z.object({
      module: z
        .enum(['Contacts', 'Accounts', 'Pipelines', 'Products', 'Tasks', 'Events', 'Calls'])
        .describe('Module API name. Accounts = Companies, Pipelines = Deals.'),
      records: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of record objects with field API names as keys'),
      duplicateCheckFields: z
        .array(z.string())
        .optional()
        .describe('Field API names used to check for existing duplicates')
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            recordId: z.string().optional().describe('ID of the record'),
            action: z
              .string()
              .optional()
              .describe('Whether the record was "insert" or "update"'),
            duplicateField: z
              .string()
              .optional()
              .describe('The field that matched the duplicate'),
            status: z.string().describe('Operation status'),
            message: z.string().optional().describe('Status message'),
            code: z.string().optional().describe('Status code')
          })
        )
        .describe('Results for each upsert operation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BiginClient({
      token: ctx.auth.token,
      apiDomain: ctx.auth.apiDomain
    });

    let result = await client.upsertRecords(
      ctx.input.module,
      ctx.input.records,
      ctx.input.duplicateCheckFields
    );
    let data = result.data || [];

    let results = data.map((item: any) => ({
      recordId: item.details?.id,
      action: item.action,
      duplicateField: item.duplicate_field,
      status: item.status,
      message: item.message,
      code: item.code
    }));

    let inserted = results.filter((r: any) => r.action === 'insert').length;
    let updated = results.filter((r: any) => r.action === 'update').length;

    return {
      output: { results },
      message: `Upserted **${results.length}** record(s) in **${ctx.input.module}**: **${inserted}** inserted, **${updated}** updated.`
    };
  })
  .build();
