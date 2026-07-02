import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let fieldInfoSchema = z.object({
  fieldName: z.string().describe('Technical name of the field'),
  type: z
    .string()
    .describe(
      'Field type (char, integer, float, boolean, date, datetime, many2one, one2many, many2many, selection, text, html, binary, etc.)'
    ),
  label: z.string().optional().describe('Human-readable label for the field'),
  required: z.boolean().optional().describe('Whether the field is required'),
  readonly: z.boolean().optional().describe('Whether the field is read-only'),
  help: z.string().optional().describe('Help text or description for the field'),
  relation: z.string().optional().describe('Related model name (for relational fields)'),
  selectionOptions: z
    .array(z.tuple([z.string(), z.string()]))
    .optional()
    .describe('Available options for selection fields: [value, label] pairs')
});

export let listModelFields = SlateTool.create(spec, {
  name: 'List Model Fields',
  key: 'list_model_fields',
  description: `Retrieve the field definitions for any Odoo model. Returns field names, types, labels, and metadata. Use this to discover the structure of a model before creating or updating records.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      model: z
        .string()
        .describe('The Odoo model to inspect (e.g., "res.partner", "sale.order", "crm.lead")')
    })
  )
  .output(
    z.object({
      fields: z.array(fieldInfoSchema).describe('Array of field definitions for the model')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let rawFields = await client.fieldsGet(ctx.input.model, [
      'string',
      'type',
      'required',
      'readonly',
      'help',
      'relation',
      'selection'
    ]);

    let fields = Object.entries(rawFields).map(([fieldName, meta]) => {
      let field: Record<string, unknown> = {
        fieldName,
        type: meta.type as string,
        label: meta.string as string | undefined,
        required: meta.required as boolean | undefined,
        readonly: meta.readonly as boolean | undefined
      };

      if (meta.help) {
        field.help = meta.help as string;
      }
      if (meta.relation) {
        field.relation = meta.relation as string;
      }
      if (meta.selection && Array.isArray(meta.selection)) {
        field.selectionOptions = meta.selection;
      }

      return field;
    });

    return {
      output: { fields: fields as z.infer<typeof fieldInfoSchema>[] },
      message: `Found **${fields.length}** fields on model \`${ctx.input.model}\`.`
    };
  })
  .build();
