import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createObject = SlateTool.create(spec, {
  name: 'Create Object',
  key: 'create_object',
  description:
    'Create a new contact, company, or custom object record in item. Contacts and companies may deduplicate automatically based on item matching rules.'
})
  .input(
    z.object({
      objectType: z
        .string()
        .describe('Object type slug such as "contacts", "companies", or a custom object slug'),
      name: z.string().describe('Display name for the record'),
      fields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional system and custom fields to set on the record'),
      profileImageUrl: z
        .string()
        .url()
        .optional()
        .describe('Avatar URL for contacts or logo URL for companies')
    })
  )
  .output(
    z.object({
      objectRecord: z
        .record(z.string(), z.any())
        .describe('The created or deduplicated record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let objectRecord = await client.createObject(ctx.input.objectType, {
      name: ctx.input.name,
      fields: ctx.input.fields,
      profileImageUrl: ctx.input.profileImageUrl
    });

    return {
      output: {
        objectRecord
      },
      message: `Created a record in **${ctx.input.objectType}**.`
    };
  })
  .build();
