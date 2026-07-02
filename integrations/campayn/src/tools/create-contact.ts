import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Create a new contact on a specific list. Only the email address is required; all other profile fields are optional. Supports phone numbers, websites, social accounts, and custom fields.`,
  instructions: [
    'Set failOnDuplicate to true if you want the request to fail when a contact with the same email already exists on the list.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      listId: z.string().describe('ID of the list to add the contact to'),
      email: z.string().describe('Email address of the contact (required)'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      title: z.string().optional().describe('Job title'),
      company: z.string().optional().describe('Company name'),
      address: z.string().optional().describe('Street address'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State or province'),
      zip: z.string().optional().describe('Postal/ZIP code'),
      country: z.string().optional().describe('Country name'),
      phones: z
        .array(
          z.object({
            value: z.string().describe('Phone number'),
            type: z.string().describe('Phone type (e.g. work, fax, home)')
          })
        )
        .optional()
        .describe('Phone numbers'),
      sites: z
        .array(
          z.object({
            value: z.string().describe('Website URL'),
            type: z.string().describe('Site type (e.g. work)')
          })
        )
        .optional()
        .describe('Websites'),
      social: z
        .array(
          z.object({
            value: z.string().describe('Social account identifier'),
            type: z.string().describe('Account type (e.g. work)'),
            protocol: z.string().describe('Social platform (e.g. facebook, twitter)')
          })
        )
        .optional()
        .describe('Social accounts'),
      customFields: z
        .array(
          z.object({
            field: z.string().describe('Field name'),
            value: z.string().describe('Field value')
          })
        )
        .optional()
        .describe('Custom fields'),
      failOnDuplicate: z
        .boolean()
        .optional()
        .describe('If true, fail when a duplicate email exists on the list')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the contact was created successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let input = ctx.input;

    let result = await client.createContact(input.listId, {
      email: input.email,
      first_name: input.firstName,
      last_name: input.lastName,
      title: input.title,
      company: input.company,
      address: input.address,
      city: input.city,
      state: input.state,
      zip: input.zip,
      country: input.country,
      phones: input.phones,
      sites: input.sites,
      social: input.social,
      custom_fields: input.customFields?.map(cf => ({ field: cf.field, value: cf.value })),
      failOnDuplicate: input.failOnDuplicate
    });

    return {
      output: { success: result.success },
      message: `Created contact **${input.email}** on list ${input.listId}.`
    };
  })
  .build();
