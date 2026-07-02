import { SlateTool } from 'slates';
import { z } from 'zod';
import { PrintMailClient } from '../lib/client';
import { spec } from '../spec';

let contactSchema = z.object({
  contactId: z.string().describe('Contact ID'),
  firstName: z.string().optional().nullable().describe('First name'),
  lastName: z.string().optional().nullable().describe('Last name'),
  companyName: z.string().optional().nullable().describe('Company name'),
  addressLine1: z.string().optional().nullable().describe('Primary address line'),
  city: z.string().optional().nullable().describe('City'),
  provinceOrState: z.string().optional().nullable().describe('Province or state'),
  postalOrZip: z.string().optional().nullable().describe('Postal or ZIP code'),
  country: z.string().optional().nullable().describe('Country code'),
  addressStatus: z.string().optional().nullable().describe('Address verification status')
});

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `List and search contacts in PostGrid. Supports pagination and text search to find specific contacts.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search query to filter contacts'),
      skip: z.number().optional().describe('Number of records to skip for pagination'),
      limit: z.number().optional().describe('Maximum number of records to return (default 10)')
    })
  )
  .output(
    z.object({
      contacts: z.array(contactSchema).describe('List of contacts'),
      totalCount: z.number().describe('Total number of matching contacts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PrintMailClient(ctx.auth.token);
    let result = await client.listContacts(ctx.input);

    let contacts = (result.data || []).map((c: any) => ({
      contactId: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      companyName: c.companyName,
      addressLine1: c.addressLine1,
      city: c.city,
      provinceOrState: c.provinceOrState,
      postalOrZip: c.postalOrZip,
      country: c.country,
      addressStatus: c.addressStatus
    }));

    return {
      output: {
        contacts,
        totalCount: result.totalCount || 0
      },
      message: `Found **${result.totalCount || 0}** contacts, returning ${contacts.length}.`
    };
  })
  .build();
