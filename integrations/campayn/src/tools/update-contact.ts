import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateContact = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Update an existing contact's profile information. Provide the contact ID and any fields to update.`,
  constraints: [
    'Any fields not included in the update will be cleared/removed from the contact. To preserve existing data, first retrieve the contact and include all fields you want to keep.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact to update'),
      email: z.string().optional().describe('Email address'),
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
        .describe('Custom fields')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the contact was updated successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let input = ctx.input;

    let body: Record<string, unknown> = {};
    if (input.email !== undefined) body.email = input.email;
    if (input.firstName !== undefined) body.first_name = input.firstName;
    if (input.lastName !== undefined) body.last_name = input.lastName;
    if (input.title !== undefined) body.title = input.title;
    if (input.company !== undefined) body.company = input.company;
    if (input.address !== undefined) body.address = input.address;
    if (input.city !== undefined) body.city = input.city;
    if (input.state !== undefined) body.state = input.state;
    if (input.zip !== undefined) body.zip = input.zip;
    if (input.country !== undefined) body.country = input.country;
    if (input.phones !== undefined) body.phones = input.phones;
    if (input.sites !== undefined) body.sites = input.sites;
    if (input.social !== undefined) body.social = input.social;
    if (input.customFields !== undefined)
      body.custom_fields = input.customFields.map(cf => ({
        field: cf.field,
        value: cf.value
      }));

    let result = await client.updateContact(input.contactId, body as any);

    return {
      output: { success: result.success },
      message: `Updated contact ${input.contactId}.`
    };
  })
  .build();
