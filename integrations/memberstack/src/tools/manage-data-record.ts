import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { dataRecordSchema, tableKeySchema } from '../lib/types';
import { spec } from '../spec';

export let manageDataRecord = SlateTool.create(spec, {
  name: 'Manage Data Record',
  key: 'manage_data_record',
  description:
    'Create, partially update, or permanently delete a data table record. Discover tables with list_data_tables and inspect field keys with get_data_table. Query records first to find record IDs for updates or deletion.',
  constraints: [
    'Tables must already exist in the Memberstack dashboard. Deleting records is permanent.',
    'DECIMAL values returned by create, update, and delete are strings; query results use numbers.'
  ],
  tags: { destructive: true }
})
  .input(
    z.object({
      tableKey: tableKeySchema,
      action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      recordId: z
        .string()
        .optional()
        .describe(
          'Required for update/delete. Discover IDs with query_data_records. Omit for create.'
        ),
      data: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Field values keyed by table field key. Required for create/update; update cannot be empty. Omit for delete.'
        ),
      memberId: z
        .string()
        .optional()
        .describe(
          'Optional record owner for create only. Discover a member ID with list_members or get_member. The member must belong to the same app and environment.'
        )
    })
  )
  .output(
    z.object({
      record: dataRecordSchema.describe('Actual created, updated, or deleted record'),
      raw: z.record(z.string(), z.unknown()).optional().describe('Complete provider response')
    })
  )
  .handleInvocation(async ctx => {
    let output = await new Client({ token: ctx.auth.token }).manageDataRecord(
      ctx.input.tableKey,
      ctx.input.action,
      {
        recordId: ctx.input.recordId,
        data: ctx.input.data,
        memberId: ctx.input.memberId
      }
    );
    return {
      output,
      message: `${ctx.input.action === 'create' ? 'Created' : ctx.input.action === 'update' ? 'Updated' : 'Deleted'} data record **${output.record.id}**.`
    };
  })
  .build();
