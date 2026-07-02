import { SlateTool } from 'slates';
import { z } from 'zod';
import { FeatheryClient } from '../lib/client';
import { spec } from '../spec';

export let listHiddenFields = SlateTool.create(spec, {
  name: 'List Hidden Fields',
  key: 'list_hidden_fields',
  description: `List all hidden fields. Hidden fields store data not visible on forms but accessible via the API and integrations.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      hiddenFields: z
        .array(
          z.object({
            fieldId: z.string().describe('Unique field identifier')
          })
        )
        .describe('List of hidden fields')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FeatheryClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let fields = await client.listHiddenFields();

    let mapped = fields.map((f: any) => ({
      fieldId: f.field_id || f.id
    }));

    return {
      output: { hiddenFields: mapped },
      message: `Found **${mapped.length}** hidden field(s).`
    };
  })
  .build();

export let createHiddenField = SlateTool.create(spec, {
  name: 'Create Hidden Field',
  key: 'create_hidden_field',
  description: `Create a new hidden field that stores data not visible on forms but accessible via the API and integrations.`
})
  .input(
    z.object({
      fieldId: z.string().describe('Unique identifier for the hidden field')
    })
  )
  .output(
    z.object({
      fieldId: z.string().describe('ID of the created hidden field'),
      created: z.boolean().describe('Whether the field was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FeatheryClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    await client.createHiddenField(ctx.input.fieldId);

    return {
      output: {
        fieldId: ctx.input.fieldId,
        created: true
      },
      message: `Created hidden field **${ctx.input.fieldId}**.`
    };
  })
  .build();
