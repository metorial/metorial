import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateContact = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Update an existing contact in Salesflare. Modify name, email, phone numbers, account association, tags, address, position, social profiles, and custom fields. Set **accountId** to null to remove the account association.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      contactId: z.number().describe('ID of the contact to update'),
      email: z.string().optional().describe('Updated email address'),
      firstname: z.string().optional().describe('Updated first name'),
      lastname: z.string().optional().describe('Updated last name'),
      prefix: z.string().optional().describe('Updated name prefix'),
      suffix: z.string().optional().describe('Updated name suffix'),
      accountId: z
        .number()
        .nullable()
        .optional()
        .describe('Account ID to associate (null to remove)'),
      owner: z.number().optional().describe('Updated owner user ID'),
      phoneNumber: z.string().optional().describe('Updated primary phone number'),
      birthDate: z.string().optional().describe('Updated birth date (ISO 8601)'),
      tags: z.array(z.string()).optional().describe('Updated tag names'),
      address: z
        .object({
          city: z.string().optional(),
          country: z.string().optional(),
          stateRegion: z.string().optional(),
          street: z.string().optional(),
          zip: z.string().optional()
        })
        .optional()
        .describe('Updated address'),
      position: z
        .object({
          organisation: z.string().optional(),
          role: z.string().optional()
        })
        .optional()
        .describe('Updated position/role'),
      socialProfiles: z.array(z.string()).optional().describe('Updated social profile URLs'),
      custom: z.record(z.string(), z.any()).optional().describe('Updated custom field values'),
      archived: z.boolean().optional().describe('Set to true to archive the contact')
    })
  )
  .output(
    z.object({
      contact: z.record(z.string(), z.any()).describe('Updated contact data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let data: Record<string, any> = {};
    if (ctx.input.email !== undefined) data.email = ctx.input.email;
    if (ctx.input.firstname !== undefined) data.firstname = ctx.input.firstname;
    if (ctx.input.lastname !== undefined) data.lastname = ctx.input.lastname;
    if (ctx.input.prefix !== undefined) data.prefix = ctx.input.prefix;
    if (ctx.input.suffix !== undefined) data.suffix = ctx.input.suffix;
    if (ctx.input.accountId !== undefined) data.account = ctx.input.accountId;
    if (ctx.input.owner !== undefined) data.owner = ctx.input.owner;
    if (ctx.input.phoneNumber !== undefined) data.phone_number = ctx.input.phoneNumber;
    if (ctx.input.birthDate !== undefined) data.birth_date = ctx.input.birthDate;
    if (ctx.input.tags !== undefined) data.tags = ctx.input.tags;
    if (ctx.input.socialProfiles !== undefined)
      data.social_profiles = ctx.input.socialProfiles;
    if (ctx.input.custom !== undefined) data.custom = ctx.input.custom;
    if (ctx.input.archived !== undefined) data.archived = ctx.input.archived;
    if (ctx.input.address) {
      data.address = {
        city: ctx.input.address.city,
        country: ctx.input.address.country,
        state_region: ctx.input.address.stateRegion,
        street: ctx.input.address.street,
        zip: ctx.input.address.zip
      };
    }
    if (ctx.input.position) {
      data.position = {
        organisation: ctx.input.position.organisation,
        role: ctx.input.position.role
      };
    }

    let result = await client.updateContact(ctx.input.contactId, data);

    return {
      output: { contact: result },
      message: `Updated contact **${ctx.input.contactId}**.`
    };
  })
  .build();
