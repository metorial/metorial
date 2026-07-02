import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let addressSchema = z.object({
  address: z.string().optional().describe('Street address.'),
  city: z.string().optional().describe('City name.'),
  zip: z.string().optional().describe('Postal/ZIP code.'),
  country: z.string().optional().describe('Two-letter country code (e.g. "GR", "US").'),
  adType: z
    .enum(['bill', 'ship'])
    .optional()
    .describe('Address type: "bill" for billing, "ship" for shipping.')
});

export let updateContact = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Update an existing contact's details. Only the provided fields will be modified (partial update). Use this to change names, addresses, VAT numbers, or client/supplier status.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      contactId: z.string().describe('The unique ID of the contact to update.'),
      company: z.string().optional().describe('Updated company name.'),
      firstName: z.string().optional().describe('Updated first name.'),
      lastName: z.string().optional().describe('Updated last name.'),
      clientType: z
        .enum(['1', '4'])
        .optional()
        .describe('"1" for business, "4" for private individual.'),
      isClient: z.boolean().optional().describe('Whether this contact is a client.'),
      isSupplier: z.boolean().optional().describe('Whether this contact is a supplier.'),
      vatNumber: z.string().optional().describe('Updated VAT number.'),
      email: z.string().optional().describe('Updated email address.'),
      phone: z.string().optional().describe('Updated phone number.'),
      profession: z.string().optional().describe('Updated profession.'),
      addresses: z
        .array(addressSchema)
        .optional()
        .describe('Updated addresses (replaces all existing).'),
      customId: z.string().optional().describe('Custom external identifier.')
    })
  )
  .output(
    z.object({
      contact: z.any().describe('The updated contact object.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let body: any = {};
    if (ctx.input.company !== undefined) body.company = ctx.input.company;
    if (ctx.input.firstName !== undefined) body.first_name = ctx.input.firstName;
    if (ctx.input.lastName !== undefined) body.last_name = ctx.input.lastName;
    if (ctx.input.clientType !== undefined) body.client_type = ctx.input.clientType;
    if (ctx.input.isClient !== undefined) body.is_client = ctx.input.isClient;
    if (ctx.input.isSupplier !== undefined) body.is_supplier = ctx.input.isSupplier;
    if (ctx.input.vatNumber !== undefined) body.vat_number = ctx.input.vatNumber;
    if (ctx.input.email !== undefined) body.email = ctx.input.email;
    if (ctx.input.phone !== undefined) body.phone = ctx.input.phone;
    if (ctx.input.profession !== undefined) body.profession = ctx.input.profession;
    if (ctx.input.customId !== undefined) body.custom_id = ctx.input.customId;
    if (ctx.input.addresses) {
      body.addresses = ctx.input.addresses.map(a => ({
        address: a.address,
        city: a.city,
        zip: a.zip,
        country: a.country,
        ad_type: a.adType
      }));
    }

    let contact = await client.updateContact(ctx.input.contactId, body, true);

    let name =
      contact.display_name || contact.company || `${contact.first_name} ${contact.last_name}`;
    return {
      output: { contact },
      message: `Updated contact: **${name}**`
    };
  })
  .build();
