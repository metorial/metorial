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

let toSnakeCase = (str: string): string =>
  str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

let convertAddress = (addr: {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}) => {
  let result: Record<string, string> = {};
  if (addr.street !== undefined) result.street = addr.street;
  if (addr.city !== undefined) result.city = addr.city;
  if (addr.state !== undefined) result.state = addr.state;
  if (addr.zip !== undefined) result.zip = addr.zip;
  if (addr.country !== undefined) result.country = addr.country;
  return result;
};

export let updateContact = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Update an existing customer or vendor contact. Can modify company details, addresses, payment terms, and status. Supports marking contacts as active or inactive.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact to update'),
      contactName: z.string().optional(),
      companyName: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      website: z.string().optional(),
      billingAddress: addressSchema.optional(),
      shippingAddress: addressSchema.optional(),
      paymentTerms: z.number().optional(),
      notes: z.string().optional(),
      markAs: z
        .enum(['active', 'inactive'])
        .optional()
        .describe('Change the status of the contact')
    })
  )
  .output(
    z.object({
      contactId: z.string(),
      contactName: z.string(),
      contactType: z.string().optional(),
      status: z.string().optional(),
      lastModifiedTime: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { contactId, markAs, billingAddress, shippingAddress, ...fields } = ctx.input;

    if (markAs === 'active') {
      await client.markContactActive(contactId);
    } else if (markAs === 'inactive') {
      await client.markContactInactive(contactId);
    }

    let payload: Record<string, any> = {};

    for (let [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        payload[toSnakeCase(key)] = value;
      }
    }

    if (billingAddress) {
      payload.billing_address = convertAddress(billingAddress);
    }

    if (shippingAddress) {
      payload.shipping_address = convertAddress(shippingAddress);
    }

    let contact: any;

    if (Object.keys(payload).length > 0) {
      let resp = await client.updateContact(contactId, payload);
      contact = resp.contact;
    } else {
      let resp = await client.getContact(contactId);
      contact = resp.contact;
    }

    return {
      output: {
        contactId: contact.contact_id,
        contactName: contact.contact_name,
        contactType: contact.contact_type,
        status: contact.status,
        lastModifiedTime: contact.last_modified_time
      },
      message: `Updated contact **${contact.contact_name}**.`
    };
  })
  .build();
