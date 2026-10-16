import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { getClient, requireId, requireName } from '../lib/client';
import { spec } from '../spec';

export let manageView = SlateTool.create(spec, {
  name: 'Manage View',
  key: 'manage_view',
  description:
    'Get, create, update, or delete a Baserow view. Discover view IDs with list_views. Requires JWT authentication; view types and settings depend on the instance and plan.',
  tags: { destructive: true }
})
  .input(
    z.object({
      action: z.enum(['get', 'create', 'update', 'delete']),
      tableId: z
        .number()
        .optional()
        .describe('Table ID from list_tables; required for create.'),
      viewId: z
        .number()
        .optional()
        .describe('View ID from list_views; required for get, update, and delete.'),
      name: z
        .string()
        .optional()
        .describe('View name; required for create, optional for update.'),
      type: z
        .string()
        .optional()
        .describe('View type, such as grid, gallery, or form; required for create.'),
      options: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Documented view settings, such as filter_type or filters_disabled. Used for create and update.'
        )
    })
  )
  .output(
    z.object({
      view: z.record(z.string(), z.any()).optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = getClient(ctx);
    let { action, tableId, viewId, name, type, options } = ctx.input;
    if (
      (action === 'get' || action === 'delete') &&
      (name !== undefined ||
        type !== undefined ||
        options !== undefined ||
        tableId !== undefined)
    )
      throw createApiServiceError('For get or delete, provide only viewId and action.');
    if (action !== 'create' && (tableId !== undefined || type !== undefined))
      throw createApiServiceError('tableId and type apply only to create.');
    if (action === 'create' && viewId !== undefined)
      throw createApiServiceError('Omit viewId when creating a view.');
    if (options && ['id', 'name', 'type', 'table_id', 'table'].some(key => key in options))
      throw createApiServiceError(
        'Use the named input fields for the view identity, name, and type.'
      );
    if (action === 'delete') {
      await client.deleteView(requireId(viewId, 'viewId'));
      return { output: { deleted: true }, message: `Deleted view **${viewId}**.` };
    }
    if (action === 'update' && name === undefined && !Object.keys(options ?? {}).length)
      throw createApiServiceError('Provide name or options to update the view.');
    let view =
      action === 'create'
        ? await client.createView(requireId(tableId, 'tableId'), {
            ...options,
            name: requireName(name),
            type: requireName(type, 'type')
          })
        : action === 'update'
          ? await client.updateView(requireId(viewId, 'viewId'), {
              ...options,
              ...(name === undefined ? {} : { name: requireName(name) })
            })
          : await client.getView(requireId(viewId, 'viewId'));
    return { output: { view }, message: `Retrieved view **${view.name}** (ID: ${view.id}).` };
  })
  .build();
