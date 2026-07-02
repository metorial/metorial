import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let contactSchema = z.object({
  contactId: z.string().describe('Unique contact identifier'),
  title: z.string().optional().describe('Title or salutation'),
  companyName: z.string().optional().describe('Company name'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name / surname'),
  street: z.string().optional().describe('Street address'),
  zip: z.string().optional().describe('ZIP / postal code'),
  city: z.string().optional().describe('City'),
  countryCode: z.string().optional().describe('Two-letter country code')
});

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `Retrieve all recipient contacts from your EchtPost account. Returns contact details including names, addresses, and IDs that can be used when sending postcards.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      contacts: z.array(contactSchema).describe('List of recipient contacts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.info('Fetching contacts');

    let contacts = await client.listContacts();

    let mapped = (Array.isArray(contacts) ? contacts : []).map((c: any) => ({
      contactId: c.id?.toString(),
      title: c.title,
      companyName: c.company_name,
      firstName: c.first,
      lastName: c.name,
      street: c.street,
      zip: c.zip,
      city: c.city,
      countryCode: c.country_code
    }));

    return {
      output: {
        contacts: mapped
      },
      message: `Found **${mapped.length}** contact(s).`
    };
  })
  .build();
