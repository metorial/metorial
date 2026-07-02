import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let addressSchema = z
  .object({
    street: z.string().optional(),
    street2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
    phone: z.string().optional(),
    fax: z.string().optional()
  })
  .optional();

export let manageContact = SlateTool.create(spec, {
  name: 'Manage Contact',
  key: 'manage_contact',
  description: `Create or update a customer or vendor contact in Zoho Inventory. Supports billing/shipping addresses, payment terms, and custom fields.
Use without a **contactId** to create a new contact, or with a **contactId** to update an existing one. You can also set the contact status to active/inactive.`,
  instructions: [
    'To create, provide at least contactName and contactType.',
    'To update, provide the contactId and the fields you want to change.'
  ],
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
        .describe('ID of the contact to update. Omit to create a new contact.'),
      contactName: z
        .string()
        .optional()
        .describe('Display name of the contact (required for creation)'),
      contactType: z
        .enum(['customer', 'vendor'])
        .optional()
        .describe('Contact type (required for creation)'),
      companyName: z.string().optional().describe('Company name'),
      email: z.string().optional().describe('Primary email address'),
      phone: z.string().optional().describe('Phone number'),
      website: z.string().optional().describe('Website URL'),
      currencyId: z.string().optional().describe('Currency ID for the contact'),
      paymentTerms: z.number().optional().describe('Payment terms in days'),
      paymentTermsLabel: z
        .string()
        .optional()
        .describe('Payment terms label (e.g., "Net 30")'),
      notes: z.string().optional().describe('Notes about the contact'),
      billingAddress: addressSchema.describe('Billing address'),
      shippingAddress: addressSchema.describe('Shipping address'),
      status: z.enum(['active', 'inactive']).optional().describe('Set contact status')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('Contact ID'),
      contactName: z.string().describe('Contact name'),
      contactType: z.string().optional().describe('Contact type'),
      companyName: z.string().optional().describe('Company name'),
      email: z.string().optional().describe('Email'),
      status: z.string().optional().describe('Contact status'),
      outstandingPayable: z.number().optional().describe('Outstanding payable amount'),
      outstandingReceivable: z.number().optional().describe('Outstanding receivable amount')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let body: Record<string, any> = {};
    if (ctx.input.contactName !== undefined) body.contact_name = ctx.input.contactName;
    if (ctx.input.contactType !== undefined) body.contact_type = ctx.input.contactType;
    if (ctx.input.companyName !== undefined) body.company_name = ctx.input.companyName;
    if (ctx.input.email !== undefined) body.email = ctx.input.email;
    if (ctx.input.phone !== undefined) body.phone = ctx.input.phone;
    if (ctx.input.website !== undefined) body.website = ctx.input.website;
    if (ctx.input.currencyId !== undefined) body.currency_id = ctx.input.currencyId;
    if (ctx.input.paymentTerms !== undefined) body.payment_terms = ctx.input.paymentTerms;
    if (ctx.input.paymentTermsLabel !== undefined)
      body.payment_terms_label = ctx.input.paymentTermsLabel;
    if (ctx.input.notes !== undefined) body.notes = ctx.input.notes;

    if (ctx.input.billingAddress) {
      body.billing_address = {
        street: ctx.input.billingAddress.street,
        street2: ctx.input.billingAddress.street2,
        city: ctx.input.billingAddress.city,
        state: ctx.input.billingAddress.state,
        zip: ctx.input.billingAddress.zip,
        country: ctx.input.billingAddress.country,
        phone: ctx.input.billingAddress.phone,
        fax: ctx.input.billingAddress.fax
      };
    }
    if (ctx.input.shippingAddress) {
      body.shipping_address = {
        street: ctx.input.shippingAddress.street,
        street2: ctx.input.shippingAddress.street2,
        city: ctx.input.shippingAddress.city,
        state: ctx.input.shippingAddress.state,
        zip: ctx.input.shippingAddress.zip,
        country: ctx.input.shippingAddress.country,
        phone: ctx.input.shippingAddress.phone,
        fax: ctx.input.shippingAddress.fax
      };
    }

    let result: any;
    let action: string;

    if (ctx.input.contactId) {
      result = await client.updateContact(ctx.input.contactId, body);
      action = 'updated';

      if (ctx.input.status === 'active') {
        await client.markContactActive(ctx.input.contactId);
      } else if (ctx.input.status === 'inactive') {
        await client.markContactInactive(ctx.input.contactId);
      }
    } else {
      result = await client.createContact(body);
      action = 'created';
    }

    let contact = result.contact;

    return {
      output: {
        contactId: String(contact.contact_id),
        contactName: contact.contact_name,
        contactType: contact.contact_type ?? undefined,
        companyName: contact.company_name ?? undefined,
        email: contact.email ?? undefined,
        status: contact.status ?? undefined,
        outstandingPayable: contact.outstanding_payable_amount ?? undefined,
        outstandingReceivable: contact.outstanding_receivable_amount ?? undefined
      },
      message: `Contact **${contact.contact_name}** (${contact.contact_id}) ${action} successfully.`
    };
  })
  .build();
