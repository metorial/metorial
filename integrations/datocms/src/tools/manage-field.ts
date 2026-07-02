import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageField = SlateTool.create(spec, {
  name: 'Manage Field',
  key: 'manage_field',
  description: `Create, update, or delete fields on a content model. Fields define the structure and types of data that records can hold. Supported types include string, text, integer, float, boolean, date, date_time, json, file, gallery, link, links, rich_text, structured_text, slug, seo, color, lat_lon, video, and more.`,
  instructions: [
    'When creating a field, modelId, label, apiKey, and fieldType are required.',
    'Validators and appearance settings depend on the field type.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete'])
        .describe('Action to perform on the field'),
      modelId: z
        .string()
        .optional()
        .describe('Model ID to add the field to (required for create)'),
      fieldId: z.string().optional().describe('Field ID (required for update and delete)'),
      label: z.string().optional().describe('Display label for the field'),
      apiKey: z.string().optional().describe('API key identifier for the field'),
      fieldType: z
        .string()
        .optional()
        .describe(
          'Field type (e.g. "string", "text", "integer", "boolean", "link", "file", "structured_text")'
        ),
      localized: z
        .boolean()
        .optional()
        .describe('If true, the field supports multiple locales'),
      validators: z
        .record(z.string(), z.any())
        .optional()
        .describe('Validation rules for the field'),
      appearance: z
        .record(z.string(), z.any())
        .optional()
        .describe('Appearance/editor configuration for the field'),
      defaultValue: z.any().optional().describe('Default value for the field'),
      hint: z.string().optional().describe('Help text shown to editors'),
      position: z.number().optional().describe('Position of the field in the model')
    })
  )
  .output(
    z.object({
      field: z.any().describe('The field object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let { action, modelId, fieldId, label, apiKey, fieldType, ...rest } = ctx.input;

    if (action === 'create') {
      if (!modelId) throw new Error('modelId is required for create action');
      if (!label) throw new Error('label is required for create action');
      if (!apiKey) throw new Error('apiKey is required for create action');
      if (!fieldType) throw new Error('fieldType is required for create action');

      let attributes: Record<string, any> = {
        label,
        api_key: apiKey,
        field_type: fieldType
      };
      if (rest.localized !== undefined) attributes.localized = rest.localized;
      if (rest.validators) attributes.validators = rest.validators;
      if (rest.appearance) attributes.appearance = rest.appearance;
      if (rest.defaultValue !== undefined) attributes.default_value = rest.defaultValue;
      if (rest.hint) attributes.hint = rest.hint;
      if (rest.position !== undefined) attributes.position = rest.position;

      let field = await client.createField(modelId, attributes);
      return {
        output: { field },
        message: `Created field **${field.label}** (type: ${field.field_type}) on model ${modelId}.`
      };
    }

    if (action === 'update') {
      if (!fieldId) throw new Error('fieldId is required for update action');
      let attributes: Record<string, any> = {};
      if (label) attributes.label = label;
      if (apiKey) attributes.api_key = apiKey;
      if (fieldType) attributes.field_type = fieldType;
      if (rest.localized !== undefined) attributes.localized = rest.localized;
      if (rest.validators) attributes.validators = rest.validators;
      if (rest.appearance) attributes.appearance = rest.appearance;
      if (rest.defaultValue !== undefined) attributes.default_value = rest.defaultValue;
      if (rest.hint) attributes.hint = rest.hint;
      if (rest.position !== undefined) attributes.position = rest.position;

      let field = await client.updateField(fieldId, attributes);
      return {
        output: { field },
        message: `Updated field **${field.label}** (ID: ${field.id}).`
      };
    }

    if (action === 'delete') {
      if (!fieldId) throw new Error('fieldId is required for delete action');
      let field = await client.deleteField(fieldId);
      return {
        output: { field },
        message: `Deleted field with ID **${fieldId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
