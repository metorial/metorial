import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClickUpClient } from '../lib/client';
import { spec } from '../spec';

export let getCustomFields = SlateTool.create(spec, {
  name: 'Get Custom Fields',
  key: 'get_custom_fields',
  description: `Retrieve all custom fields accessible on a ClickUp list. Returns field definitions including their IDs, names, types, and options.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      listId: z.string().describe('The list ID to get custom fields for')
    })
  )
  .output(
    z.object({
      fields: z.array(
        z.object({
          fieldId: z.string(),
          fieldName: z.string(),
          fieldType: z.string(),
          required: z.boolean().optional(),
          typeConfig: z.any().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickUpClient(ctx.auth.token);
    let fields = await client.getAccessibleCustomFields(ctx.input.listId);

    return {
      output: {
        fields: fields.map((f: any) => ({
          fieldId: f.id,
          fieldName: f.name,
          fieldType: f.type,
          required: f.required,
          typeConfig: f.type_config
        }))
      },
      message: `Found **${fields.length}** custom field(s) on list ${ctx.input.listId}.`
    };
  })
  .build();

export let setCustomFieldValue = SlateTool.create(spec, {
  name: 'Set Custom Field Value',
  key: 'set_custom_field_value',
  description: `Set or update a custom field value on a ClickUp task. The value format depends on the field type (text, number, dropdown, checkbox, date, etc.).`,
  instructions: [
    'For dropdown fields, the value should be the option UUID (get from Get Custom Fields tool).',
    'For checkbox fields, use true/false.',
    'For date fields, use a Unix timestamp in milliseconds.',
    'For number/currency fields, use a numeric value.',
    'For text fields, use a string value.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      taskId: z.string().describe('The task ID to set the field on'),
      fieldId: z.string().describe('The custom field ID'),
      value: z.any().describe('The value to set (format depends on field type)')
    })
  )
  .output(
    z.object({
      updated: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickUpClient(ctx.auth.token);
    await client.setCustomFieldValue(ctx.input.taskId, ctx.input.fieldId, ctx.input.value);

    return {
      output: { updated: true },
      message: `Set custom field ${ctx.input.fieldId} on task ${ctx.input.taskId}.`
    };
  })
  .build();
