import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateRecord = SlateTool.create(spec, {
  name: 'Update Record',
  key: 'update_record',
  description: `Update field values of an existing record. Only the specified fields will be modified; other fields remain unchanged.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      teamId: z.string().describe('ID of the team'),
      databaseId: z.string().describe('ID of the database'),
      tableId: z.string().describe('ID of the table (e.g. "A", "B")'),
      recordId: z.number().describe('Numeric ID of the record to update'),
      fields: z
        .record(z.string(), z.any())
        .describe('Fields to update, keyed by field name. Only specified fields are changed.')
    })
  )
  .output(
    z.object({
      recordId: z.number().describe('ID of the updated record'),
      modifiedAt: z.string().optional().describe('Updated modification timestamp'),
      modifiedBy: z.string().optional().describe('User who performed the update'),
      fields: z.record(z.string(), z.any()).describe('Updated field values')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let updated = await client.updateRecord(
      ctx.input.teamId,
      ctx.input.databaseId,
      ctx.input.tableId,
      ctx.input.recordId,
      ctx.input.fields
    );

    return {
      output: {
        recordId: updated.id,
        modifiedAt: updated.modifiedAt,
        modifiedBy: updated.modifiedBy,
        fields: updated.fields
      },
      message: `Updated record **#${updated.id}** in table **${ctx.input.tableId}**.`
    };
  })
  .build();
