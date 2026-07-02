import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let phoneSchema = z.object({
  value: z.string().describe('Phone number'),
  type: z.string().describe('Phone type (e.g. work, fax)')
});

let siteSchema = z.object({
  value: z.string().describe('Website URL'),
  type: z.string().describe('Site type (e.g. work)')
});

let socialSchema = z.object({
  value: z.string().describe('Social account identifier'),
  type: z.string().describe('Account type (e.g. work)'),
  protocol: z.string().describe('Social platform identifier')
});

let customFieldSchema = z.object({
  field: z.string().describe('Field name'),
  value: z.string().describe('Field value'),
  variable: z.string().optional().describe('Template variable name')
});

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieve the full profile details of a single contact by ID, including name, email, address, phone numbers, websites, social accounts, and custom fields.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact to retrieve')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('Unique identifier for the contact'),
      email: z.string().describe('Email address'),
      firstName: z.string().nullable().describe('First name'),
      lastName: z.string().nullable().describe('Last name'),
      title: z.string().describe('Job title'),
      company: z.string().describe('Company name'),
      address: z.string().describe('Street address'),
      countryId: z.string().describe('Country ID'),
      country: z.string().describe('Country name'),
      city: z.string().describe('City'),
      state: z.string().describe('State or province'),
      zip: z.string().describe('Postal/ZIP code'),
      birthday: z.string().describe('Birthday in YYYY-MM-DD format'),
      tags: z.string().describe('Tags'),
      phones: z.array(phoneSchema).describe('Phone numbers'),
      sites: z.array(siteSchema).describe('Websites'),
      social: z.array(socialSchema).describe('Social accounts'),
      customFields: z.array(customFieldSchema).describe('Custom fields'),
      imageUrl: z.string().describe('Profile image URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let contact = await client.getContact(ctx.input.contactId);

    return {
      output: {
        contactId: contact.id,
        email: contact.email,
        firstName: contact.first_name,
        lastName: contact.last_name,
        title: contact.title,
        company: contact.company,
        address: contact.address,
        countryId: contact.country_id,
        country: contact.country,
        city: contact.city,
        state: contact.state,
        zip: contact.zip,
        birthday: contact.birthday,
        tags: contact.tags,
        phones: contact.phones,
        sites: contact.sites,
        social: contact.social,
        customFields: contact.custom_fields.map(cf => ({
          field: cf.field,
          value: cf.value,
          variable: cf.variable
        })),
        imageUrl: contact.image_url
      },
      message: `Retrieved contact **${contact.first_name ?? ''} ${contact.last_name ?? ''}** (${contact.email}).`
    };
  })
  .build();
