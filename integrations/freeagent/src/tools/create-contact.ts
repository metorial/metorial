import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreeAgentClient } from '../lib/client';
import { spec } from '../spec';

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Create a new contact in FreeAgent. Provide either an organisation name, or first and last name, or both.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      organisationName: z.string().optional().describe('Company or organisation name'),
      firstName: z.string().optional().describe('First name of the contact'),
      lastName: z.string().optional().describe('Last name of the contact'),
      email: z.string().optional().describe('Email address'),
      phone: z.string().optional().describe('Phone number'),
      mobile: z.string().optional().describe('Mobile phone number'),
      address1: z.string().optional().describe('Address line 1'),
      address2: z.string().optional().describe('Address line 2'),
      address3: z.string().optional().describe('Address line 3'),
      town: z.string().optional().describe('Town or city'),
      region: z.string().optional().describe('Region, county, or state'),
      postcode: z.string().optional().describe('Postal code'),
      country: z.string().optional().describe('Country code (e.g. "United Kingdom")'),
      salesTaxRegistrationNumber: z.string().optional().describe('VAT registration number'),
      accountBalance: z.string().optional().describe('Opening balance'),
      locale: z.string().optional().describe('Locale for the contact (e.g. "en")'),
      contactNameOnInvoices: z
        .boolean()
        .optional()
        .describe('Whether to show contact name on invoices'),
      chargeSalesTax: z
        .enum(['Auto', 'Always', 'Never'])
        .optional()
        .describe('Sales tax charging preference'),
      paymentTermsInDays: z.number().optional().describe('Default payment terms in days'),
      billingEmail: z.string().optional().describe('Email to send invoices to')
    })
  )
  .output(
    z.object({
      contact: z.record(z.string(), z.any()).describe('The newly created contact record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreeAgentClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let contactData: Record<string, any> = {};
    if (ctx.input.organisationName) contactData.organisation_name = ctx.input.organisationName;
    if (ctx.input.firstName) contactData.first_name = ctx.input.firstName;
    if (ctx.input.lastName) contactData.last_name = ctx.input.lastName;
    if (ctx.input.email) contactData.email = ctx.input.email;
    if (ctx.input.phone) contactData.phone_number = ctx.input.phone;
    if (ctx.input.mobile) contactData.mobile = ctx.input.mobile;
    if (ctx.input.address1) contactData.address1 = ctx.input.address1;
    if (ctx.input.address2) contactData.address2 = ctx.input.address2;
    if (ctx.input.address3) contactData.address3 = ctx.input.address3;
    if (ctx.input.town) contactData.town = ctx.input.town;
    if (ctx.input.region) contactData.region = ctx.input.region;
    if (ctx.input.postcode) contactData.postcode = ctx.input.postcode;
    if (ctx.input.country) contactData.country = ctx.input.country;
    if (ctx.input.salesTaxRegistrationNumber)
      contactData.sales_tax_registration_number = ctx.input.salesTaxRegistrationNumber;
    if (ctx.input.locale) contactData.locale = ctx.input.locale;
    if (ctx.input.contactNameOnInvoices !== undefined)
      contactData.contact_name_on_invoices = ctx.input.contactNameOnInvoices;
    if (ctx.input.chargeSalesTax) contactData.charge_sales_tax = ctx.input.chargeSalesTax;
    if (ctx.input.paymentTermsInDays !== undefined)
      contactData.payment_terms_in_days = ctx.input.paymentTermsInDays;
    if (ctx.input.billingEmail) contactData.billing_email = ctx.input.billingEmail;

    let contact = await client.createContact(contactData);
    let name =
      contact.organisation_name ||
      [contact.first_name, contact.last_name].filter(Boolean).join(' ');

    return {
      output: { contact },
      message: `Created contact: **${name}**`
    };
  })
  .build();
