import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreeAgentClient } from '../lib/client';
import { spec } from '../spec';

export let updateContact = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Update an existing contact's details in FreeAgent. Only the provided fields will be changed.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      contactId: z.string().describe('The FreeAgent contact ID to update'),
      organisationName: z.string().optional().describe('Company or organisation name'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Email address'),
      phone: z.string().optional().describe('Phone number'),
      mobile: z.string().optional().describe('Mobile phone number'),
      address1: z.string().optional().describe('Address line 1'),
      address2: z.string().optional().describe('Address line 2'),
      address3: z.string().optional().describe('Address line 3'),
      town: z.string().optional().describe('Town or city'),
      region: z.string().optional().describe('Region, county, or state'),
      postcode: z.string().optional().describe('Postal code'),
      country: z.string().optional().describe('Country'),
      salesTaxRegistrationNumber: z.string().optional().describe('VAT registration number'),
      chargeSalesTax: z
        .enum(['Auto', 'Always', 'Never'])
        .optional()
        .describe('Sales tax charging preference'),
      paymentTermsInDays: z.number().optional().describe('Default payment terms in days'),
      billingEmail: z.string().optional().describe('Email for invoices'),
      status: z.enum(['Active', 'Hidden']).optional().describe('Contact status')
    })
  )
  .output(
    z.object({
      contact: z.record(z.string(), z.any()).describe('The updated contact record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreeAgentClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let contactData: Record<string, any> = {};
    if (ctx.input.organisationName !== undefined)
      contactData.organisation_name = ctx.input.organisationName;
    if (ctx.input.firstName !== undefined) contactData.first_name = ctx.input.firstName;
    if (ctx.input.lastName !== undefined) contactData.last_name = ctx.input.lastName;
    if (ctx.input.email !== undefined) contactData.email = ctx.input.email;
    if (ctx.input.phone !== undefined) contactData.phone_number = ctx.input.phone;
    if (ctx.input.mobile !== undefined) contactData.mobile = ctx.input.mobile;
    if (ctx.input.address1 !== undefined) contactData.address1 = ctx.input.address1;
    if (ctx.input.address2 !== undefined) contactData.address2 = ctx.input.address2;
    if (ctx.input.address3 !== undefined) contactData.address3 = ctx.input.address3;
    if (ctx.input.town !== undefined) contactData.town = ctx.input.town;
    if (ctx.input.region !== undefined) contactData.region = ctx.input.region;
    if (ctx.input.postcode !== undefined) contactData.postcode = ctx.input.postcode;
    if (ctx.input.country !== undefined) contactData.country = ctx.input.country;
    if (ctx.input.salesTaxRegistrationNumber !== undefined)
      contactData.sales_tax_registration_number = ctx.input.salesTaxRegistrationNumber;
    if (ctx.input.chargeSalesTax !== undefined)
      contactData.charge_sales_tax = ctx.input.chargeSalesTax;
    if (ctx.input.paymentTermsInDays !== undefined)
      contactData.payment_terms_in_days = ctx.input.paymentTermsInDays;
    if (ctx.input.billingEmail !== undefined)
      contactData.billing_email = ctx.input.billingEmail;
    if (ctx.input.status !== undefined) contactData.status = ctx.input.status;

    let contact = await client.updateContact(ctx.input.contactId, contactData);

    return {
      output: { contact },
      message: `Updated contact **${ctx.input.contactId}**`
    };
  })
  .build();
