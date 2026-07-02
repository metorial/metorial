import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let reverseEmailLookup = SlateTool.create(spec, {
  name: 'Reverse Email Lookup',
  key: 'reverse_email_lookup',
  description: `Find the name and address associated with an email address. Returns the owner's name, phone, phone type, phone carrier, postal address, and more. Useful for enriching contact records from email addresses.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address to look up')
    })
  )
  .output(
    z.object({
      email: z.string().optional().describe('The queried email address'),
      firstName: z.string().optional().describe('First name of the email owner'),
      lastName: z.string().optional().describe('Last name of the email owner'),
      business: z.string().optional().describe('Business name if applicable'),
      phone: z.string().optional().describe('Phone number'),
      phoneType: z.string().optional().describe('Type of phone'),
      phoneCarrier: z.string().optional().describe('Phone carrier name'),
      address: z.string().optional().describe('Street address'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State'),
      zip: z.string().optional().describe('ZIP code')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let raw = await client.reverseEmail(ctx.input.email);

    let result = {
      email: raw.email,
      firstName: raw.firstname,
      lastName: raw.lastname,
      business: raw.business,
      phone: raw.phone,
      phoneType: raw.phone_type,
      phoneCarrier: raw.phone_carrier,
      address: raw.address,
      city: raw.city,
      state: raw.state,
      zip: raw.zip
    };

    return {
      output: result,
      message: `Looked up contact information for email **${ctx.input.email}**.`
    };
  })
  .build();
