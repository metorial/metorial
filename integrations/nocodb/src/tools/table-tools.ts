import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { optionalString, requireRecord, requireString, tableIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let updateTable = SlateTool.create(spec, {
  key: 'update_table',
  name: 'Update Table',
  description:
    'Update a NocoDB table title or metadata. Call list_tables to discover table IDs.',
  tags: { destructive: false }
})
  .input(
    z.object({
      tableId: tableIdSchema,
      title: z.string().optional(),
      meta: z.any().optional()
    })
  )
  .output(z.object({ tableId: z.string(), success: z.boolean(), raw: z.any() }))
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
    let { tableId, ...input } = ctx.input;
    let data = pickDefined(input);
    if (!Object.keys(data).length)
      throw createApiServiceError('Provide at least one table property to update.');
    let raw = await client.updateTable(tableId, data);
    if (raw === false) throw createApiServiceError('NocoDB did not confirm the table update.');
    return {
      output: { tableId, success: true, raw },
      message: `Updated table \`${tableId}\`.`
    };
  })
  .build();

export let deleteTable = SlateTool.create(spec, {
  key: 'delete_table',
  name: 'Delete Table',
  description: 'Delete a table and its records. Call list_tables to discover table IDs.',
  tags: { destructive: true }
})
  .input(z.object({ tableId: tableIdSchema }))
  .output(z.object({ tableId: z.string(), success: z.boolean(), raw: z.any() }))
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
    let raw = await client.deleteTable(ctx.input.tableId);
    if (raw === false) throw createApiServiceError('NocoDB did not confirm table deletion.');
    return {
      output: { tableId: ctx.input.tableId, success: true, raw },
      message: `Deleted table \`${ctx.input.tableId}\`.`
    };
  })
  .build();

export let getField = SlateTool.create(spec, {
  key: 'get_field',
  name: 'Get Field',
  description:
    'Read a field definition and all provider options. Call get_table to discover field IDs.',
  tags: { readOnly: true }
})
  .input(z.object({ fieldId: z.string().describe('Column ID from get_table') }))
  .output(
    z.object({
      fieldId: z.string(),
      title: z.string().optional(),
      uidt: z.string().optional(),
      raw: z.any()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
    let raw = requireRecord(await client.getField(ctx.input.fieldId), 'field');
    return {
      output: {
        fieldId: requireString(raw.id, 'field ID'),
        title: optionalString(raw.title),
        uidt: optionalString(raw.uidt),
        raw
      },
      message: `Retrieved field \`${ctx.input.fieldId}\`.`
    };
  })
  .build();
