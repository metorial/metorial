import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClientFromContext } from '../lib/helpers';
import { spec } from '../spec';

let addressSchema = z
  .object({
    addressType: z.enum(['POBOX', 'STREET', 'DELIVERY']).optional().describe('Address type'),
    addressLine1: z.string().optional().describe('Address line 1'),
    addressLine2: z.string().optional().describe('Address line 2'),
    addressLine3: z.string().optional().describe('Address line 3'),
    addressLine4: z.string().optional().describe('Address line 4'),
    city: z.string().optional().describe('City'),
    region: z.string().optional().describe('Region/State'),
    postalCode: z.string().optional().describe('Postal/ZIP code'),
    country: z.string().optional().describe('Country'),
    attentionTo: z.string().optional().describe('Attention to field')
  })
  .describe('Contact address');

let phoneSchema = z
  .object({
    phoneType: z.enum(['DEFAULT', 'DDI', 'MOBILE', 'FAX']).optional().describe('Phone type'),
    phoneNumber: z.string().optional().describe('Phone number'),
    phoneAreaCode: z.string().optional().describe('Area code'),
    phoneCountryCode: z.string().optional().describe('Country code')
  })
  .describe('Contact phone number');

let contactOutputSchema = z.object({
  contactId: z.string().optional().describe('Unique Xero contact ID'),
  contactNumber: z.string().optional().describe('Contact number'),
  accountNumber: z.string().optional().describe('Account number'),
  contactStatus: z.string().optional().describe('ACTIVE or ARCHIVED'),
  name: z.string().optional().describe('Full contact name or company name'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  emailAddress: z.string().optional().describe('Email address'),
  taxNumber: z.string().optional().describe('Tax number (ABN, GST, VAT, etc.)'),
  isSupplier: z.boolean().optional().describe('Whether the contact is a supplier'),
  isCustomer: z.boolean().optional().describe('Whether the contact is a customer'),
  defaultCurrency: z.string().optional().describe('Default currency code'),
  updatedDate: z.string().optional().describe('Last updated timestamp'),
  website: z.string().optional().describe('Website URL'),
  discount: z.number().optional().describe('Default discount rate')
});

let mapContact = (c: any) => ({
  contactId: c.ContactID,
  contactNumber: c.ContactNumber,
  accountNumber: c.AccountNumber,
  contactStatus: c.ContactStatus,
  name: c.Name,
  firstName: c.FirstName,
  lastName: c.LastName,
  emailAddress: c.EmailAddress,
  taxNumber: c.TaxNumber,
  isSupplier: c.IsSupplier,
  isCustomer: c.IsCustomer,
  defaultCurrency: c.DefaultCurrency,
  updatedDate: c.UpdatedDateUTC,
  website: c.Website,
  discount: c.Discount
});

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Creates a new contact (customer or supplier) in Xero. A contact name is required, and you can optionally include address, phone, email, tax information, and payment terms.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      name: z.string().describe('Contact name (company or person name)'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      emailAddress: z.string().optional().describe('Email address'),
      taxNumber: z.string().optional().describe('Tax identification number'),
      accountNumber: z.string().optional().describe('Account number for the contact'),
      contactNumber: z.string().optional().describe('Contact number (your reference)'),
      isSupplier: z.boolean().optional().describe('Mark as supplier'),
      isCustomer: z.boolean().optional().describe('Mark as customer'),
      defaultCurrency: z.string().optional().describe('Default currency code'),
      website: z.string().optional().describe('Website URL'),
      discount: z.number().optional().describe('Default discount rate'),
      addresses: z.array(addressSchema).optional().describe('Contact addresses'),
      phones: z.array(phoneSchema).optional().describe('Contact phone numbers')
    })
  )
  .output(contactOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);

    let contactData: Record<string, any> = {
      Name: ctx.input.name
    };

    if (ctx.input.firstName) contactData.FirstName = ctx.input.firstName;
    if (ctx.input.lastName) contactData.LastName = ctx.input.lastName;
    if (ctx.input.emailAddress) contactData.EmailAddress = ctx.input.emailAddress;
    if (ctx.input.taxNumber) contactData.TaxNumber = ctx.input.taxNumber;
    if (ctx.input.accountNumber) contactData.AccountNumber = ctx.input.accountNumber;
    if (ctx.input.contactNumber) contactData.ContactNumber = ctx.input.contactNumber;
    if (ctx.input.isSupplier !== undefined) contactData.IsSupplier = ctx.input.isSupplier;
    if (ctx.input.isCustomer !== undefined) contactData.IsCustomer = ctx.input.isCustomer;
    if (ctx.input.defaultCurrency) contactData.DefaultCurrency = ctx.input.defaultCurrency;
    if (ctx.input.website) contactData.Website = ctx.input.website;
    if (ctx.input.discount !== undefined) contactData.Discount = ctx.input.discount;

    if (ctx.input.addresses) {
      contactData.Addresses = ctx.input.addresses.map(a => ({
        AddressType: a.addressType,
        AddressLine1: a.addressLine1,
        AddressLine2: a.addressLine2,
        AddressLine3: a.addressLine3,
        AddressLine4: a.addressLine4,
        City: a.city,
        Region: a.region,
        PostalCode: a.postalCode,
        Country: a.country,
        AttentionTo: a.attentionTo
      }));
    }

    if (ctx.input.phones) {
      contactData.Phones = ctx.input.phones.map(p => ({
        PhoneType: p.phoneType,
        PhoneNumber: p.phoneNumber,
        PhoneAreaCode: p.phoneAreaCode,
        PhoneCountryCode: p.phoneCountryCode
      }));
    }

    let contact = await client.createContact(contactData);
    let output = mapContact(contact);

    return {
      output,
      message: `Created contact **${output.name}**${output.emailAddress ? ` (${output.emailAddress})` : ''}.`
    };
  })
  .build();

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieves a single contact by ID with full details including addresses, phone numbers, and financial information.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      contactId: z.string().describe('The Xero contact ID')
    })
  )
  .output(contactOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);
    let contact = await client.getContact(ctx.input.contactId);
    let output = mapContact(contact);

    return {
      output,
      message: `Retrieved contact **${output.name}** — ${output.isCustomer ? 'Customer' : ''}${output.isCustomer && output.isSupplier ? ' & ' : ''}${output.isSupplier ? 'Supplier' : ''}.`
    };
  })
  .build();

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `Lists contacts from Xero with filtering and search. Supports searching by name, filtering by status, and retrieving contacts modified after a certain date.`,
  instructions: [
    'Use searchTerm for name-based searching',
    'Use the "where" parameter for advanced filters, e.g. `IsCustomer==true`'
  ],
  constraints: ['Returns up to 100 contacts per page'],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (starting from 1)'),
      searchTerm: z.string().optional().describe('Search contacts by name'),
      modifiedAfter: z
        .string()
        .optional()
        .describe('Only return contacts modified after this date (ISO 8601)'),
      where: z.string().optional().describe('Xero API where filter expression'),
      order: z.string().optional().describe('Order results, e.g. "Name ASC"'),
      includeArchived: z.boolean().optional().describe('Include archived contacts'),
      ids: z.array(z.string()).optional().describe('Filter to specific contact IDs')
    })
  )
  .output(
    z.object({
      contacts: z.array(contactOutputSchema).describe('List of contacts'),
      count: z.number().describe('Number of contacts returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);

    let result = await client.getContacts({
      page: ctx.input.page,
      searchTerm: ctx.input.searchTerm,
      modifiedAfter: ctx.input.modifiedAfter,
      where: ctx.input.where,
      order: ctx.input.order,
      includeArchived: ctx.input.includeArchived,
      ids: ctx.input.ids
    });

    let contacts = (result.Contacts || []).map(mapContact);

    return {
      output: { contacts, count: contacts.length },
      message: `Found **${contacts.length}** contact(s)${ctx.input.page ? ` on page ${ctx.input.page}` : ''}.`
    };
  })
  .build();

export let updateContact = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Updates an existing contact in Xero. Modify name, email, addresses, phone numbers, and other contact details. Can also archive or restore a contact.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      contactId: z.string().describe('The Xero contact ID to update'),
      name: z.string().optional().describe('Updated contact name'),
      firstName: z.string().optional().describe('Updated first name'),
      lastName: z.string().optional().describe('Updated last name'),
      emailAddress: z.string().optional().describe('Updated email address'),
      contactStatus: z.enum(['ACTIVE', 'ARCHIVED']).optional().describe('Set contact status'),
      taxNumber: z.string().optional().describe('Updated tax number'),
      accountNumber: z.string().optional().describe('Updated account number'),
      website: z.string().optional().describe('Updated website URL'),
      defaultCurrency: z.string().optional().describe('Updated default currency'),
      discount: z.number().optional().describe('Updated default discount rate'),
      addresses: z.array(addressSchema).optional().describe('Replacement addresses'),
      phones: z.array(phoneSchema).optional().describe('Replacement phone numbers')
    })
  )
  .output(contactOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);

    let updateData: Record<string, any> = {};
    if (ctx.input.name) updateData.Name = ctx.input.name;
    if (ctx.input.firstName) updateData.FirstName = ctx.input.firstName;
    if (ctx.input.lastName) updateData.LastName = ctx.input.lastName;
    if (ctx.input.emailAddress) updateData.EmailAddress = ctx.input.emailAddress;
    if (ctx.input.contactStatus) updateData.ContactStatus = ctx.input.contactStatus;
    if (ctx.input.taxNumber) updateData.TaxNumber = ctx.input.taxNumber;
    if (ctx.input.accountNumber) updateData.AccountNumber = ctx.input.accountNumber;
    if (ctx.input.website) updateData.Website = ctx.input.website;
    if (ctx.input.defaultCurrency) updateData.DefaultCurrency = ctx.input.defaultCurrency;
    if (ctx.input.discount !== undefined) updateData.Discount = ctx.input.discount;

    if (ctx.input.addresses) {
      updateData.Addresses = ctx.input.addresses.map(a => ({
        AddressType: a.addressType,
        AddressLine1: a.addressLine1,
        AddressLine2: a.addressLine2,
        AddressLine3: a.addressLine3,
        AddressLine4: a.addressLine4,
        City: a.city,
        Region: a.region,
        PostalCode: a.postalCode,
        Country: a.country,
        AttentionTo: a.attentionTo
      }));
    }

    if (ctx.input.phones) {
      updateData.Phones = ctx.input.phones.map(p => ({
        PhoneType: p.phoneType,
        PhoneNumber: p.phoneNumber,
        PhoneAreaCode: p.phoneAreaCode,
        PhoneCountryCode: p.phoneCountryCode
      }));
    }

    let contact = await client.updateContact(ctx.input.contactId, updateData);
    let output = mapContact(contact);

    return {
      output,
      message: `Updated contact **${output.name}**${ctx.input.contactStatus ? ` — Status: **${ctx.input.contactStatus}**` : ''}.`
    };
  })
  .build();
