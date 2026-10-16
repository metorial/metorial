import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { resolveCreatedField, resolveUpdatedField } from '../lib/fields';
import { optionalString, requireRecord, requireString, responseList } from '../lib/schemas';
import { spec } from '../spec';

export let manageField = SlateTool.create(spec, {
  name: 'Manage Field',
  key: 'manage_field',
  description: `Create, update, or delete a field (column) on a NocoDB table.
- **create**: Add a new field to a table by specifying tableId and field properties.
- **update**: Modify an existing field by specifying fieldId and the properties to change.
- **delete**: Remove a field by specifying its fieldId.`,
  instructions: [
    'Supported uidt values: SingleLineText, LongText, Number, Decimal, Currency, Percent, Email, URL, Checkbox, SingleSelect, MultiSelect, Date, DateTime, Attachment, LinkToAnotherRecord, Lookup, Rollup, Formula, Rating, Duration, JSON, User, and more.',
    'For SingleSelect/MultiSelect, provide choices in the dtxp option as comma-separated values.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete'])
        .describe('Action to perform on the field'),
      tableId: z.string().optional().describe('Table ID (required for create)'),
      fieldId: z
        .string()
        .optional()
        .describe('Field/column ID (required for update and delete)'),
      title: z.string().optional().describe('Field title (for create/update)'),
      uidt: z.string().optional().describe('UI data type (for create/update)'),
      dtxp: z
        .string()
        .optional()
        .describe('Data type extra params, e.g. select options as comma-separated values'),
      formula: z.string().optional().describe('Formula expression (for Formula fields)'),
      meta: z.any().optional().describe('Additional field metadata'),
      description: z.string().optional().describe('Field description for create/update'),
      columnOptions: z
        .record(z.string(), z.any())
        .optional()
        .describe('Provider colOptions for create/update, such as select options')
    })
  )
  .output(
    z.object({
      fieldId: z.string().optional().describe('ID of the affected field'),
      title: z.string().optional().describe('Title of the affected field'),
      success: z.boolean().describe('Whether the operation succeeded'),
      raw: z.any().optional().describe('Complete provider response'),
      recovery: z
        .object({
          tableId: z.string().optional(),
          fieldId: z.string().optional(),
          message: z.string()
        })
        .optional()
        .describe(
          'Recovery guidance when the mutation succeeded but its field metadata could not be identified uniquely'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
    let {
      action,
      tableId,
      fieldId,
      title,
      uidt,
      dtxp,
      formula,
      meta,
      description,
      columnOptions
    } = ctx.input;

    if (action === 'create') {
      if (!tableId) throw createApiServiceError('tableId is required for creating a field');
      let data: any = { title, uidt };
      if (dtxp) data.dtxp = dtxp;
      if (formula) data.formula = formula;
      if (meta) data.meta = meta;
      if (description !== undefined) data.description = description;
      if (columnOptions !== undefined) data.colOptions = columnOptions;
      let beforeIds: Set<string> | undefined;
      try {
        let before = requireRecord(
          await client.getTable(tableId),
          'table before field creation'
        );
        if (before.id === tableId) {
          beforeIds = new Set(
            responseList(before.columns, 'columns').map(column =>
              requireString(column.id, 'column ID before creation')
            )
          );
        }
      } catch {
        // Table-read permission is separate from field-write permission; this read is optional.
      }
      let result = await client.createField(tableId, data);
      let field = beforeIds
        ? resolveCreatedField(result, beforeIds, tableId, { title, uidt })
        : undefined;
      let recoveryMessage =
        'NocoDB accepted field creation, but the returned metadata does not uniquely identify the new field. Call get_table and inspect raw before creating another field.';
      let recovery = field ? undefined : { tableId, message: recoveryMessage };
      return {
        output: {
          fieldId: optionalString(field?.id),
          title: optionalString(field?.title),
          success: true,
          raw: result,
          recovery
        },
        message: field
          ? `Created field \`${field.id}\` on table \`${tableId}\`.`
          : recoveryMessage
      };
    }

    if (action === 'update') {
      if (!fieldId) throw createApiServiceError('fieldId is required for updating a field');
      let data: any = {};
      if (title) data.title = title;
      if (uidt) data.uidt = uidt;
      if (dtxp) data.dtxp = dtxp;
      if (formula) data.formula = formula;
      if (meta) data.meta = meta;
      if (description !== undefined) data.description = description;
      if (columnOptions !== undefined) data.colOptions = columnOptions;
      let result = await client.updateField(fieldId, data);
      let field = resolveUpdatedField(result, fieldId);
      let recovery = field
        ? undefined
        : {
            fieldId,
            message:
              'NocoDB accepted the field update, but the response does not uniquely identify its metadata. Call get_field with this fieldId before retrying the mutation.'
          };
      return {
        output: {
          fieldId,
          title: optionalString(field?.title),
          success: true,
          raw: result,
          recovery
        },
        message: `Updated field \`${fieldId}\`.`
      };
    }

    if (action === 'delete') {
      if (!fieldId) throw createApiServiceError('fieldId is required for deleting a field');
      let result = await client.deleteField(fieldId);
      return {
        output: { fieldId, success: true, raw: result },
        message: `Deleted field \`${fieldId}\`.`
      };
    }

    throw createApiServiceError(`Unknown action: ${action}`);
  })
  .build();
