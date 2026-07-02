import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      meta: z.any().optional().describe('Additional field metadata')
    })
  )
  .output(
    z.object({
      fieldId: z.string().optional().describe('ID of the affected field'),
      title: z.string().optional().describe('Title of the affected field'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
    let { action, tableId, fieldId, title, uidt, dtxp, formula, meta } = ctx.input;

    if (action === 'create') {
      if (!tableId) throw new Error('tableId is required for creating a field');
      let data: any = { title, uidt };
      if (dtxp) data.dtxp = dtxp;
      if (formula) data.formula = formula;
      if (meta) data.meta = meta;
      let result = await client.createField(tableId, data);
      return {
        output: { fieldId: result.id, title: result.title, success: true },
        message: `Created field **${result.title}** (\`${result.id}\`) on table \`${tableId}\`.`
      };
    }

    if (action === 'update') {
      if (!fieldId) throw new Error('fieldId is required for updating a field');
      let data: any = {};
      if (title) data.title = title;
      if (uidt) data.uidt = uidt;
      if (dtxp) data.dtxp = dtxp;
      if (formula) data.formula = formula;
      if (meta) data.meta = meta;
      let result = await client.updateField(fieldId, data);
      return {
        output: { fieldId, title: result.title ?? title, success: true },
        message: `Updated field \`${fieldId}\`.`
      };
    }

    if (action === 'delete') {
      if (!fieldId) throw new Error('fieldId is required for deleting a field');
      await client.deleteField(fieldId);
      return {
        output: { fieldId, success: true },
        message: `Deleted field \`${fieldId}\`.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
