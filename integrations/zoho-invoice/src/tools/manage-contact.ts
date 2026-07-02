import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let addressSchema = z.object({
  street: z.string().optional().describe('Street address'),
  city: z.string().optional().describe('City name'),
  state: z.string().optional().describe('State or province'),
  zip: z.string().optional().describe('Postal or zip code'),
  country: z.string().optional().describe('Country name')
});

let contactPersonSchema = z.object({
  firstName: z.string().optional().describe('First name of the contact person'),
  lastName: z.string().optional().describe('Last name of the contact person'),
  email: z.string().optional().describe('Email address of the contact person'),
  phone: z.string().optional().describe('Phone number of the contact person'),
  mobile: z.string().optional().describe('Mobile number of the contact person')
});

export let manageContact = SlateTool.create(spec, {
  name: 'Manage Contact',
  key: 'manage_contact',
  description: `Create or update a contact in Zoho Invoice.
If **contactId** is provided, the existing contact will be updated.
If **contactId** is omitted, a new contact will be created (requires **contactName**).
Supports billing/shipping addresses and multiple contact persons.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contactId: z
        .string()
        .optional()
        .describe('Contact ID to update. Omit to create a new contact.'),
      contactName: z
        .string()
        .optional()
        .describe('Display name of the contact (required when creating)'),
      companyName: z.string().optional().describe('Company name associated with the contact'),
      email: z.string().optional().describe('Primary email address of the contact'),
      phone: z.string().optional().describe('Phone number of the contact'),
      website: z.string().optional().describe('Website URL of the contact'),
      billingAddress: addressSchema.optional().describe('Billing address for the contact'),
      shippingAddress: addressSchema.optional().describe('Shipping address for the contact'),
      contactPersons: z
        .array(contactPersonSchema)
        .optional()
        .describe('Array of contact persons associated with this contact')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('Unique contact ID'),
      contactName: z.string().describe('Display name of the contact'),
      companyName: z.string().optional().describe('Company name'),
      email: z.string().optional().describe('Primary email address'),
      phone: z.string().optional().describe('Phone number'),
      status: z.string().optional().describe('Contact status (active or inactive)'),
      outstandingReceivableAmount: z
        .number()
        .optional()
        .describe('Total outstanding receivable amount'),
      unusedCreditsReceivableAmount: z
        .number()
        .optional()
        .describe('Total unused credits receivable amount'),
      createdTime: z
        .string()
        .optional()
        .describe('ISO timestamp when the contact was created'),
      lastModifiedTime: z
        .string()
        .optional()
        .describe('ISO timestamp when the contact was last modified')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId,
      region: ctx.auth.region
    });

    let buildPayload = () => {
      let payload: Record<string, any> = {};

      if (ctx.input.contactName !== undefined) payload.contact_name = ctx.input.contactName;
      if (ctx.input.companyName !== undefined) payload.company_name = ctx.input.companyName;
      if (ctx.input.email !== undefined) payload.email = ctx.input.email;
      if (ctx.input.phone !== undefined) payload.phone = ctx.input.phone;
      if (ctx.input.website !== undefined) payload.website = ctx.input.website;

      if (ctx.input.billingAddress) {
        payload.billing_address = {
          street: ctx.input.billingAddress.street,
          city: ctx.input.billingAddress.city,
          state: ctx.input.billingAddress.state,
          zip: ctx.input.billingAddress.zip,
          country: ctx.input.billingAddress.country
        };
      }

      if (ctx.input.shippingAddress) {
        payload.shipping_address = {
          street: ctx.input.shippingAddress.street,
          city: ctx.input.shippingAddress.city,
          state: ctx.input.shippingAddress.state,
          zip: ctx.input.shippingAddress.zip,
          country: ctx.input.shippingAddress.country
        };
      }

      if (ctx.input.contactPersons) {
        payload.contact_persons = ctx.input.contactPersons.map(person => ({
          first_name: person.firstName,
          last_name: person.lastName,
          email: person.email,
          phone: person.phone,
          mobile: person.mobile
        }));
      }

      return payload;
    };

    let mapResult = (raw: any) => ({
      contactId: raw.contact_id,
      contactName: raw.contact_name,
      companyName: raw.company_name,
      email: raw.email,
      phone: raw.phone,
      status: raw.status,
      outstandingReceivableAmount: raw.outstanding_receivable_amount,
      unusedCreditsReceivableAmount: raw.unused_credits_receivable_amount,
      createdTime: raw.created_time,
      lastModifiedTime: raw.last_modified_time
    });

    if (ctx.input.contactId) {
      let result = await client.updateContact(ctx.input.contactId, buildPayload());
      return {
        output: mapResult(result),
        message: `Updated contact **${result.contact_name}** (ID: ${result.contact_id}).`
      };
    }

    if (!ctx.input.contactName) {
      throw new Error('contactName is required when creating a new contact');
    }

    let result = await client.createContact(buildPayload());
    return {
      output: mapResult(result),
      message: `Created contact **${result.contact_name}** (ID: ${result.contact_id}).`
    };
  })
  .build();
