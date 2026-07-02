import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      teamId: z.string().describe('ID of the team'),
      databaseId: z.string().describe('ID of the database'),
      tableId: z.string().describe('ID of the table (e.g. "A", "B")'),
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
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

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
        createdBy: record.createdBy,
        modifiedAt: record.modifiedAt,
        modifiedBy: record.modifiedBy,
        fields: record.fields
      },
      message: `Retrieved record **#${record.id}** from table **${ctx.input.tableId}**.`
    };
  })
  .build();
