import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createProperty = SlateTool.create(spec, {
  name: 'Create Contact Property',
  key: 'create_property',
  description:
    'Create a custom contact property for text, numbers, dates, or longer text. Use the returned property ID in customFields when creating or updating contacts.',
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      name: z.string().min(3).max(30).describe('Name of the new custom contact property'),
      type: z
        .enum(['text', 'number', 'date', 'textarea'])
        .describe('Property value type; cannot be changed after creation'),
      description: z
        .string()
        .min(3)
        .max(500)
        .optional()
        .describe('Description of the custom contact property')
    })
  )
  .output(
    z
      .object({
        propertyId: z.string().optional().describe('ID of the created custom property'),
        name: z.string().describe('Name of the custom property'),
        type: z.string().describe('Property type')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).createProperty(ctx.input);
    let data = result?.data ?? result;
    return {
      output: {
        ...data,
        propertyId: data?.id ?? data?.enc_id,
        name: ctx.input.name,
        type: ctx.input.type
      },
      message: `Created contact property ${ctx.input.name}.`
    };
  })
  .build();
