import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCustomFields = SlateTool.create(spec, {
  name: 'List Custom Fields',
  key: 'list_custom_fields',
  description: `Lists custom fields defined in Rocketlane, filtered by entity type (project, task, or company). Returns field definitions including IDs, labels, and types needed when setting field values on resources.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      entityType: z
        .enum(['project', 'task', 'company'])
        .describe('Type of entity to list custom fields for')
    })
  )
  .output(
    z.object({
      fields: z
        .array(
          z.object({
            fieldId: z.number().describe('Field ID'),
            fieldLabel: z.string().optional().describe('Field label'),
            fieldType: z
              .string()
              .optional()
              .describe('Field type (e.g. text, dropdown, number)'),
            options: z
              .array(z.any())
              .optional()
              .describe('Available options (for dropdown fields)')
          })
        )
        .describe('List of custom field definitions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result: any;
    if (ctx.input.entityType === 'project') {
      result = await client.listProjectFields();
    } else if (ctx.input.entityType === 'task') {
      result = await client.listTaskFields();
    } else {
      result = await client.listCompanyFields();
    }

    let fields = Array.isArray(result) ? result : (result.fields ?? result.data ?? []);

    return {
      output: { fields },
      message: `Found **${fields.length}** custom field(s) for ${ctx.input.entityType}.`
    };
  })
  .build();

export let createCustomField = SlateTool.create(spec, {
  name: 'Create Custom Field',
  key: 'create_custom_field',
  description: `Creates a new custom field definition in Rocketlane for projects, tasks, or companies. For dropdown-type fields, options can be specified.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      fieldLabel: z.string().describe('Display label for the field'),
      fieldType: z
        .string()
        .describe('Field type (e.g. text, number, dropdown, date, checkbox)'),
      entityType: z
        .string()
        .describe('Entity type this field belongs to (project, task, or company)'),
      options: z
        .array(
          z.object({
            label: z.string().describe('Option label'),
            value: z.string().describe('Option value')
          })
        )
        .optional()
        .describe('Options for dropdown-type fields')
    })
  )
  .output(
    z.object({
      fieldId: z.number().describe('ID of the created field'),
      fieldLabel: z.string().optional().describe('Field label'),
      fieldType: z.string().optional().describe('Field type'),
      entityType: z.string().optional().describe('Entity type')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createField({
      fieldLabel: ctx.input.fieldLabel,
      fieldType: ctx.input.fieldType,
      entityType: ctx.input.entityType,
      options: ctx.input.options
    });

    return {
      output: result,
      message: `Custom field **${ctx.input.fieldLabel}** created successfully (ID: ${result.fieldId}).`
    };
  })
  .build();

export let deleteCustomField = SlateTool.create(spec, {
  name: 'Delete Custom Field',
  key: 'delete_custom_field',
  description: `Permanently deletes a custom field definition from Rocketlane. This removes the field from all resources.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      fieldId: z.number().describe('ID of the custom field to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteField(ctx.input.fieldId);

    return {
      output: { success: true },
      message: `Custom field ${ctx.input.fieldId} has been **deleted**.`
    };
  })
  .build();
