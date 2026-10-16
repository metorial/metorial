import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { spec } from '../spec';

export let upsertRecords = SlateTool.create(spec, {
  name: 'Upsert Records',
  key: 'upsert_records',
  description:
    'Insert or update records by numeric record ID. Fields use field IDs from get_table_schema. Useful for synchronizing records while preserving their IDs.',
  tags: { destructive: false }
})
  .input(
    z.object({
      teamId: z.string().describe('Team ID. Use list_teams to discover accessible teams.'),
      databaseId: z
        .string()
        .describe('Database ID. Use list_databases to discover databases.'),
      tableId: z.string().describe('Table ID. Use get_table_schema to discover tables.'),
      records: z
        .array(
          z.object({
            recordId: z.number().describe('Positive whole record ID to preserve'),
            fields: z
              .record(z.string(), z.any())
              .describe('Values keyed by field ID, excluding _id and _upsert')
          })
        )
        .min(1)
        .describe('Records to insert or update')
    })
  )
  .output(
    z.object({
      records: z
        .array(z.record(z.string(), z.any()))
        .describe('Unmodified Ninox upsert results, including provider record IDs'),
      count: z.number().describe('Number of returned records')
    })
  )
  .handleInvocation(async ctx => {
    for (let record of ctx.input.records) {
      if (!Number.isSafeInteger(record.recordId) || record.recordId <= 0) {
        throw createApiServiceError('Each recordId must be a positive whole number.');
      }
      if ('_id' in record.fields || '_upsert' in record.fields) {
        throw createApiServiceError(
          'Use recordId for the record ID and omit _id and _upsert from fields.'
        );
      }
    }

    let client = createClient(ctx);
    let records = await client.upsertRecords(
      ctx.input.teamId,
      ctx.input.databaseId,
      ctx.input.tableId,
      ctx.input.records.map(record => ({
        ...record.fields,
        _id: record.recordId,
        _upsert: true
      }))
    );
    return {
      output: { records, count: records.length },
      message: `Upserted **${records.length}** record(s).`
    };
  })
  .build();
