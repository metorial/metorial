import { SlateTool } from 'slates';
import { z } from 'zod';
import { BidsketchClient } from '../lib/client';
import { spec } from '../spec';

export let createClient = SlateTool.create(spec, {
  name: 'Create Client',
  key: 'create_client',
  description: `Create a new client record in Bidsketch. Requires first name, last name, and email. Optionally set phone, website, full mailing address, private notes, and a secondary contact person.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      firstName: z.string().describe('Client first name'),
      lastName: z.string().describe('Client last name'),
      email: z.string().describe('Client email address'),
      phone: z.string().optional().describe('Phone number'),
      website: z.string().optional().describe('Website URL'),
      address: z.string().optional().describe('Street address'),
      address2: z.string().optional().describe('Address line 2'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State/province'),
      postalZip: z.string().optional().describe('Postal/ZIP code'),
      locale: z.string().optional().describe('Country/locale'),
      notes: z.string().optional().describe('Private notes about the client'),
      otherContact: z
        .object({
          firstName: z.string().describe('Secondary contact first name'),
          lastName: z.string().describe('Secondary contact last name'),
          email: z.string().describe('Secondary contact email'),
          phone: z.string().optional().describe('Secondary contact phone')
        })
        .optional()
        .describe('Secondary contact person')
    })
  )
  .output(
    z.object({
      clientId: z.number().describe('ID of the newly created client'),
      firstName: z.string().describe('First name'),
      lastName: z.string().describe('Last name'),
      email: z.string().describe('Email address'),
      url: z.string().describe('API URL'),
      appUrl: z.string().describe('Bidsketch app URL'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BidsketchClient(ctx.auth.token);

    let body: Record<string, unknown> = {
      first_name: ctx.input.firstName,
      last_name: ctx.input.lastName,
      email: ctx.input.email
    };

    if (ctx.input.phone) body.phone = ctx.input.phone;
    if (ctx.input.website) body.website = ctx.input.website;
    if (ctx.input.address) body.address = ctx.input.address;
    if (ctx.input.address2) body.address2 = ctx.input.address2;
    if (ctx.input.city) body.city = ctx.input.city;
    if (ctx.input.state) body.state = ctx.input.state;
    if (ctx.input.postalZip) body.postal_zip = ctx.input.postalZip;
    if (ctx.input.locale) body.locale = ctx.input.locale;
    if (ctx.input.notes) body.notes = ctx.input.notes;

    if (ctx.input.otherContact) {
      body.other_contact = {
        first_name: ctx.input.otherContact.firstName,
        last_name: ctx.input.otherContact.lastName,
        email: ctx.input.otherContact.email,
        phone: ctx.input.otherContact.phone
      };
    }

    let c = await client.createClient(body);

    return {
      output: {
        clientId: c.id,
        firstName: c.first_name,
        lastName: c.last_name,
        email: c.email,
        url: c.url,
        appUrl: c.app_url,
        createdAt: c.created_at
      },
      message: `Created client **${c.first_name} ${c.last_name}** (ID: ${c.id}).`
    };
  })
  .build();
