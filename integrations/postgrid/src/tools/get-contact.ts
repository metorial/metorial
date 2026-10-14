import { SlateTool } from 'slates';
import { z } from 'zod';
import { PrintMailClient } from '../lib/client';
import { spec } from '../spec';

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieve a PostGrid contact by ID to inspect its address and verification status before sending mail. Use list_contacts to discover contact IDs.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      contactId: z.string().describe('Contact ID. Use list_contacts to discover contacts.')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('Contact ID'),
      firstName: z.string().optional().nullable().describe('First name'),
      lastName: z.string().optional().nullable().describe('Last name'),
      companyName: z.string().optional().nullable().describe('Company name'),
      addressLine1: z.string().optional().nullable().describe('Primary address line'),
      addressLine2: z.string().optional().nullable().describe('Secondary address line'),
      city: z.string().optional().nullable().describe('City'),
      provinceOrState: z.string().optional().nullable().describe('Province or state'),
      postalOrZip: z.string().optional().nullable().describe('Postal or ZIP code'),
      country: z.string().optional().nullable().describe('Country code'),
      addressStatus: z.string().optional().nullable().describe('Address verification status'),
      createdAt: z.string().optional().nullable().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PrintMailClient(ctx.auth.token);
    let contact = await client.getContact(ctx.input.contactId);

    return {
      output: {
        contactId: contact.id,
        firstName: contact.firstName,
        lastName: contact.lastName,
        companyName: contact.companyName,
        addressLine1: contact.addressLine1,
        addressLine2: contact.addressLine2,
        city: contact.city,
        provinceOrState: contact.provinceOrState,
        postalOrZip: contact.postalOrZip,
        country: contact.countryCode ?? contact.country,
        addressStatus: contact.addressStatus,
        createdAt: contact.createdAt
      },
      message: `Contact **${contact.firstName || ''} ${contact.lastName || ''}** (${contact.id}) with address status: ${contact.addressStatus || 'unknown'}.`
    };
  })
  .build();
