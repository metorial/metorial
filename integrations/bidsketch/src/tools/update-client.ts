import { SlateTool } from 'slates';
import { z } from 'zod';
import { BidsketchClient } from '../lib/client';
import { spec } from '../spec';

export let updateClient = SlateTool.create(spec, {
  name: 'Update Client',
  key: 'update_client',
  description: `Update an existing client's information. Only the fields provided will be updated; all others remain unchanged.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      clientId: z.number().describe('ID of the client to update'),
      firstName: z.string().optional().describe('Updated first name'),
      lastName: z.string().optional().describe('Updated last name'),
      email: z.string().optional().describe('Updated email address'),
      phone: z.string().optional().describe('Updated phone number'),
      website: z.string().optional().describe('Updated website URL'),
      address: z.string().optional().describe('Updated street address'),
      address2: z.string().optional().describe('Updated address line 2'),
      city: z.string().optional().describe('Updated city'),
      state: z.string().optional().describe('Updated state/province'),
      postalZip: z.string().optional().describe('Updated postal/ZIP code'),
      locale: z.string().optional().describe('Updated country/locale'),
      notes: z.string().optional().describe('Updated private notes'),
      otherContact: z
        .object({
          firstName: z.string().describe('Secondary contact first name'),
          lastName: z.string().describe('Secondary contact last name'),
          email: z.string().describe('Secondary contact email'),
          phone: z.string().optional().describe('Secondary contact phone')
        })
        .optional()
        .describe('Updated secondary contact person')
    })
  )
  .output(
    z.object({
      clientId: z.number().describe('Client ID'),
      firstName: z.string().describe('First name'),
      lastName: z.string().describe('Last name'),
      email: z.string().describe('Email address'),
      url: z.string().describe('API URL'),
      appUrl: z.string().describe('Bidsketch app URL'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BidsketchClient(ctx.auth.token);

    let body: Record<string, unknown> = {};

    if (ctx.input.firstName !== undefined) body.first_name = ctx.input.firstName;
    if (ctx.input.lastName !== undefined) body.last_name = ctx.input.lastName;
    if (ctx.input.email !== undefined) body.email = ctx.input.email;
    if (ctx.input.phone !== undefined) body.phone = ctx.input.phone;
    if (ctx.input.website !== undefined) body.website = ctx.input.website;
    if (ctx.input.address !== undefined) body.address = ctx.input.address;
    if (ctx.input.address2 !== undefined) body.address2 = ctx.input.address2;
    if (ctx.input.city !== undefined) body.city = ctx.input.city;
    if (ctx.input.state !== undefined) body.state = ctx.input.state;
    if (ctx.input.postalZip !== undefined) body.postal_zip = ctx.input.postalZip;
    if (ctx.input.locale !== undefined) body.locale = ctx.input.locale;
    if (ctx.input.notes !== undefined) body.notes = ctx.input.notes;

    if (ctx.input.otherContact) {
      body.other_contact = {
        first_name: ctx.input.otherContact.firstName,
        last_name: ctx.input.otherContact.lastName,
        email: ctx.input.otherContact.email,
        phone: ctx.input.otherContact.phone
      };
    }

    let c = await client.updateClient(ctx.input.clientId, body);

    return {
      output: {
        clientId: c.id,
        firstName: c.first_name,
        lastName: c.last_name,
        email: c.email,
        url: c.url,
        appUrl: c.app_url,
        updatedAt: c.updated_at
      },
      message: `Updated client **${c.first_name} ${c.last_name}** (ID: ${c.id}).`
    };
  })
  .build();
