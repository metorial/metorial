import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createField = SlateTool.create(spec, {
  name: 'Create Custom Field',
  key: 'create_field',
  description: `Create a custom field for contacts within a brand. Fields store data on contacts and can be used as merge tags in campaigns and for segmentation. It is recommended to define fields with proper data types upfront for correct segmentation behavior.`,
  instructions: [
    'The merge_tag_name is used to reference the field in email templates, e.g., *|FIRST_NAME|*.',
    'Field types: "text" for strings, "integer" for numbers, "date" for dates (YYYY-MM-DD).'
  ]
})
  .input(
    z.object({
      brandId: z.string().describe('ID of the brand'),
      name: z.string().describe('Display name of the field (1-50 chars)'),
      mergeTagName: z
        .string()
        .describe('Name used to reference the field in templates and API (max 50 chars)'),
      fieldType: z.enum(['date', 'integer', 'text']).describe('Data type of the field'),
      sampleValue: z
        .string()
        .optional()
        .describe('Sample value used when sending test campaigns (max 50 chars)')
    })
  )
  .output(
    z.object({
      fieldId: z.string().describe('Field unique identifier'),
      name: z.string().describe('Field display name'),
      fieldType: z.string().describe('Field data type'),
      mergeTagName: z.string().describe('Merge tag reference name'),
      sampleValue: z.string().describe('Sample value for test campaigns'),
      createdAt: z.string().describe('Creation timestamp (ISO 8601)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let field = await client.createField(ctx.input.brandId, {
      name: ctx.input.name,
      merge_tag_name: ctx.input.mergeTagName,
      type: ctx.input.fieldType,
      sample_value: ctx.input.sampleValue
    });

    return {
      output: {
        fieldId: field.id,
        name: field.name,
        fieldType: field.type,
        mergeTagName: field.merge_tag_name,
        sampleValue: field.sample_value,
        createdAt: new Date(field.created * 1000).toISOString()
      },
      message: `Created field **${field.name}** (type: ${field.type}, merge tag: ${field.merge_tag_name}).`
    };
  })
  .build();
