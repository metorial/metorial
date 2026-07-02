import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let contactSchema = z.object({
  contactId: z.string().optional().describe('Contact ID (returned by Quaderno)'),
  kind: z.string().optional().describe('Contact type: "person" or "company"'),
  firstName: z.string().optional().describe('First name (for persons)'),
  lastName: z.string().optional().describe('Last name'),
  fullName: z.string().optional().describe('Full name or company name'),
  email: z.string().optional().describe('Email address'),
  phone1: z.string().optional().describe('Primary phone number'),
  phone2: z.string().optional().describe('Secondary phone number'),
  taxId: z.string().optional().describe('Tax identification number (VAT, EIN, etc.)'),
  contactName: z.string().optional().describe('Contact person name (for companies)'),
  streetLine1: z.string().optional().describe('Street address line 1'),
  streetLine2: z.string().optional().describe('Street address line 2'),
  city: z.string().optional().describe('City'),
  postalCode: z.string().optional().describe('Postal/ZIP code'),
  region: z.string().optional().describe('State or region'),
  country: z.string().optional().describe('Two-letter ISO country code'),
  currency: z.string().optional().describe('Preferred currency code (e.g., "USD", "EUR")'),
  language: z.string().optional().describe('Preferred language code (e.g., "EN", "ES")'),
  notes: z.string().optional().describe('Internal notes about the contact'),
  url: z.string().optional().describe('URL of the contact record')
});

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `Retrieve a list of contacts (customers and vendors) from Quaderno. Supports searching by name, email, or tax ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe('Search query to filter contacts by name, email, or tax ID'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)')
    })
  )
  .output(
    z.object({
      contacts: z.array(contactSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listContacts({
      q: ctx.input.query,
      page: ctx.input.page
    });

    let contacts = (Array.isArray(result) ? result : []).map((c: any) => ({
      contactId: c.id?.toString(),
      kind: c.kind,
      firstName: c.first_name,
      lastName: c.last_name,
      fullName: c.full_name,
      email: c.email,
      phone1: c.phone_1,
      phone2: c.phone_2,
      taxId: c.tax_id,
      contactName: c.contact_name,
      streetLine1: c.street_line_1,
      streetLine2: c.street_line_2,
      city: c.city,
      postalCode: c.postal_code,
      region: c.region,
      country: c.country,
      currency: c.currency,
      language: c.language,
      notes: c.notes,
      url: c.url
    }));

    return {
      output: { contacts },
      message: `Found **${contacts.length}** contact(s)${ctx.input.query ? ` matching "${ctx.input.query}"` : ''}`
    };
  })
  .build();

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieve a single contact by ID from Quaderno, including all their details such as address, tax ID, and preferences.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact to retrieve')
    })
  )
  .output(contactSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let c = await client.getContact(ctx.input.contactId);

    let output = {
      contactId: c.id?.toString(),
      kind: c.kind,
      firstName: c.first_name,
      lastName: c.last_name,
      fullName: c.full_name,
      email: c.email,
      phone1: c.phone_1,
      phone2: c.phone_2,
      taxId: c.tax_id,
      contactName: c.contact_name,
      streetLine1: c.street_line_1,
      streetLine2: c.street_line_2,
      city: c.city,
      postalCode: c.postal_code,
      region: c.region,
      country: c.country,
      currency: c.currency,
      language: c.language,
      notes: c.notes,
      url: c.url
    };

    return {
      output,
      message: `Retrieved contact **${c.full_name || c.email || c.id}**`
    };
  })
  .build();

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Create a new contact (customer or vendor) in Quaderno. Contacts appear on invoices, credit notes, and expenses.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      kind: z.enum(['person', 'company']).optional().describe('Contact type'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Email address'),
      phone1: z.string().optional().describe('Primary phone number'),
      taxId: z.string().optional().describe('Tax identification number'),
      contactName: z.string().optional().describe('Contact person name (for companies)'),
      streetLine1: z.string().optional().describe('Street address line 1'),
      streetLine2: z.string().optional().describe('Street address line 2'),
      city: z.string().optional().describe('City'),
      postalCode: z.string().optional().describe('Postal/ZIP code'),
      region: z.string().optional().describe('State or region'),
      country: z.string().optional().describe('Two-letter ISO country code'),
      currency: z.string().optional().describe('Preferred currency code'),
      language: z.string().optional().describe('Preferred language code'),
      notes: z.string().optional().describe('Internal notes')
    })
  )
  .output(contactSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let data: Record<string, any> = {};
    if (ctx.input.kind) data.kind = ctx.input.kind;
    if (ctx.input.firstName) data.first_name = ctx.input.firstName;
    if (ctx.input.lastName) data.last_name = ctx.input.lastName;
    if (ctx.input.email) data.email = ctx.input.email;
    if (ctx.input.phone1) data.phone_1 = ctx.input.phone1;
    if (ctx.input.taxId) data.tax_id = ctx.input.taxId;
    if (ctx.input.contactName) data.contact_name = ctx.input.contactName;
    if (ctx.input.streetLine1) data.street_line_1 = ctx.input.streetLine1;
    if (ctx.input.streetLine2) data.street_line_2 = ctx.input.streetLine2;
    if (ctx.input.city) data.city = ctx.input.city;
    if (ctx.input.postalCode) data.postal_code = ctx.input.postalCode;
    if (ctx.input.region) data.region = ctx.input.region;
    if (ctx.input.country) data.country = ctx.input.country;
    if (ctx.input.currency) data.currency = ctx.input.currency;
    if (ctx.input.language) data.language = ctx.input.language;
    if (ctx.input.notes) data.notes = ctx.input.notes;

    let c = await client.createContact(data);

    return {
      output: {
        contactId: c.id?.toString(),
        kind: c.kind,
        firstName: c.first_name,
        lastName: c.last_name,
        fullName: c.full_name,
        email: c.email,
        phone1: c.phone_1,
        phone2: c.phone_2,
        taxId: c.tax_id,
        contactName: c.contact_name,
        streetLine1: c.street_line_1,
        streetLine2: c.street_line_2,
        city: c.city,
        postalCode: c.postal_code,
        region: c.region,
        country: c.country,
        currency: c.currency,
        language: c.language,
        notes: c.notes,
        url: c.url
      },
      message: `Created contact **${c.full_name || c.email || c.id}**`
    };
  })
  .build();

export let updateContact = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Update an existing contact's details in Quaderno. Only the provided fields will be updated.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact to update'),
      kind: z.enum(['person', 'company']).optional().describe('Contact type'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Email address'),
      phone1: z.string().optional().describe('Primary phone number'),
      taxId: z.string().optional().describe('Tax identification number'),
      contactName: z.string().optional().describe('Contact person name'),
      streetLine1: z.string().optional().describe('Street address line 1'),
      streetLine2: z.string().optional().describe('Street address line 2'),
      city: z.string().optional().describe('City'),
      postalCode: z.string().optional().describe('Postal/ZIP code'),
      region: z.string().optional().describe('State or region'),
      country: z.string().optional().describe('Two-letter ISO country code'),
      currency: z.string().optional().describe('Preferred currency code'),
      language: z.string().optional().describe('Preferred language code'),
      notes: z.string().optional().describe('Internal notes')
    })
  )
  .output(contactSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let data: Record<string, any> = {};
    if (ctx.input.kind !== undefined) data.kind = ctx.input.kind;
    if (ctx.input.firstName !== undefined) data.first_name = ctx.input.firstName;
    if (ctx.input.lastName !== undefined) data.last_name = ctx.input.lastName;
    if (ctx.input.email !== undefined) data.email = ctx.input.email;
    if (ctx.input.phone1 !== undefined) data.phone_1 = ctx.input.phone1;
    if (ctx.input.taxId !== undefined) data.tax_id = ctx.input.taxId;
    if (ctx.input.contactName !== undefined) data.contact_name = ctx.input.contactName;
    if (ctx.input.streetLine1 !== undefined) data.street_line_1 = ctx.input.streetLine1;
    if (ctx.input.streetLine2 !== undefined) data.street_line_2 = ctx.input.streetLine2;
    if (ctx.input.city !== undefined) data.city = ctx.input.city;
    if (ctx.input.postalCode !== undefined) data.postal_code = ctx.input.postalCode;
    if (ctx.input.region !== undefined) data.region = ctx.input.region;
    if (ctx.input.country !== undefined) data.country = ctx.input.country;
    if (ctx.input.currency !== undefined) data.currency = ctx.input.currency;
    if (ctx.input.language !== undefined) data.language = ctx.input.language;
    if (ctx.input.notes !== undefined) data.notes = ctx.input.notes;

    let c = await client.updateContact(ctx.input.contactId, data);

    return {
      output: {
        contactId: c.id?.toString(),
        kind: c.kind,
        firstName: c.first_name,
        lastName: c.last_name,
        fullName: c.full_name,
        email: c.email,
        phone1: c.phone_1,
        phone2: c.phone_2,
        taxId: c.tax_id,
        contactName: c.contact_name,
        streetLine1: c.street_line_1,
        streetLine2: c.street_line_2,
        city: c.city,
        postalCode: c.postal_code,
        region: c.region,
        country: c.country,
        currency: c.currency,
        language: c.language,
        notes: c.notes,
        url: c.url
      },
      message: `Updated contact **${c.full_name || c.email || c.id}**`
    };
  })
  .build();

export let deleteContact = SlateTool.create(spec, {
  name: 'Delete Contact',
  key: 'delete_contact',
  description: `Delete a contact from Quaderno. Contacts with associated documents (invoices, credit notes, expenses) cannot be deleted.`,
  constraints: ['Contacts with associated documents cannot be deleted'],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the contact was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deleteContact(ctx.input.contactId);

    return {
      output: { success: true },
      message: `Deleted contact **${ctx.input.contactId}**`
    };
  })
  .build();
