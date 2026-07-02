import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageFields = SlateTool.create(spec, {
  name: 'Manage Contact Fields',
  key: 'manage_fields',
  description: `Create or update custom contact fields. Fields store additional data on contacts (e.g., age, registration date). The field key is auto-generated on creation.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update']).describe('Whether to create or update a field'),
      fieldKey: z
        .string()
        .optional()
        .describe(
          'Key of the field to update (required for update, auto-generated on create)'
        ),
      name: z.string().describe('Display name of the field'),
      type: z
        .enum(['text', 'number', 'datetime', 'state', 'district', 'ward'])
        .describe('Data type of the field')
    })
  )
  .output(
    z.object({
      fieldKey: z.string().describe('Key of the field'),
      name: z.string().describe('Display name of the field'),
      type: z.string().describe('Data type of the field')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let field: any;

    if (ctx.input.action === 'create') {
      field = await client.createField({ name: ctx.input.name, type: ctx.input.type });
    } else {
      field = await client.updateField(ctx.input.fieldKey!, {
        name: ctx.input.name,
        type: ctx.input.type
      });
    }

    return {
      output: {
        fieldKey: field.key,
        name: field.name,
        type: field.type
      },
      message: `Field **${field.name}** (key: ${field.key}) ${ctx.input.action === 'create' ? 'created' : 'updated'} successfully.`
    };
  })
  .build();
