import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateContact = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Update an existing contact's details in Agiled. Provide the contact ID and any fields you want to change.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact to update'),
      name: z.string().optional().describe('Updated full name'),
      email: z.string().optional().describe('Updated email address'),
      phone: z.string().optional().describe('Updated phone number'),
      companyName: z.string().optional().describe('Updated company name'),
      address: z.string().optional().describe('Updated street address'),
      city: z.string().optional().describe('Updated city'),
      state: z.string().optional().describe('Updated state or province'),
      country: z.string().optional().describe('Updated country'),
      postalCode: z.string().optional().describe('Updated postal/ZIP code'),
      website: z.string().optional().describe('Updated website URL'),
      notes: z.string().optional().describe('Updated notes')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('ID of the updated contact'),
      name: z.string().optional().describe('Updated name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      brand: ctx.auth.brand
    });

    let updateData: Record<string, unknown> = {};
    if (ctx.input.name !== undefined) updateData.client_name = ctx.input.name;
    if (ctx.input.email !== undefined) updateData.client_email = ctx.input.email;
    if (ctx.input.phone !== undefined) updateData.phone = ctx.input.phone;
    if (ctx.input.companyName !== undefined) updateData.company_name = ctx.input.companyName;
    if (ctx.input.address !== undefined) updateData.address = ctx.input.address;
    if (ctx.input.city !== undefined) updateData.city = ctx.input.city;
    if (ctx.input.state !== undefined) updateData.state = ctx.input.state;
    if (ctx.input.country !== undefined) updateData.country = ctx.input.country;
    if (ctx.input.postalCode !== undefined) updateData.postal_code = ctx.input.postalCode;
    if (ctx.input.website !== undefined) updateData.website = ctx.input.website;
    if (ctx.input.notes !== undefined) updateData.note = ctx.input.notes;

    let result = await client.updateContact(ctx.input.contactId, updateData);
    let contact = result.data;

    return {
      output: {
        contactId: String(contact.id ?? ctx.input.contactId),
        name:
          (contact.client_name as string | undefined) ?? (contact.name as string | undefined)
      },
      message: `Updated contact **${ctx.input.contactId}**.`
    };
  })
  .build();
