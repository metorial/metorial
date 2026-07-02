import { SlateTool } from 'slates';
import { z } from 'zod';
import { MotionClient } from '../lib/client';
import { spec } from '../spec';

export let listCustomFields = SlateTool.create(spec, {
  name: 'List Custom Fields',
  key: 'list_custom_fields',
  description: `List all custom fields defined in a workspace. Returns field IDs and types that can be used when setting custom field values on tasks and projects.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z.string().describe('ID of the workspace to list custom fields from')
    })
  )
  .output(
    z.object({
      customFields: z
        .array(
          z.object({
            customFieldId: z.string().describe('Unique identifier of the custom field'),
            type: z
              .string()
              .describe(
                'Field type (text, number, url, date, select, multiSelect, person, multiPerson, email, phone, checkbox, relatedTo)'
              )
          })
        )
        .describe('List of custom fields in the workspace')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MotionClient({ token: ctx.auth.token });

    let fields = await client.listCustomFields(ctx.input.workspaceId);
    let fieldList = Array.isArray(fields) ? fields : [];

    let customFields = fieldList.map((f: any) => ({
      customFieldId: f.id,
      type: f.field || f.type
    }));

    return {
      output: {
        customFields
      },
      message: `Found **${customFields.length}** custom field(s)`
    };
  })
  .build();

export let createCustomField = SlateTool.create(spec, {
  name: 'Create Custom Field',
  key: 'create_custom_field',
  description: `Create a new custom field in a workspace. Supports types: text, number, url, date, select, multiSelect, person, multiPerson, email, phone, checkbox, and relatedTo. Select fields can include predefined options with colors.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      workspaceId: z.string().describe('ID of the workspace to create the custom field in'),
      name: z.string().describe('Name for the custom field'),
      type: z
        .enum([
          'text',
          'number',
          'url',
          'date',
          'select',
          'multiSelect',
          'person',
          'multiPerson',
          'email',
          'phone',
          'checkbox',
          'relatedTo'
        ])
        .describe('Type of the custom field'),
      metadata: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Advanced configuration. For number: { format: "plain"|"formatted"|"percent" }. For checkbox: { toggle: boolean }. For select/multiSelect: { options: [{ id, value, color }] }.'
        )
    })
  )
  .output(
    z.object({
      customFieldId: z.string().describe('ID of the created custom field'),
      type: z.string().describe('Type of the custom field')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MotionClient({ token: ctx.auth.token });

    let field = await client.createCustomField(ctx.input.workspaceId, {
      name: ctx.input.name,
      type: ctx.input.type,
      metadata: ctx.input.metadata
    });

    return {
      output: {
        customFieldId: field.id,
        type: field.type
      },
      message: `Created custom field **${ctx.input.name}** (${ctx.input.type})`
    };
  })
  .build();

export let deleteCustomField = SlateTool.create(spec, {
  name: 'Delete Custom Field',
  key: 'delete_custom_field',
  description: `Permanently delete a custom field from a workspace. This removes the field definition and all its values from tasks and projects.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      workspaceId: z.string().describe('ID of the workspace the custom field belongs to'),
      customFieldId: z.string().describe('ID of the custom field to delete')
    })
  )
  .output(
    z.object({
      customFieldId: z.string().describe('ID of the deleted custom field'),
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MotionClient({ token: ctx.auth.token });

    await client.deleteCustomField(ctx.input.workspaceId, ctx.input.customFieldId);

    return {
      output: {
        customFieldId: ctx.input.customFieldId,
        deleted: true
      },
      message: `Deleted custom field \`${ctx.input.customFieldId}\``
    };
  })
  .build();

export let setCustomFieldValue = SlateTool.create(spec, {
  name: 'Set Custom Field Value',
  key: 'set_custom_field_value',
  description: `Set a custom field value on a task or project. Can also remove a custom field value by providing the value ID to remove.`,
  instructions: [
    'To set a value, provide `customFieldInstanceId`, `fieldType`, and `fieldValue`.',
    'To remove a value, provide `removeValueId` instead.',
    'Use the `targetType` to specify whether the target is a task or project.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      targetType: z
        .enum(['task', 'project'])
        .describe('Whether to set the field on a task or project'),
      targetId: z.string().describe('ID of the task or project'),
      customFieldInstanceId: z
        .string()
        .optional()
        .describe('ID of the custom field instance to set'),
      fieldType: z
        .enum([
          'text',
          'number',
          'url',
          'date',
          'select',
          'multiSelect',
          'person',
          'multiPerson',
          'email',
          'phone',
          'checkbox',
          'relatedTo'
        ])
        .optional()
        .describe('Type of the custom field value'),
      fieldValue: z.union([z.string(), z.number()]).optional().describe('The value to set'),
      removeValueId: z
        .string()
        .optional()
        .describe('ID of the custom field value to remove instead of setting')
    })
  )
  .output(
    z.object({
      type: z.string().optional().describe('Field type that was set'),
      value: z.union([z.string(), z.number()]).optional().describe('Value that was set'),
      removed: z.boolean().optional().describe('Whether a value was removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MotionClient({ token: ctx.auth.token });

    if (ctx.input.removeValueId) {
      if (ctx.input.targetType === 'task') {
        await client.removeCustomFieldFromTask(ctx.input.targetId, ctx.input.removeValueId);
      } else {
        await client.removeCustomFieldFromProject(ctx.input.targetId, ctx.input.removeValueId);
      }
      return {
        output: {
          removed: true
        },
        message: `Removed custom field value from ${ctx.input.targetType} \`${ctx.input.targetId}\``
      };
    }

    if (
      !ctx.input.customFieldInstanceId ||
      !ctx.input.fieldType ||
      ctx.input.fieldValue === undefined
    ) {
      throw new Error(
        'customFieldInstanceId, fieldType, and fieldValue are required when setting a value'
      );
    }

    let result: any;
    if (ctx.input.targetType === 'task') {
      result = await client.addCustomFieldToTask(ctx.input.targetId, {
        customFieldInstanceId: ctx.input.customFieldInstanceId,
        value: { type: ctx.input.fieldType, value: ctx.input.fieldValue }
      });
    } else {
      result = await client.addCustomFieldToProject(ctx.input.targetId, {
        customFieldInstanceId: ctx.input.customFieldInstanceId,
        value: { type: ctx.input.fieldType, value: ctx.input.fieldValue }
      });
    }

    return {
      output: {
        type: result.type,
        value: result.value
      },
      message: `Set custom field value on ${ctx.input.targetType} \`${ctx.input.targetId}\``
    };
  })
  .build();
