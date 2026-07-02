import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let addressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional()
});

let contactPersonSchema = z.object({
  contactPersonId: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  isPrimaryContact: z.boolean().optional()
});

let mapAddress = (addr: any) => {
  if (!addr) return undefined;
  return {
    street: addr.street || addr.address || undefined,
    city: addr.city || undefined,
    state: addr.state || undefined,
    zip: addr.zip || undefined,
    country: addr.country || undefined
  };
};

let mapContactPerson = (person: any) => ({
  contactPersonId: person.contact_person_id,
  firstName: person.first_name,
  lastName: person.last_name,
  email: person.email,
  phone: person.phone,
  isPrimaryContact: person.is_primary_contact
});

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieve full details of a specific customer or vendor by their contact ID, including addresses, contact persons, and payment terms.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact to retrieve')
    })
  )
  .output(
    z.object({
      contactId: z.string(),
      contactName: z.string(),
      companyName: z.string().optional(),
      contactType: z.string().optional(),
      status: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      website: z.string().optional(),
      billingAddress: addressSchema.optional(),
      shippingAddress: addressSchema.optional(),
      contactPersons: z.array(contactPersonSchema).optional(),
      paymentTerms: z.number().optional(),
      paymentTermsLabel: z.string().optional(),
      currencyCode: z.string().optional(),
      outstandingReceivableAmount: z.number().optional(),
      outstandingPayableAmount: z.number().optional(),
      unusedCreditsReceivableAmount: z.number().optional(),
      notes: z.string().optional(),
      createdTime: z.string().optional(),
      lastModifiedTime: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let data = await client.getContact(ctx.input.contactId);
    let c = data.contact;

    let contact = {
      contactId: c.contact_id,
      contactName: c.contact_name,
      companyName: c.company_name || undefined,
      contactType: c.contact_type || undefined,
      status: c.status || undefined,
      email: c.email || undefined,
      phone: c.phone || undefined,
      website: c.website || undefined,
      billingAddress: mapAddress(c.billing_address),
      shippingAddress: mapAddress(c.shipping_address),
      contactPersons: c.contact_persons?.map(mapContactPerson),
      paymentTerms: c.payment_terms ?? undefined,
      paymentTermsLabel: c.payment_terms_label || undefined,
      currencyCode: c.currency_code || undefined,
      outstandingReceivableAmount: c.outstanding_receivable_amount ?? undefined,
      outstandingPayableAmount: c.outstanding_payable_amount ?? undefined,
      unusedCreditsReceivableAmount: c.unused_credits_receivable_amount ?? undefined,
      notes: c.notes || undefined,
      createdTime: c.created_time || undefined,
      lastModifiedTime: c.last_modified_time || undefined
    };

    return {
      output: contact,
      message: `Retrieved contact **${contact.contactName}** (${contact.contactType}).`
    };
  })
  .build();
