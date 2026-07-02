import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let addressSchema = z
  .object({
    supplement: z.string().optional().describe('Address supplement (e.g. c/o, building name)'),
    street: z.string().optional().describe('Street name and house number'),
    zip: z.string().optional().describe('Postal/ZIP code'),
    city: z.string().optional().describe('City name'),
    countryCode: z
      .string()
      .optional()
      .describe('ISO 3166-1 alpha-2 country code (e.g. DE, AT, CH)')
  })
  .describe('Postal address');

let contactPersonSchema = z
  .object({
    salutation: z.string().optional().describe('Salutation (e.g. Herr, Frau)'),
    firstName: z.string().optional().describe('Contact person first name'),
    lastName: z.string().describe('Contact person last name'),
    primary: z.boolean().optional().describe('Whether this is the primary contact person'),
    emailAddress: z.string().optional().describe('Contact person email address'),
    phoneNumber: z.string().optional().describe('Contact person phone number')
  })
  .describe('Company contact person');

let roleSchema = z
  .object({
    number: z
      .number()
      .optional()
      .describe('Customer or vendor number (auto-assigned if omitted)')
  })
  .optional()
  .describe('Role configuration');

export let updateContact = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Updates an existing contact in Lexoffice. Requires the current version number for optimistic locking -- retrieve it first with get_contact. The full contact must be sent on update; any fields omitted will be cleared. A contact must remain either a company or a person, not both.`,
  instructions: [
    'Always retrieve the contact first with get_contact to obtain the current version number.',
    'The entire contact resource must be sent -- fields not included in the update will be removed.',
    'The API allows a maximum of one billing address, one shipping address, and one contact person per call.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contactId: z.string().describe('The unique ID of the contact to update'),
      version: z
        .number()
        .describe(
          'Current version of the contact (required for optimistic locking, obtain via get_contact)'
        ),
      roles: z
        .object({
          customer: roleSchema.describe('Assign or maintain customer role'),
          vendor: roleSchema.describe('Assign or maintain vendor role')
        })
        .describe('At least one role (customer or vendor) must be provided'),
      company: z
        .object({
          name: z.string().describe('Company name (required for company contacts)'),
          taxNumber: z.string().optional().describe('Tax number (Steuernummer)'),
          vatRegistrationId: z.string().optional().describe('VAT registration ID (USt-IdNr.)'),
          allowTaxFreeInvoices: z
            .boolean()
            .optional()
            .describe('Whether tax-free invoices are allowed for this company'),
          contactPersons: z
            .array(contactPersonSchema)
            .optional()
            .describe('Company contact persons (max 1 via API)')
        })
        .optional()
        .describe('Company details (mutually exclusive with person)'),
      person: z
        .object({
          salutation: z.string().optional().describe('Salutation (e.g. Herr, Frau)'),
          firstName: z.string().optional().describe('First name'),
          lastName: z.string().describe('Last name (required for person contacts)')
        })
        .optional()
        .describe('Person details (mutually exclusive with company)'),
      note: z
        .string()
        .optional()
        .describe('Free-text note for the contact (max 1000 characters)'),
      addresses: z
        .object({
          billing: z
            .array(addressSchema)
            .optional()
            .describe('Billing addresses (max 1 via API)'),
          shipping: z
            .array(addressSchema)
            .optional()
            .describe('Shipping addresses (max 1 via API)')
        })
        .optional()
        .describe('Contact addresses'),
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
    })
  )
  .output(
    z.object({
      id: z.string().describe('Unique contact ID'),
      resourceUri: z.string().describe('Full URI to the updated contact resource'),
      createdDate: z.string().describe('ISO 8601 timestamp when the contact was created'),
      updatedDate: z.string().describe('ISO 8601 timestamp when the contact was last updated'),
      version: z.number().describe('New resource version after the update')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let contactPayload: Record<string, any> = {
      version: ctx.input.version,
      roles: {}
    };

    if (ctx.input.roles.customer) {
      contactPayload.roles.customer =
        ctx.input.roles.customer.number !== undefined
          ? { number: ctx.input.roles.customer.number }
          : {};
    }
    if (ctx.input.roles.vendor) {
      contactPayload.roles.vendor =
        ctx.input.roles.vendor.number !== undefined
          ? { number: ctx.input.roles.vendor.number }
          : {};
    }

    if (ctx.input.company) {
      contactPayload.company = {
        name: ctx.input.company.name
      };
      if (ctx.input.company.taxNumber)
        contactPayload.company.taxNumber = ctx.input.company.taxNumber;
      if (ctx.input.company.vatRegistrationId)
        contactPayload.company.vatRegistrationId = ctx.input.company.vatRegistrationId;
      if (ctx.input.company.allowTaxFreeInvoices !== undefined)
        contactPayload.company.allowTaxFreeInvoices = ctx.input.company.allowTaxFreeInvoices;
      if (ctx.input.company.contactPersons)
        contactPayload.company.contactPersons = ctx.input.company.contactPersons;
    }

    if (ctx.input.person) {
      contactPayload.person = {
        lastName: ctx.input.person.lastName
      };
      if (ctx.input.person.salutation)
        contactPayload.person.salutation = ctx.input.person.salutation;
      if (ctx.input.person.firstName)
        contactPayload.person.firstName = ctx.input.person.firstName;
    }

    if (ctx.input.note !== undefined) contactPayload.note = ctx.input.note;
    if (ctx.input.addresses) contactPayload.addresses = ctx.input.addresses;
    if (ctx.input.emailAddresses) contactPayload.emailAddresses = ctx.input.emailAddresses;
    if (ctx.input.phoneNumbers) contactPayload.phoneNumbers = ctx.input.phoneNumbers;

    let result = await client.updateContact(ctx.input.contactId, contactPayload);

    let contactName =
      ctx.input.company?.name ??
      [ctx.input.person?.firstName, ctx.input.person?.lastName].filter(Boolean).join(' ') ??
      ctx.input.contactId;

    return {
      output: {
        id: result.id,
        resourceUri: result.resourceUri,
        createdDate: result.createdDate,
        updatedDate: result.updatedDate,
        version: result.version
      },
      message: `Updated contact **${contactName}** (ID: ${result.id}, version: ${result.version}).`
    };
  })
  .build();
