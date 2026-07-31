import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { validateObjectLocator, validateObjectUpdate } from '../lib/validation';
import { spec } from '../spec';

let inputSchema = z.object({
  objectType: z
    .string()
    .trim()
    .min(1)
    .describe('Object type slug such as "contacts", "companies", or a custom object slug'),
  objectId: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Record ID to update. Provide exactly one of objectId or email.'),
  email: z
    .string()
    .email()
    .optional()
    .describe(
      'Contact email to update. Supported only for contact or contacts; provide exactly one of objectId or email.'
    ),
  name: z.string().trim().min(1).optional().describe('New display name for the record'),
  fields: z
    .record(z.string(), z.any())
    .optional()
    .describe('Non-empty object of system and custom fields to update'),
  profileImageUrl: z.string().url().optional().describe('New avatar or logo URL')
});

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
    validateObjectLocator(ctx.input.objectType, {
      objectId: ctx.input.objectId,
      email: ctx.input.email
    });
    validateObjectUpdate({
      name: ctx.input.name,
      fields: ctx.input.fields,
      profileImageUrl: ctx.input.profileImageUrl
    });
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
