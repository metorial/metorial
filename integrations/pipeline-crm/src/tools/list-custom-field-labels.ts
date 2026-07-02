import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCustomFieldLabels = SlateTool.create(spec, {
  name: 'List Custom Field Labels',
  key: 'list_custom_field_labels',
  description: `Retrieve custom field label definitions for a given resource type (deal, person, or company). Returns field IDs, names, and types needed to read/write custom field values on records.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      resourceType: z
        .enum(['deal', 'person', 'company'])
        .describe('Resource type to list custom fields for')
    })
  )
  .output(
    z.object({
      customFieldLabels: z
        .array(
          z.object({
            labelId: z
              .number()
              .describe('Custom field label ID (use as custom_label_<id> key)'),
            name: z
              .string()
              .nullable()
              .optional()
              .describe('Display name of the custom field'),
            fieldType: z
              .string()
              .nullable()
              .optional()
              .describe('Field type (text, currency, dropdown, date, boolean, numeric, etc.)'),
            isRequired: z
              .boolean()
              .nullable()
              .optional()
              .describe('Whether the field is required')
          })
        )
        .describe('List of custom field label definitions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      appKey: ctx.auth.appKey
    });

    let labels = await client.listCustomFieldLabels(ctx.input.resourceType);

    let labelList = (Array.isArray(labels) ? labels : []).map((label: any) => ({
      labelId: label.id,
      name: label.name ?? null,
      fieldType: label.field_type ?? null,
      isRequired: label.is_required ?? null
    }));

    return {
      output: {
        customFieldLabels: labelList
      },
      message: `Found **${labelList.length}** custom field labels for **${ctx.input.resourceType}**`
    };
  })
  .build();
