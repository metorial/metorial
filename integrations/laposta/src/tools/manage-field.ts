import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let fieldOutputSchema = z.object({
  fieldId: z.string().describe('Unique identifier of the field'),
  listId: z.string().describe('ID of the list the field belongs to'),
  name: z.string().describe('Display name of the field'),
  tag: z.string().describe('Tag used to reference the field in custom_fields'),
  datatype: z
    .string()
    .describe('Data type: text, numeric, date, select_single, or select_multiple'),
  datatypeDisplay: z.string().describe('Display type for select fields: select or radio'),
  defaultvalue: z.string().describe('Default value for the field'),
  required: z.boolean().describe('Whether the field is required'),
  inForm: z.boolean().describe('Whether the field is shown in subscription forms'),
  inList: z.boolean().describe('Whether the field is shown in list overviews'),
  options: z
    .record(z.string(), z.string())
    .describe('Options for select fields, keyed by option ID'),
  state: z.string().describe('Current state of the field'),
  created: z.string().describe('Creation timestamp'),
  modified: z.string().describe('Last modified timestamp')
});

export let getFields = SlateTool.create(spec, {
  name: 'Get Fields',
  key: 'get_fields',
  description: `Retrieves custom fields defined on a Laposta mailing list. Provide a **fieldId** to get a specific field, or omit it to retrieve all fields for the list.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      listId: z.string().describe('ID of the list to retrieve fields from'),
      fieldId: z.string().optional().describe('ID of a specific field to retrieve')
    })
  )
  .output(
    z.object({
      fields: z.array(fieldOutputSchema).describe('Retrieved custom fields')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.fieldId) {
      let result = await client.getField(ctx.input.fieldId, ctx.input.listId);
      let field = result.field;
      return {
        output: {
          fields: [
            {
              fieldId: field.field_id,
              listId: field.list_id,
              name: field.name,
              tag: field.tag,
              datatype: field.datatype,
              datatypeDisplay: field.datatype_display,
              defaultvalue: field.defaultvalue,
              required: field.required,
              inForm: field.in_form,
              inList: field.in_list,
              options: field.options,
              state: field.state,
              created: field.created,
              modified: field.modified
            }
          ]
        },
        message: `Retrieved field **${field.name}** (${field.datatype}).`
      };
    }

    let results = await client.getFields(ctx.input.listId);
    let fields = results.map(r => {
      let field = r.field;
      return {
        fieldId: field.field_id,
        listId: field.list_id,
        name: field.name,
        tag: field.tag,
        datatype: field.datatype,
        datatypeDisplay: field.datatype_display,
        defaultvalue: field.defaultvalue,
        required: field.required,
        inForm: field.in_form,
        inList: field.in_list,
        options: field.options,
        state: field.state,
        created: field.created,
        modified: field.modified
      };
    });

    return {
      output: { fields },
      message: `Retrieved ${fields.length} custom field(s).`
    };
  })
  .build();

export let createField = SlateTool.create(spec, {
  name: 'Create Field',
  key: 'create_field',
  description: `Creates a new custom field on a Laposta mailing list. Supports text, numeric, date, single-select, and multi-select data types. For select types, provide the available options.`,
  instructions: [
    'For select_single or select_multiple data types, you must provide the **options** array.',
    'Use **datatypeDisplay** to choose between "select" (dropdown) and "radio" for single-select fields.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      listId: z.string().describe('ID of the list to add the field to'),
      name: z.string().describe('Display name of the field'),
      datatype: z
        .enum(['text', 'numeric', 'date', 'select_single', 'select_multiple'])
        .describe('Data type for the field'),
      datatypeDisplay: z
        .enum(['select', 'radio'])
        .optional()
        .describe('Display style for select_single fields'),
      options: z
        .array(z.string())
        .optional()
        .describe('Options for select_single or select_multiple fields'),
      defaultvalue: z.string().optional().describe('Default value for the field'),
      required: z.boolean().describe('Whether this field is required'),
      inForm: z.boolean().describe('Whether to show this field in subscription forms'),
      inList: z.boolean().describe('Whether to show this field in list overviews')
    })
  )
  .output(fieldOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createField({
      listId: ctx.input.listId,
      name: ctx.input.name,
      datatype: ctx.input.datatype,
      datatypeDisplay: ctx.input.datatypeDisplay,
      options: ctx.input.options,
      defaultvalue: ctx.input.defaultvalue,
      required: ctx.input.required,
      inForm: ctx.input.inForm,
      inList: ctx.input.inList
    });

    let field = result.field;
    return {
      output: {
        fieldId: field.field_id,
        listId: field.list_id,
        name: field.name,
        tag: field.tag,
        datatype: field.datatype,
        datatypeDisplay: field.datatype_display,
        defaultvalue: field.defaultvalue,
        required: field.required,
        inForm: field.in_form,
        inList: field.in_list,
        options: field.options,
        state: field.state,
        created: field.created,
        modified: field.modified
      },
      message: `Created custom field **${field.name}** (${field.datatype}) with tag \`${field.tag}\`.`
    };
  })
  .build();

export let updateField = SlateTool.create(spec, {
  name: 'Update Field',
  key: 'update_field',
  description: `Updates an existing custom field on a Laposta mailing list. Can modify name, data type, display settings, options, and visibility.
**Warning:** Changing a field's data type deletes all existing data for that field.`,
  constraints: ['Changing the datatype will delete all existing data for the field.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      listId: z.string().describe('ID of the list the field belongs to'),
      fieldId: z.string().describe('ID of the field to update'),
      name: z.string().optional().describe('New display name'),
      datatype: z
        .enum(['text', 'numeric', 'date', 'select_single', 'select_multiple'])
        .optional()
        .describe('New data type (warning: changes delete existing data)'),
      datatypeDisplay: z
        .enum(['select', 'radio'])
        .optional()
        .describe('Display style for select_single fields'),
      defaultvalue: z.string().optional().describe('New default value'),
      optionsFull: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Full option set keyed by option ID. Use to add, rename, or remove individual options.'
        ),
      required: z.boolean().optional().describe('Whether the field is required'),
      inForm: z.boolean().optional().describe('Whether to show in subscription forms'),
      inList: z.boolean().optional().describe('Whether to show in list overviews')
    })
  )
  .output(fieldOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.updateField(ctx.input.fieldId, {
      listId: ctx.input.listId,
      name: ctx.input.name,
      datatype: ctx.input.datatype,
      datatypeDisplay: ctx.input.datatypeDisplay,
      defaultvalue: ctx.input.defaultvalue,
      optionsFull: ctx.input.optionsFull,
      required: ctx.input.required,
      inForm: ctx.input.inForm,
      inList: ctx.input.inList
    });

    let field = result.field;
    return {
      output: {
        fieldId: field.field_id,
        listId: field.list_id,
        name: field.name,
        tag: field.tag,
        datatype: field.datatype,
        datatypeDisplay: field.datatype_display,
        defaultvalue: field.defaultvalue,
        required: field.required,
        inForm: field.in_form,
        inList: field.in_list,
        options: field.options,
        state: field.state,
        created: field.created,
        modified: field.modified
      },
      message: `Updated field **${field.name}** (${field.datatype}).`
    };
  })
  .build();

export let deleteField = SlateTool.create(spec, {
  name: 'Delete Field',
  key: 'delete_field',
  description: `Permanently deletes a custom field from a Laposta mailing list. All data stored in this field is removed.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      listId: z.string().describe('ID of the list the field belongs to'),
      fieldId: z.string().describe('ID of the field to delete')
    })
  )
  .output(fieldOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.deleteField(ctx.input.fieldId, ctx.input.listId);

    let field = result.field;
    return {
      output: {
        fieldId: field.field_id,
        listId: field.list_id,
        name: field.name,
        tag: field.tag,
        datatype: field.datatype,
        datatypeDisplay: field.datatype_display,
        defaultvalue: field.defaultvalue,
        required: field.required,
        inForm: field.in_form,
        inList: field.in_list,
        options: field.options,
        state: field.state,
        created: field.created,
        modified: field.modified
      },
      message: `Deleted field **${field.name}** from list ${field.list_id}.`
    };
  })
  .build();
