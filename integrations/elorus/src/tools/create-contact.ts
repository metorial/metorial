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

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Create a new contact in Elorus. A contact can represent a client, supplier, or both. Provide either a company name or first/last name (or both).`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      company: z.string().optional().describe('Company or organization name.'),
      firstName: z.string().optional().describe('First name of the contact person.'),
      lastName: z.string().optional().describe('Last name of the contact person.'),
      clientType: z
        .enum(['1', '4'])
        .optional()
        .describe('"1" for business, "4" for private individual.'),
      isClient: z
        .boolean()
        .optional()
        .describe('Whether this contact is a client. Defaults to true.'),
      isSupplier: z.boolean().optional().describe('Whether this contact is a supplier.'),
      vatNumber: z.string().optional().describe('VAT registration number.'),
      email: z.string().optional().describe('Primary email address.'),
      phone: z.string().optional().describe('Phone number.'),
      profession: z.string().optional().describe('Profession or job title.'),
      addresses: z.array(addressSchema).optional().describe('Billing and shipping addresses.'),
      customId: z
        .string()
        .optional()
        .describe('Custom external identifier (API-only, not visible in the Elorus UI).')
    })
  )
  .output(
    z.object({
      contact: z.any().describe('The newly created contact object.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let body: any = {};
    if (ctx.input.company) body.company = ctx.input.company;
    if (ctx.input.firstName) body.first_name = ctx.input.firstName;
    if (ctx.input.lastName) body.last_name = ctx.input.lastName;
    if (ctx.input.clientType) body.client_type = ctx.input.clientType;
    if (ctx.input.isClient !== undefined) body.is_client = ctx.input.isClient;
    if (ctx.input.isSupplier !== undefined) body.is_supplier = ctx.input.isSupplier;
    if (ctx.input.vatNumber) body.vat_number = ctx.input.vatNumber;
    if (ctx.input.email) body.email = ctx.input.email;
    if (ctx.input.phone) body.phone = ctx.input.phone;
    if (ctx.input.profession) body.profession = ctx.input.profession;
    if (ctx.input.customId) body.custom_id = ctx.input.customId;
    if (ctx.input.addresses) {
      body.addresses = ctx.input.addresses.map(a => ({
        address: a.address,
        city: a.city,
        zip: a.zip,
        country: a.country,
        ad_type: a.adType
      }));
    }

    let contact = await client.createContact(body);

    let name =
      contact.display_name || contact.company || `${contact.first_name} ${contact.last_name}`;
    return {
      output: { contact },
      message: `Created contact: **${name}** (ID: ${contact.id})`
    };
  })
  .build();
