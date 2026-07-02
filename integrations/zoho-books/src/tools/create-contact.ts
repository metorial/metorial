import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description:
    'Create a new customer or vendor in Zoho Books with company details, billing/shipping addresses, and contact persons.',
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      contactName: z.string().describe('Display name of the contact'),
      contactType: z
        .enum(['customer', 'vendor'])
        .describe('Whether this is a customer or vendor'),
      companyName: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      website: z.string().optional(),
      contactPersons: z
        .array(
          z.object({
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            email: z.string().optional(),
            phone: z.string().optional(),
            isPrimaryContact: z.boolean().optional()
          })
        )
        .optional(),
      billingAddress: z
        .object({
          street: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          zip: z.string().optional(),
          country: z.string().optional()
        })
        .optional(),
      shippingAddress: z
        .object({
          street: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          zip: z.string().optional(),
          country: z.string().optional()
        })
        .optional(),
      paymentTerms: z.number().optional().describe('Payment terms in days'),
      currencyId: z.string().optional(),
      notes: z.string().optional()
    })
  )
  .output(
    z.object({
      contactId: z.string(),
      contactName: z.string(),
      contactType: z.string().optional(),
      status: z.string().optional(),
      createdTime: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let body: Record<string, any> = {
      contact_name: ctx.input.contactName,
      contact_type: ctx.input.contactType
    };

    if (ctx.input.companyName !== undefined) {
      body.company_name = ctx.input.companyName;
    }

    if (ctx.input.email !== undefined) {
      body.email = ctx.input.email;
    }

    if (ctx.input.phone !== undefined) {
      body.phone = ctx.input.phone;
    }

    if (ctx.input.website !== undefined) {
      body.website = ctx.input.website;
    }

    if (ctx.input.contactPersons !== undefined) {
      body.contact_persons = ctx.input.contactPersons.map(person => {
        let p: Record<string, any> = {};
        if (person.firstName !== undefined) p.first_name = person.firstName;
        if (person.lastName !== undefined) p.last_name = person.lastName;
        if (person.email !== undefined) p.email = person.email;
        if (person.phone !== undefined) p.phone = person.phone;
        if (person.isPrimaryContact !== undefined)
          p.is_primary_contact = person.isPrimaryContact;
        return p;
      });
    }

    if (ctx.input.billingAddress !== undefined) {
      let addr = ctx.input.billingAddress;
      body.billing_address = {} as Record<string, any>;
      if (addr.street !== undefined) body.billing_address.street = addr.street;
      if (addr.city !== undefined) body.billing_address.city = addr.city;
      if (addr.state !== undefined) body.billing_address.state = addr.state;
      if (addr.zip !== undefined) body.billing_address.zip = addr.zip;
      if (addr.country !== undefined) body.billing_address.country = addr.country;
    }

    if (ctx.input.shippingAddress !== undefined) {
      let addr = ctx.input.shippingAddress;
      body.shipping_address = {} as Record<string, any>;
      if (addr.street !== undefined) body.shipping_address.street = addr.street;
      if (addr.city !== undefined) body.shipping_address.city = addr.city;
      if (addr.state !== undefined) body.shipping_address.state = addr.state;
      if (addr.zip !== undefined) body.shipping_address.zip = addr.zip;
      if (addr.country !== undefined) body.shipping_address.country = addr.country;
    }

    if (ctx.input.paymentTerms !== undefined) {
      body.payment_terms = ctx.input.paymentTerms;
    }

    if (ctx.input.currencyId !== undefined) {
      body.currency_id = ctx.input.currencyId;
    }

    if (ctx.input.notes !== undefined) {
      body.notes = ctx.input.notes;
    }

    let result = await client.createContact(body);
    let contact = result.contact;

    return {
      output: {
        contactId: contact.contact_id,
        contactName: contact.contact_name,
        contactType: contact.contact_type,
        status: contact.status,
        createdTime: contact.created_time
      },
      message: `Created ${ctx.input.contactType} **${ctx.input.contactName}**.`
    };
  })
  .build();
