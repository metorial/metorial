import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCustomFieldsTool = SlateTool.create(spec, {
  name: 'List Custom Fields',
  key: 'list_custom_fields',
  description: `List all custom field definitions in the workspace. Returns field names, types, and IDs that can be used to read or set values on features, products, and components.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageCursor: z.string().optional().describe('Cursor for pagination'),
      pageLimit: z.number().optional().describe('Maximum number of custom fields per page')
    })
  )
  .output(
    z.object({
      customFields: z
        .array(z.record(z.string(), z.any()))
        .describe('List of custom field definitions'),
      pageCursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listCustomFields({
      pageCursor: ctx.input.pageCursor,
      pageLimit: ctx.input.pageLimit
    });

    return {
      output: {
        customFields: result.data,
        pageCursor: result.pageCursor
      },
      message: `Retrieved ${result.data.length} custom field(s).`
    };
  })
  .build();

export let getCustomFieldValuesTool = SlateTool.create(spec, {
  name: 'Get Custom Field Values',
  key: 'get_custom_field_values',
  description: `Get all custom field values for a specific entity (feature, product, or component). Returns the current values set on the entity.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      entityType: z.enum(['features', 'products', 'components']).describe('Type of entity'),
      entityId: z.string().describe('ID of the entity')
    })
  )
  .output(
    z.object({
      customFieldValues: z
        .array(z.record(z.string(), z.any()))
        .describe('List of custom field values')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let values = await client.getCustomFieldValues(ctx.input.entityType, ctx.input.entityId);

    return {
      output: { customFieldValues: values },
      message: `Retrieved ${values.length} custom field value(s) for ${ctx.input.entityType}/${ctx.input.entityId}.`
    };
  })
  .build();

export let setCustomFieldValueTool = SlateTool.create(spec, {
  name: 'Set Custom Field Value',
  key: 'set_custom_field_value',
  description: `Set or update a custom field value on a specific entity (feature, product, or component). The value type must match the field definition.`
})
  .input(
    z.object({
      entityType: z.enum(['features', 'products', 'components']).describe('Type of entity'),
      entityId: z.string().describe('ID of the entity'),
      customFieldId: z.string().describe('ID of the custom field to set'),
      value: z
        .any()
        .describe('Value to set (string, number, boolean, or array depending on field type)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the value was set successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.setCustomFieldValue(
      ctx.input.entityType,
      ctx.input.entityId,
      ctx.input.customFieldId,
      ctx.input.value
    );

    return {
      output: { success: true },
      message: `Set custom field **${ctx.input.customFieldId}** on ${ctx.input.entityType}/${ctx.input.entityId}.`
    };
  })
  .build();
