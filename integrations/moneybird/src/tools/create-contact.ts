import { SlateTool } from 'slates';
import { z } from 'zod';
import { MoneybirdClient } from '../lib/client';
import { spec } from '../spec';

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Create a new contact (customer or supplier) in Moneybird. Requires either a company name, or first and last name. Can set delivery method, address, tax details, and SEPA direct debit information.`,
  instructions: [
    'Provide either companyName, or both firstName and lastName.',
    'Country should be a 2-letter ISO country code (e.g., "NL", "DE", "US").'
  ]
})
  .input(
    z.object({
      companyName: z.string().optional().describe('Company name'),
      firstName: z.string().optional().describe('First name (required if no company name)'),
      lastName: z.string().optional().describe('Last name (required if no company name)'),
      email: z.string().optional().describe('Email address'),
      phone: z.string().optional().describe('Phone number'),
      address1: z.string().optional().describe('Address line 1'),
      address2: z.string().optional().describe('Address line 2'),
      zipcode: z.string().optional().describe('Zip/postal code'),
      city: z.string().optional().describe('City'),
      country: z.string().optional().describe('2-letter country code (default: NL)'),
      taxNumber: z.string().optional().describe('Tax/VAT number'),
      chamberOfCommerce: z.string().optional().describe('Chamber of Commerce number'),
      deliveryMethod: z
        .enum(['Email', 'Post', 'Manual', 'Simplerinvoicing', 'Peppol'])
        .optional()
        .describe('Invoice delivery method'),
      sendInvoicesToEmail: z.string().optional().describe('Email for invoice delivery'),
      sendEstimatesToEmail: z.string().optional().describe('Email for estimate delivery'),
      sepaActive: z.boolean().optional().describe('Enable SEPA direct debit'),
      sepaIban: z.string().optional().describe('SEPA IBAN number'),
      sepaIbanAccountName: z.string().optional().describe('SEPA account holder name'),
      sepaBic: z.string().optional().describe('SEPA BIC code'),
      sepaMandateId: z.string().optional().describe('SEPA mandate ID'),
      sepaMandateDate: z.string().optional().describe('SEPA mandate date (YYYY-MM-DD)'),
      sepaSequenceType: z
        .enum(['RCUR', 'FRST', 'OOFF', 'FNAL'])
        .optional()
        .describe('SEPA sequence type'),
      customFields: z
        .array(
          z.object({
            customFieldId: z.string().describe('Custom field ID'),
            value: z.string().describe('Custom field value')
          })
        )
        .optional()
        .describe('Custom field values')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('Created contact ID'),
      customerId: z.string().nullable().describe('Auto-assigned customer ID'),
      companyName: z.string().nullable(),
      firstName: z.string().nullable(),
      lastName: z.string().nullable(),
      email: z.string().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new MoneybirdClient({
      token: ctx.auth.token,
      administrationId: ctx.config.administrationId
    });

    let contactData: Record<string, any> = {};

    if (ctx.input.companyName) contactData.company_name = ctx.input.companyName;
    if (ctx.input.firstName) contactData.firstname = ctx.input.firstName;
    if (ctx.input.lastName) contactData.lastname = ctx.input.lastName;
    if (ctx.input.email) contactData.email = ctx.input.email;
    if (ctx.input.phone) contactData.phone = ctx.input.phone;
    if (ctx.input.address1) contactData.address1 = ctx.input.address1;
    if (ctx.input.address2) contactData.address2 = ctx.input.address2;
    if (ctx.input.zipcode) contactData.zipcode = ctx.input.zipcode;
    if (ctx.input.city) contactData.city = ctx.input.city;
    if (ctx.input.country) contactData.country = ctx.input.country;
    if (ctx.input.taxNumber) contactData.tax_number = ctx.input.taxNumber;
    if (ctx.input.chamberOfCommerce)
      contactData.chamber_of_commerce = ctx.input.chamberOfCommerce;
    if (ctx.input.deliveryMethod) contactData.delivery_method = ctx.input.deliveryMethod;
    if (ctx.input.sendInvoicesToEmail)
      contactData.send_invoices_to_email = ctx.input.sendInvoicesToEmail;
    if (ctx.input.sendEstimatesToEmail)
      contactData.send_estimates_to_email = ctx.input.sendEstimatesToEmail;
    if (ctx.input.sepaActive !== undefined) contactData.sepa_active = ctx.input.sepaActive;
    if (ctx.input.sepaIban) contactData.sepa_iban = ctx.input.sepaIban;
    if (ctx.input.sepaIbanAccountName)
      contactData.sepa_iban_account_name = ctx.input.sepaIbanAccountName;
    if (ctx.input.sepaBic) contactData.sepa_bic = ctx.input.sepaBic;
    if (ctx.input.sepaMandateId) contactData.sepa_mandate_id = ctx.input.sepaMandateId;
    if (ctx.input.sepaMandateDate) contactData.sepa_mandate_date = ctx.input.sepaMandateDate;
    if (ctx.input.sepaSequenceType)
      contactData.sepa_sequence_type = ctx.input.sepaSequenceType;

    if (ctx.input.customFields && ctx.input.customFields.length > 0) {
      contactData.custom_fields_attributes = ctx.input.customFields.map(cf => ({
        id: cf.customFieldId,
        value: cf.value
      }));
    }

    let contact = await client.createContact(contactData);

    let name =
      contact.company_name || `${contact.firstname || ''} ${contact.lastname || ''}`.trim();
    return {
      output: {
        contactId: String(contact.id),
        customerId: contact.customer_id || null,
        companyName: contact.company_name || null,
        firstName: contact.firstname || null,
        lastName: contact.lastname || null,
        email: contact.email || null
      },
      message: `Created contact **${name}** with customer ID ${contact.customer_id || 'N/A'}.`
    };
  });
