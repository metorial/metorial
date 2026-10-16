import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { getClient, requireId, requireName } from '../lib/client';
import { spec } from '../spec';

export let manageField = SlateTool.create(spec, {
  name: 'Manage Field',
  key: 'manage_field',
  description: `Create, update, or delete a field (column) in a Baserow table. Use \`action\` to specify the operation. Requires JWT authentication.`,
  instructions: [
    'For creating a field, provide `tableId`, `name`, and `type`. Additional type-specific options can go in `options`.',
    'Supported field types include: text, long_text, number, boolean, date, url, email, file, single_select, multiple_select, link_row, lookup, rollup, count, formula, rating, duration, uuid, autonumber, and more.',
    'For single_select/multiple_select, include `select_options` in `options` with an array of `{ value, color }` objects.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('The operation to perform'),
      tableId: z.number().optional().describe('Table ID (required for create)'),
      fieldId: z.number().optional().describe('Field ID (required for update and delete)'),
      name: z
        .string()
        .optional()
        .describe('Field name (required for create, optional for update)'),
      type: z
        .string()
        .optional()
        .describe(
          'Field type (required for create, e.g. text, number, boolean, date, single_select)'
        ),
      options: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Additional type-specific field options (e.g. number_decimal_places, date_format, select_options)'
        )
    })
  )
  .output(
    z.object({
      field: z
        .object({
          fieldId: z.number().describe('Field ID'),
          name: z.string().describe('Field name'),
          type: z.string().describe('Field type')
        })
        .catchall(z.any())
        .optional()
        .describe('The created or updated field (not returned for delete)'),
      deleted: z.boolean().optional().describe('True if the field was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = getClient(ctx);

    if (ctx.input.action === 'create') {
      requireId(ctx.input.tableId, 'tableId');
      requireName(ctx.input.name);
      requireName(ctx.input.type, 'type');

      let fieldData: Record<string, any> = {
        ...ctx.input.options,
        name: ctx.input.name,
        type: ctx.input.type
      };

      let field = await client.createField(requireId(ctx.input.tableId, 'tableId'), fieldData);

      return {
        output: {
          field: { ...field, fieldId: field.id, name: field.name, type: field.type }
        },
        message: `Created field **${field.name}** (type: ${field.type}) in table ${ctx.input.tableId}.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.fieldId)
        throw createApiServiceError('fieldId is required for updating a field');

      let updateData: Record<string, any> = { ...ctx.input.options };
      if (ctx.input.name) updateData.name = ctx.input.name;
      if (ctx.input.type) updateData.type = ctx.input.type;
      if (!Object.keys(updateData).length)
        throw createApiServiceError('Provide name, type, or options to update a field.');

      let field = await client.updateField(ctx.input.fieldId, updateData);

      return {
        output: {
          field: { ...field, fieldId: field.id, name: field.name, type: field.type }
        },
        message: `Updated field **${field.name}** (ID: ${field.id}).`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.fieldId)
        throw createApiServiceError('fieldId is required for deleting a field');

      await client.deleteField(ctx.input.fieldId);

      return {
        output: { deleted: true },
        message: `Deleted field ${ctx.input.fieldId}.`
      };
    }

    throw createApiServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
