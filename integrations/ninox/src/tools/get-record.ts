import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { spec } from '../spec';

export let getRecord = SlateTool.create(spec, {
  name: 'Get Record',
  key: 'get_record',
  description: `Retrieve a single record by its ID from a specific table. Returns all field values and metadata for the record.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      teamId: z.string().describe('Team ID. Use list_teams to discover accessible teams.'),
      databaseId: z
        .string()
        .describe('Database ID. Use list_databases to discover databases.'),
      tableId: z
        .string()
        .describe('Table ID (e.g. "A", "B"). Use get_table_schema to discover tables.'),
      recordId: z.number().describe('Numeric ID of the record to retrieve'),
      choiceStyle: z
        .enum(['ids', 'names'])
        .optional()
        .describe('How to return choice field values: as IDs or display names')
    })
  )
  .output(
    z.object({
      recordId: z.number().describe('Unique record identifier'),
      sequence: z.number().optional().describe('Sequence number for change tracking'),
      createdAt: z.string().optional().describe('Record creation timestamp'),
      createdBy: z.string().optional().describe('User who created the record'),
      modifiedAt: z.string().optional().describe('Last modification timestamp'),
      modifiedBy: z.string().optional().describe('User who last modified the record'),
      fields: z.record(z.string(), z.any()).describe('Record field values keyed by field name')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let record = await client.getRecord(
      ctx.input.teamId,
      ctx.input.databaseId,
      ctx.input.tableId,
      ctx.input.recordId,
      {
        choiceStyle: ctx.input.choiceStyle
      }
    );

    return {
      output: {
        recordId: record.id,
        sequence: record.sequence,
        createdAt: record.createdAt,
        createdBy: record.createdBy === undefined ? undefined : String(record.createdBy),
        modifiedAt: record.modifiedAt,
        modifiedBy: record.modifiedBy === undefined ? undefined : String(record.modifiedBy),
        fields: record.fields
      },
      message: `Retrieved record **#${record.id}** from table **${ctx.input.tableId}**.`
    };
  })
  .build();
