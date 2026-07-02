import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZohoBooksClient } from '../lib/client';
import { zohoServiceError } from '../lib/errors';
import type { Datacenter } from '../lib/urls';
import { spec } from '../spec';

let addressSchema = z.object({
  attention: z.string().optional(),
  address: z.string().optional().describe('Street 1 address'),
  street: z.string().optional().describe('Deprecated alias for address'),
  street2: z.string().optional().describe('Street 2 address'),
  city: z.string().optional(),
  state: z.string().optional(),
  stateCode: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
  fax: z.string().optional(),
  phone: z.string().optional()
});

export let booksManageContact = SlateTool.create(spec, {
  name: 'Books Manage Contact',
  key: 'books_manage_contact',
  description: `Create, update, or delete contacts (customers/vendors) in Zoho Books. Manage contact details, billing/shipping addresses, payment terms, and contact persons.`,
  instructions: [
    'The organizationId is required for all Zoho Books operations.',
    'For create, contactName is required.',
    'Use contactType to specify "customer" or "vendor".'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      organizationId: z.string().describe('Zoho Books organization ID'),
      action: z
        .enum(['create', 'update', 'delete', 'get', 'list'])
        .describe('Operation to perform'),
      contactId: z
        .string()
        .optional()
        .describe('Contact ID (required for get, update, delete)'),
      contactName: z
        .string()
        .optional()
        .describe('Contact/company name (required for create)'),
      contactType: z.enum(['customer', 'vendor']).optional().describe('Type of contact'),
      companyName: z.string().optional().describe('Company name'),
      email: z.string().optional().describe('Contact email address'),
      phone: z.string().optional().describe('Contact phone number'),
      website: z.string().optional().describe('Contact website'),
      billingAddress: addressSchema.optional().describe('Billing address'),
      shippingAddress: addressSchema.optional().describe('Shipping address'),
      paymentTerms: z.number().optional().describe('Net payment terms in days'),
      notes: z.string().optional().describe('Notes about the contact'),
      page: z.number().optional().describe('Page number (for list action)'),
      perPage: z.number().optional().describe('Records per page (for list action)')
    })
  )
  .output(
    z.object({
      contact: z.record(z.string(), z.any()).optional().describe('Contact record'),
      contacts: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of contacts (for list action)'),
      deleted: z.boolean().optional(),
      hasMorePages: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let dc = (ctx.auth.datacenter || ctx.config.datacenter || 'us') as Datacenter;
    let client = new ZohoBooksClient({
      token: ctx.auth.token,
      datacenter: dc,
      organizationId: ctx.input.organizationId
    });

    if (ctx.input.action === 'list') {
      let result = await client.listContacts({
        page: ctx.input.page,
        perPage: ctx.input.perPage,
        contactType: ctx.input.contactType
      });
      return {
        output: {
          contacts: result?.contacts || [],
          hasMorePages: result?.page_context?.has_more_page ?? false
        },
        message: `Retrieved **${(result?.contacts || []).length}** contacts.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.contactId) throw zohoServiceError('contactId is required for get');
      let result = await client.getContact(ctx.input.contactId);
      return {
        output: { contact: result?.contact || result },
        message: `Fetched contact **${result?.contact?.contact_name || ctx.input.contactId}**.`
      };
    }

    let buildAddress = (address: z.infer<typeof addressSchema>) => ({
      attention: address.attention,
      address: address.address || address.street,
      street2: address.street2,
      city: address.city,
      state: address.state,
      state_code: address.stateCode,
      zip: address.zip,
      country: address.country,
      fax: address.fax,
      phone: address.phone
    });

    let buildData = () => {
      let data: Record<string, any> = {};
      if (ctx.input.contactName) data.contact_name = ctx.input.contactName;
      if (ctx.input.contactType) data.contact_type = ctx.input.contactType;
      if (ctx.input.companyName) data.company_name = ctx.input.companyName;
      if (ctx.input.email) data.email = ctx.input.email;
      if (ctx.input.phone) data.phone = ctx.input.phone;
      if (ctx.input.website) data.website = ctx.input.website;
      if (ctx.input.paymentTerms !== undefined) data.payment_terms = ctx.input.paymentTerms;
      if (ctx.input.notes) data.notes = ctx.input.notes;
      if (ctx.input.billingAddress) {
        data.billing_address = buildAddress(ctx.input.billingAddress);
      }
      if (ctx.input.shippingAddress) {
        data.shipping_address = buildAddress(ctx.input.shippingAddress);
      }
      return data;
    };

    if (ctx.input.action === 'create') {
      if (!ctx.input.contactName) throw zohoServiceError('contactName is required for create');
      let result = await client.createContact(buildData());
      let contact = result?.contact;
      return {
        output: { contact },
        message: `Created contact **${contact?.contact_name}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.contactId) throw zohoServiceError('contactId is required for update');
      let result = await client.updateContact(ctx.input.contactId, buildData());
      let contact = result?.contact;
      return {
        output: { contact },
        message: `Updated contact **${contact?.contact_name || ctx.input.contactId}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.contactId) throw zohoServiceError('contactId is required for delete');
      await client.deleteContact(ctx.input.contactId);
      return {
        output: { contact: { contact_id: ctx.input.contactId }, deleted: true },
        message: `Deleted contact **${ctx.input.contactId}**.`
      };
    }

    throw zohoServiceError('Invalid Books contact action.');
  })
  .build();
