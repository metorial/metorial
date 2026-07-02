import { SlateTool } from 'slates';
import { z } from 'zod';
import { MoneybirdClient } from '../lib/client';
import { spec } from '../spec';

let contactDetailSchema = z.object({
  contactId: z.string().describe('Unique contact ID'),
  companyName: z.string().nullable().describe('Company name'),
  firstName: z.string().nullable().describe('First name'),
  lastName: z.string().nullable().describe('Last name'),
  customerId: z.string().nullable().describe('Customer ID'),
  attention: z.string().nullable().describe('Attention / c/o'),
  email: z.string().nullable().describe('Primary email'),
  phone: z.string().nullable().describe('Phone number'),
  address1: z.string().nullable().describe('Address line 1'),
  address2: z.string().nullable().describe('Address line 2'),
  zipcode: z.string().nullable().describe('Zip/postal code'),
  city: z.string().nullable().describe('City'),
  country: z.string().nullable().describe('Country code'),
  taxNumber: z.string().nullable().describe('Tax/VAT number'),
  chamberOfCommerce: z.string().nullable().describe('Chamber of Commerce number'),
  deliveryMethod: z.string().nullable().describe('Invoice delivery method'),
  invoiceWorkflowId: z.string().nullable().describe('Default invoice workflow ID'),
  estimateWorkflowId: z.string().nullable().describe('Default estimate workflow ID'),
  sepaActive: z.boolean().describe('Whether SEPA direct debit is active'),
  sepaIban: z.string().nullable().describe('SEPA IBAN'),
  archived: z.boolean().describe('Whether the contact is archived'),
  createdAt: z.string().nullable().describe('Creation timestamp'),
  updatedAt: z.string().nullable().describe('Last update timestamp'),
  contactPeople: z
    .array(
      z.object({
        contactPersonId: z.string(),
        firstName: z.string().nullable(),
        lastName: z.string().nullable(),
        email: z.string().nullable(),
        phone: z.string().nullable(),
        department: z.string().nullable()
      })
    )
    .describe('Contact persons')
});

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieve full details of a contact by its Moneybird ID or customer ID. Returns comprehensive contact information including addresses, tax details, SEPA settings, and associated contact persons.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactId: z.string().optional().describe('Moneybird internal contact ID'),
      customerId: z.string().optional().describe('Customer ID (the human-readable identifier)')
    })
  )
  .output(contactDetailSchema)
  .handleInvocation(async ctx => {
    let client = new MoneybirdClient({
      token: ctx.auth.token,
      administrationId: ctx.config.administrationId
    });

    let contact: any;
    if (ctx.input.customerId) {
      contact = await client.getContactByCustomerId(ctx.input.customerId);
    } else if (ctx.input.contactId) {
      contact = await client.getContact(ctx.input.contactId);
    } else {
      throw new Error('Either contactId or customerId must be provided');
    }

    let result = {
      contactId: String(contact.id),
      companyName: contact.company_name || null,
      firstName: contact.firstname || null,
      lastName: contact.lastname || null,
      customerId: contact.customer_id || null,
      attention: contact.attention || null,
      email: contact.email || null,
      phone: contact.phone || null,
      address1: contact.address1 || null,
      address2: contact.address2 || null,
      zipcode: contact.zipcode || null,
      city: contact.city || null,
      country: contact.country || null,
      taxNumber: contact.tax_number || null,
      chamberOfCommerce: contact.chamber_of_commerce || null,
      deliveryMethod: contact.delivery_method || null,
      invoiceWorkflowId: contact.invoice_workflow_id
        ? String(contact.invoice_workflow_id)
        : null,
      estimateWorkflowId: contact.estimate_workflow_id
        ? String(contact.estimate_workflow_id)
        : null,
      sepaActive: contact.sepa_active || false,
      sepaIban: contact.sepa_iban || null,
      archived: contact.archived || false,
      createdAt: contact.created_at || null,
      updatedAt: contact.updated_at || null,
      contactPeople: (contact.contact_people || []).map((cp: any) => ({
        contactPersonId: String(cp.id),
        firstName: cp.firstname || null,
        lastName: cp.lastname || null,
        email: cp.email || null,
        phone: cp.phone || null,
        department: cp.department || null
      }))
    };

    let name =
      result.companyName ||
      `${result.firstName || ''} ${result.lastName || ''}`.trim() ||
      'Unknown';
    return {
      output: result,
      message: `Retrieved contact **${name}** (ID: ${result.contactId}).`
    };
  });
