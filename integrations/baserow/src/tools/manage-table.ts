import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { getClient, requireId, requireName } from '../lib/client';
import { spec } from '../spec';

export let manageTable = SlateTool.create(spec, {
  name: 'Manage Table',
  key: 'manage_table',
  description:
    'Get, create, rename, or delete a Baserow table. Discover database IDs with list_databases and existing table IDs with list_tables. Requires JWT authentication.',
  tags: { destructive: true }
})
  .input(
    z.object({
      action: z.enum(['get', 'create', 'update', 'delete']),
      databaseId: z
        .number()
        .optional()
        .describe('Database ID from list_databases; required for create.'),
      tableId: z
        .number()
        .optional()
        .describe('Table ID from list_tables; required for get, update, and delete.'),
      name: z.string().optional().describe('Table name; required for create and update.'),
      data: z
        .array(z.array(z.any()))
        .optional()
        .describe(
          'Initial cell values, one array per row. Used only for create. If omitted, Baserow creates example data.'
        ),
      firstRowHeader: z
        .boolean()
        .optional()
        .describe('Whether the first initial row supplies field names. Used only for create.')
    })
  )
  .output(
    z.object({
      table: z.record(z.string(), z.any()).optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = getClient(ctx);
    let { action, databaseId, tableId, name, data, firstRowHeader } = ctx.input;
    if (
      action !== 'create' &&
      (databaseId !== undefined || data !== undefined || firstRowHeader !== undefined)
    )
      throw createApiServiceError(
        'databaseId, data, and firstRowHeader apply only to create.'
      );
    if ((action === 'get' || action === 'delete') && name !== undefined)
      throw createApiServiceError('name applies only to create or update.');
    if (action === 'create' && tableId !== undefined)
      throw createApiServiceError('Omit tableId when creating a new table.');
    if (action === 'create' && data !== undefined && !data.length)
      throw createApiServiceError('data must contain at least one row when provided.');
    if (action === 'delete') {
      await client.deleteTable(requireId(tableId, 'tableId'));
      return { output: { deleted: true }, message: `Deleted table **${tableId}**.` };
    }
    let table =
      action === 'create'
        ? await client.createTable(
            requireId(databaseId, 'databaseId'),
            requireName(name),
            data,
            firstRowHeader
          )
        : action === 'update'
          ? await client.updateTable(requireId(tableId, 'tableId'), requireName(name))
          : await client.getTable(requireId(tableId, 'tableId'));
    return {
      output: { table },
      message: `Retrieved table **${table.name}** (ID: ${table.id}).`
    };
  })
  .build();
