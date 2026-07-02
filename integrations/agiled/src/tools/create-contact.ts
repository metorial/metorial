import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Create a new contact (client, lead, or prospect) in Agiled. Use this to add new people or companies to your CRM with their name, email, phone, and company details.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Full name of the contact'),
      email: z.string().optional().describe('Email address of the contact'),
      phone: z.string().optional().describe('Phone number of the contact'),
      companyName: z.string().optional().describe('Company/organization name'),
      address: z.string().optional().describe('Street address'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State or province'),
      country: z.string().optional().describe('Country'),
      postalCode: z.string().optional().describe('Postal/ZIP code'),
      website: z.string().optional().describe('Website URL'),
      notes: z.string().optional().describe('Additional notes about the contact')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('ID of the created contact'),
      name: z.string().describe('Name of the contact'),
      email: z.string().optional().describe('Email of the contact')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      brand: ctx.auth.brand
    });

    let result = await client.createContact({
      client_name: ctx.input.name,
      client_email: ctx.input.email,
      phone: ctx.input.phone,
      company_name: ctx.input.companyName,
      address: ctx.input.address,
      city: ctx.input.city,
      state: ctx.input.state,
      country: ctx.input.country,
      postal_code: ctx.input.postalCode,
      website: ctx.input.website,
      note: ctx.input.notes
    });

    let contact = result.data;

    return {
      output: {
        contactId: String(contact.id ?? ''),
        name: String(contact.client_name ?? contact.name ?? ctx.input.name),
        email: (contact.client_email as string | undefined) ?? ctx.input.email
      },
      message: `Created contact **${ctx.input.name}**${ctx.input.email ? ` (${ctx.input.email})` : ''}.`
    };
  })
  .build();
