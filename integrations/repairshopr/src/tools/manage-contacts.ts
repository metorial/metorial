import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let contactSchema = z.object({
  contactId: z.number().describe('Contact ID'),
  customerId: z.number().optional().describe('Parent customer ID'),
  name: z.string().optional().describe('Contact name'),
  email: z.string().optional().describe('Email address'),
  phone: z.string().optional().describe('Phone number'),
  mobile: z.string().optional().describe('Mobile number'),
  address1: z.string().optional().describe('Address line 1'),
  address2: z.string().optional().describe('Address line 2'),
  city: z.string().optional().describe('City'),
  state: z.string().optional().describe('State'),
  zip: z.string().optional().describe('ZIP/postal code'),
  notes: z.string().optional().describe('Notes'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last updated timestamp')
});

let mapContact = (c: any) => ({
  contactId: c.id,
  customerId: c.customer_id,
  name: c.name,
  email: c.email,
  phone: c.phone,
  mobile: c.mobile,
  address1: c.address1,
  address2: c.address2,
  city: c.city,
  state: c.state,
  zip: c.zip,
  notes: c.notes,
  createdAt: c.created_at,
  updatedAt: c.updated_at
});

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `List contacts for a specific customer. Each customer can have multiple contacts with individual contact details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      customerId: z.number().optional().describe('Filter contacts by customer ID'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      contacts: z.array(contactSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    let result = await client.listContacts(ctx.input);
    let contacts = (result.contacts || []).map(mapContact);

    return {
      output: { contacts },
      message: `Found **${contacts.length}** contact(s)${ctx.input.customerId ? ` for customer ${ctx.input.customerId}` : ''}.`
    };
  })
  .build();

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Add a new contact to a customer record. Contacts represent individual people associated with a customer account.`
})
  .input(
    z.object({
      customerId: z.number().describe('Customer ID to add the contact to'),
      name: z.string().optional().describe('Contact name'),
      email: z.string().optional().describe('Email address'),
      phone: z.string().optional().describe('Phone number'),
      mobile: z.string().optional().describe('Mobile number'),
      address1: z.string().optional().describe('Address line 1'),
      address2: z.string().optional().describe('Address line 2'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State'),
      zip: z.string().optional().describe('ZIP/postal code'),
      notes: z.string().optional().describe('Notes about the contact')
    })
  )
  .output(contactSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    let result = await client.createContact(ctx.input);
    let c = result.contact || result;

    return {
      output: mapContact(c),
      message: `Created contact **${c.name || c.id}** for customer ${ctx.input.customerId}.`
    };
  })
  .build();

export let updateContact = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Update an existing contact's information. Only provided fields are modified.`
})
  .input(
    z.object({
      contactId: z.number().describe('The contact ID to update'),
      name: z.string().optional().describe('Updated name'),
      email: z.string().optional().describe('Updated email address'),
      phone: z.string().optional().describe('Updated phone number'),
      mobile: z.string().optional().describe('Updated mobile number'),
      address1: z.string().optional().describe('Updated address line 1'),
      address2: z.string().optional().describe('Updated address line 2'),
      city: z.string().optional().describe('Updated city'),
      state: z.string().optional().describe('Updated state'),
      zip: z.string().optional().describe('Updated ZIP/postal code'),
      notes: z.string().optional().describe('Updated notes')
    })
  )
  .output(contactSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    let { contactId, ...updateData } = ctx.input;
    let result = await client.updateContact(contactId, updateData);
    let c = result.contact || result;

    return {
      output: mapContact(c),
      message: `Updated contact **${c.name || c.id}**.`
    };
  })
  .build();

export let deleteContact = SlateTool.create(spec, {
  name: 'Delete Contact',
  key: 'delete_contact',
  description: `Delete a contact from a customer record. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      contactId: z.number().describe('The contact ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    await client.deleteContact(ctx.input.contactId);

    return {
      output: { success: true },
      message: `Deleted contact **${ctx.input.contactId}**.`
    };
  })
  .build();
