import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { contactPayload, validateContact } from '../lib/payloads';
import { xRechnungSchema } from '../lib/schemas';
import { fail } from '../lib/validation';
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
      .describe(
        'Provider country or tax-region code (e.g. DE, ES_CN); discover choices with list_reference_data'
      )
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
    number: z.number().optional().describe('Legacy read-only number; assigned by Lexoffice')
  })
  .optional()
  .describe('Role configuration');

export let updateContact = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Updates an existing contact in Lexoffice. Requires the current version number for optimistic locking -- retrieve it first with get_contact. The full contact must be sent on update; omitted fields are cleared except XRechnung settings, which are preserved when omitted. A contact must remain either a company or a person, not both.`,
  instructions: [
    'Always retrieve the contact first with get_contact to obtain the current version number.',
    'Send the full contact representation. Omitted fields are removed; omitted XRechnung settings are preserved.',
    'The API allows a maximum of one billing address, one shipping address, and one contact person per call.'
  ],
  tags: {
    destructive: true,
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
      xRechnung: xRechnungSchema
        .optional()
        .describe(
          'Replacement XRechnung settings; omit to preserve the current buyer reference and vendor number'
        ),
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
    const client = new Client({ token: ctx.auth.token });
    const current = await client.getContact(ctx.input.contactId);
    validateContact(current);
    if (current.version !== ctx.input.version)
      fail('The contact version changed; retrieve it again before updating.');
    for (const role of ['customer', 'vendor'] as const)
      if (
        ctx.input.roles[role]?.number !== undefined &&
        ctx.input.roles[role]?.number !== current.roles?.[role]?.number
      )
        fail('Customer and vendor numbers are read-only and cannot be changed.');
    const { contactId, ...input } = ctx.input;
    const result = await client.updateContact(
      contactId,
      contactPayload({ ...input, xRechnung: input.xRechnung ?? current.xRechnung })
    );
    return { output: result, message: `Updated contact **${result.id}**.` };
  })
  .build();
