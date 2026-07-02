import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Create a new contact (person) in Salesflare. Set name, email, phone numbers, account, tags, addresses, positions, social profiles, and custom fields. Use **force=false** to skip creation if a contact with the same email already exists.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      email: z.string().optional().describe('Contact email address'),
      firstname: z.string().optional().describe('First name'),
      lastname: z.string().optional().describe('Last name'),
      prefix: z.string().optional().describe('Name prefix (e.g., Mr., Dr.)'),
      suffix: z.string().optional().describe('Name suffix (e.g., Jr., III)'),
      accountId: z.number().optional().describe('Account ID to associate this contact with'),
      owner: z.number().optional().describe('User ID of the contact owner'),
      phoneNumber: z.string().optional().describe('Primary phone number'),
      mobilePhoneNumber: z.string().optional().describe('Mobile phone number'),
      birthDate: z.string().optional().describe('Birth date (ISO 8601)'),
      tags: z.array(z.string()).optional().describe('Tag names to assign'),
      address: z
        .object({
          city: z.string().optional(),
          country: z.string().optional(),
          stateRegion: z.string().optional(),
          street: z.string().optional(),
          zip: z.string().optional()
        })
        .optional()
        .describe('Contact address'),
      position: z
        .object({
          organisation: z.string().optional().describe('Company/organisation name'),
          role: z.string().optional().describe('Job title/role')
        })
        .optional()
        .describe('Contact position/role'),
      socialProfiles: z.array(z.string()).optional().describe('Social profile URLs'),
      custom: z.record(z.string(), z.any()).optional().describe('Custom field values'),
      force: z
        .boolean()
        .optional()
        .default(true)
        .describe('When false, skip creation if same email exists')
    })
  )
  .output(
    z.object({
      contactId: z.number().describe('ID of the created contact'),
      contact: z.record(z.string(), z.any()).describe('Created contact data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let data: Record<string, any> = {};
    if (ctx.input.email) data.email = ctx.input.email;
    if (ctx.input.firstname) data.firstname = ctx.input.firstname;
    if (ctx.input.lastname) data.lastname = ctx.input.lastname;
    if (ctx.input.prefix) data.prefix = ctx.input.prefix;
    if (ctx.input.suffix) data.suffix = ctx.input.suffix;
    if (ctx.input.accountId) data.account = ctx.input.accountId;
    if (ctx.input.owner) data.owner = ctx.input.owner;
    if (ctx.input.phoneNumber) data.phone_number = ctx.input.phoneNumber;
    if (ctx.input.mobilePhoneNumber) data.mobile_phone_number = ctx.input.mobilePhoneNumber;
    if (ctx.input.birthDate) data.birth_date = ctx.input.birthDate;
    if (ctx.input.tags) data.tags = ctx.input.tags;
    if (ctx.input.socialProfiles) data.social_profiles = ctx.input.socialProfiles;
    if (ctx.input.custom) data.custom = ctx.input.custom;
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

    let result = await client.createContact(data, ctx.input.force);
    let contactData = Array.isArray(result) ? result[0] : result;
    let contactId = contactData?.id ?? 0;

    return {
      output: {
        contactId,
        contact: contactData
      },
      message:
        `Created contact **${ctx.input.firstname || ''} ${ctx.input.lastname || ''}** (ID: ${contactId}).`.trim()
    };
  })
  .build();
