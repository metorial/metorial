import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let addressSchema = z
  .object({
    supplement: z.string().optional().describe('Address supplement'),
    street: z.string().optional().describe('Street name and house number'),
    zip: z.string().optional().describe('Postal/ZIP code'),
    city: z.string().optional().describe('City name'),
    countryCode: z.string().optional().describe('ISO 3166-1 alpha-2 country code')
  })
  .describe('Postal address');

let contactPersonSchema = z
  .object({
    salutation: z.string().optional().describe('Salutation'),
    firstName: z.string().optional().describe('First name'),
    lastName: z.string().optional().describe('Last name'),
    primary: z.boolean().optional().describe('Whether this is the primary contact person'),
    emailAddress: z.string().optional().describe('Email address'),
    phoneNumber: z.string().optional().describe('Phone number')
  })
  .describe('Contact person');

let contactOutputSchema = z.object({
  id: z.string().describe('Unique contact ID'),
  organizationId: z.string().optional().describe('Organization ID this contact belongs to'),
  version: z
    .number()
    .describe('Resource version for optimistic locking (required for updates)'),
  roles: z
    .object({
      customer: z
        .object({
          number: z.number().optional().describe('Customer number')
        })
        .optional()
        .describe('Customer role details'),
      vendor: z
        .object({
          number: z.number().optional().describe('Vendor number')
        })
        .optional()
        .describe('Vendor role details')
    })
    .optional()
    .describe('Assigned roles for this contact'),
  company: z
    .object({
      name: z.string().optional().describe('Company name'),
      taxNumber: z.string().optional().describe('Tax number (Steuernummer)'),
      vatRegistrationId: z.string().optional().describe('VAT registration ID (USt-IdNr.)'),
      allowTaxFreeInvoices: z
        .boolean()
        .optional()
        .describe('Whether tax-free invoices are allowed'),
      contactPersons: z
        .array(contactPersonSchema)
        .optional()
        .describe('Contact persons at the company')
    })
    .optional()
    .describe('Company details (present if contact is a company)'),
  person: z
    .object({
      salutation: z.string().optional().describe('Salutation'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name')
    })
    .optional()
    .describe('Person details (present if contact is a person)'),
  archived: z.boolean().optional().describe('Whether the contact is archived'),
  note: z.string().optional().describe('Free-text note (max 1000 characters)'),
  addresses: z
    .object({
      billing: z.array(addressSchema).optional().describe('Billing addresses'),
      shipping: z.array(addressSchema).optional().describe('Shipping addresses')
    })
    .optional()
    .describe('Contact addresses'),
  xpiEditUrl: z
    .string()
    .optional()
    .describe('URL to edit the contact in the Lexoffice web UI'),
  emailAddresses: z
    .object({
      business: z.array(z.string()).optional().describe('Business email addresses'),
      office: z.array(z.string()).optional().describe('Office email addresses'),
      private: z.array(z.string()).optional().describe('Private email addresses'),
      other: z.array(z.string()).optional().describe('Other email addresses')
    })
    .optional()
    .describe('Email addresses grouped by category'),
  phoneNumbers: z
    .object({
      business: z.array(z.string()).optional().describe('Business phone numbers'),
      office: z.array(z.string()).optional().describe('Office phone numbers'),
      mobile: z.array(z.string()).optional().describe('Mobile phone numbers'),
      private: z.array(z.string()).optional().describe('Private phone numbers'),
      fax: z.array(z.string()).optional().describe('Fax numbers'),
      other: z.array(z.string()).optional().describe('Other phone numbers')
    })
    .optional()
    .describe('Phone numbers grouped by category')
});

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieves the full details of a single Lexoffice contact by ID. Returns company or person information, roles, addresses, email addresses, phone numbers, and notes.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      contactId: z.string().describe('The unique ID of the contact to retrieve')
    })
  )
  .output(contactOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let contact = await client.getContact(ctx.input.contactId);

    let contactName =
      contact.company?.name ??
      [contact.person?.firstName, contact.person?.lastName].filter(Boolean).join(' ') ??
      contact.id;

    let roleLabels: string[] = [];
    if (contact.roles?.customer) roleLabels.push('Customer');
    if (contact.roles?.vendor) roleLabels.push('Vendor');

    return {
      output: {
        id: contact.id,
        organizationId: contact.organizationId,
        version: contact.version,
        roles: contact.roles,
        company: contact.company,
        person: contact.person,
        archived: contact.archived,
        note: contact.note,
        addresses: contact.addresses,
        xpiEditUrl: contact.xpiEditUrl,
        emailAddresses: contact.emailAddresses,
        phoneNumbers: contact.phoneNumbers
      },
      message: `Retrieved contact **${contactName}**${roleLabels.length > 0 ? ` (${roleLabels.join(' & ')})` : ''}${contact.archived ? ' [Archived]' : ''}.`
    };
  })
  .build();
