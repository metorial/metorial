import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let inputSchema = z
  .object({
    objectType: z
      .string()
      .describe('Object type slug such as "contacts", "companies", or a custom object slug'),
    objectId: z.number().int().optional().describe('Record ID to update'),
    email: z
      .string()
      .email()
      .optional()
      .describe('Contact email to update instead of using an ID'),
    name: z.string().optional().describe('New display name for the record'),
    fields: z
      .record(z.string(), z.any())
      .optional()
      .describe('System and custom fields to update'),
    profileImageUrl: z.string().url().optional().describe('New avatar or logo URL')
  })
  .refine(value => value.objectId !== undefined || !!value.email, {
    message: 'Provide either objectId or email.',
    path: ['objectId']
  })
  .refine(
    value =>
      value.name !== undefined ||
      value.fields !== undefined ||
      value.profileImageUrl !== undefined,
    {
      message: 'Provide at least one field to update.',
      path: ['fields']
    }
  );

export let updateObject = SlateTool.create(spec, {
  name: 'Update Object',
  key: 'update_object',
  description:
    'Update one or more fields on an existing item record. Supports both system fields and custom fields, leaving unspecified fields unchanged.'
})
  .input(inputSchema)
  .output(
    z.object({
      objectRecord: z.record(z.string(), z.any()).describe('The updated record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let objectRecord = await client.updateObject(ctx.input.objectType, {
      objectId: ctx.input.objectId,
      email: ctx.input.email,
      name: ctx.input.name,
      fields: ctx.input.fields,
      profileImageUrl: ctx.input.profileImageUrl
    });

    return {
      output: {
        objectRecord
      },
      message: `Updated a record in **${ctx.input.objectType}**.`
    };
  })
  .build();
