import { SlateTool } from 'slates';
import { z } from 'zod';
import { PrintMailClient } from '../lib/client';
import { spec } from '../spec';

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Create a new contact in PostGrid for use as a sender or recipient in mail orders. Contacts store name, company, address, and contact information that can be reused across multiple mailings.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      firstName: z.string().optional().describe('First name of the contact'),
      lastName: z.string().optional().describe('Last name of the contact'),
      companyName: z.string().optional().describe('Company or organization name'),
      jobTitle: z.string().optional().describe('Job title of the contact'),
      email: z.string().optional().describe('Email address'),
      phoneNumber: z.string().optional().describe('Phone number'),
      addressLine1: z.string().describe('Primary street address'),
      addressLine2: z
        .string()
        .optional()
        .describe('Secondary address line (suite, apt, etc.)'),
      city: z.string().optional().describe('City name'),
      provinceOrState: z.string().optional().describe('Province or state'),
      postalOrZip: z.string().optional().describe('Postal or ZIP code'),
      country: z.string().optional().describe('Two-letter country code (e.g., US, CA)'),
      metadata: z.record(z.string(), z.any()).optional().describe('Custom key-value metadata')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('ID of the created contact'),
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
    let contact = await client.createContact(ctx.input);

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
        country: contact.country,
        addressStatus: contact.addressStatus,
        createdAt: contact.createdAt
      },
      message: `Created contact **${contact.firstName || ''} ${contact.lastName || ''}** (${contact.id}) with address status: ${contact.addressStatus || 'unknown'}.`
    };
  })
  .build();
