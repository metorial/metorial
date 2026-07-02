import { SlateTool } from 'slates';
import { z } from 'zod';
import { BookingmoodClient } from '../lib/client';
import { spec } from '../spec';

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Creates a new contact (guest/customer) with personal details, address, and optional custom metadata.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Email address'),
      phone: z.string().optional().describe('Phone number'),
      companyName: z.string().optional().describe('Company name'),
      street: z.string().optional().describe('Street address'),
      street2: z.string().optional().describe('Street address line 2'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State'),
      province: z.string().optional().describe('Province'),
      zip: z.string().optional().describe('Postal code'),
      country: z.string().optional().describe('Country'),
      countryCode: z.string().optional().describe('Country code'),
      language: z.string().optional().describe('Preferred language'),
      notes: z.string().optional().describe('Internal notes'),
      meta: z.array(z.any()).optional().describe('Custom key-value metadata')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('UUID of the created contact'),
      name: z.string().nullable().describe('Full name'),
      email: z.string().nullable().describe('Email address'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BookingmoodClient(ctx.auth.token);

    let data: Record<string, any> = {};
    if (ctx.input.firstName !== undefined) data.first_name = ctx.input.firstName;
    if (ctx.input.lastName !== undefined) data.last_name = ctx.input.lastName;
    if (ctx.input.email !== undefined) data.email = ctx.input.email;
    if (ctx.input.phone !== undefined) data.phone = ctx.input.phone;
    if (ctx.input.companyName !== undefined) data.company_name = ctx.input.companyName;
    if (ctx.input.street !== undefined) data.street = ctx.input.street;
    if (ctx.input.street2 !== undefined) data.street2 = ctx.input.street2;
    if (ctx.input.city !== undefined) data.city = ctx.input.city;
    if (ctx.input.state !== undefined) data.state = ctx.input.state;
    if (ctx.input.province !== undefined) data.province = ctx.input.province;
    if (ctx.input.zip !== undefined) data.zip = ctx.input.zip;
    if (ctx.input.country !== undefined) data.country = ctx.input.country;
    if (ctx.input.countryCode !== undefined) data.country_code = ctx.input.countryCode;
    if (ctx.input.language !== undefined) data.language = ctx.input.language;
    if (ctx.input.notes !== undefined) data.notes = ctx.input.notes;
    if (ctx.input.meta !== undefined) data.meta = ctx.input.meta;

    let result = await client.createContact(data);

    return {
      output: {
        contactId: result.id,
        name: result.name ?? null,
        email: result.email ?? null,
        createdAt: result.created_at
      },
      message: `Contact **${result.name || result.email || result.id}** created successfully.`
    };
  })
  .build();
