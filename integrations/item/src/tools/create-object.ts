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
        .trim()
        .min(1)
        .describe('Object type slug such as "contacts", "companies", or a custom object slug'),
      name: z.string().trim().min(1).describe('Display name for the record'),
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
        .describe('The record returned after item applies its matching rules'),
      objectId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Record ID when returned by item')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let objectRecord = await client.createObject(ctx.input.objectType, {
      name: ctx.input.name,
      fields: ctx.input.fields,
      profileImageUrl: ctx.input.profileImageUrl
    });
    let objectId =
      typeof objectRecord.id === 'number' &&
      Number.isInteger(objectRecord.id) &&
      objectRecord.id > 0
        ? objectRecord.id
        : undefined;

    return {
      output: {
        objectRecord,
        objectId
      },
      message: `Saved a record in **${ctx.input.objectType}** using item matching rules${objectId ? ` (ID **${objectId}**)` : ''}.`
    };
  })
  .build();
