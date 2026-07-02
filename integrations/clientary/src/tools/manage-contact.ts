import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let contactSchema = z.object({
  contactId: z.number().describe('Unique ID of the contact'),
  clientId: z.number().optional().describe('ID of the associated client'),
  name: z.string().describe('Contact full name'),
  email: z.string().optional().describe('Email address'),
  phone: z.string().optional().describe('Phone number'),
  mobile: z.string().optional().describe('Mobile phone number'),
  title: z.string().optional().describe('Job title'),
  extension: z.string().optional().describe('Phone extension')
});

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Create a new contact within a client organization. Contacts represent individual people associated with a client.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      clientId: z.number().describe('ID of the client to add the contact to'),
      name: z.string().describe('Full name of the contact (required)'),
      email: z.string().describe('Email address (required)'),
      phone: z.string().optional().describe('Phone number'),
      mobile: z.string().optional().describe('Mobile phone number'),
      title: z.string().optional().describe('Job title'),
      extension: z.string().optional().describe('Phone extension')
    })
  )
  .output(contactSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });

    let data: Record<string, any> = {
      name: ctx.input.name,
      email: ctx.input.email
    };
    if (ctx.input.phone) data.phone = ctx.input.phone;
    if (ctx.input.mobile) data.mobile = ctx.input.mobile;
    if (ctx.input.title) data.title = ctx.input.title;
    if (ctx.input.extension) data.ext = ctx.input.extension;

    let result = await client.createContact(ctx.input.clientId, data);
    let c = result.contact || result;

    return {
      output: {
        contactId: c.id,
        clientId: c.client_id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        mobile: c.mobile,
        title: c.title,
        extension: c.ext
      },
      message: `Created contact **${c.name}** (ID: ${c.id}) for client ID ${ctx.input.clientId}.`
    };
  })
  .build();

export let updateContact = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Update an existing contact's information.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contactId: z.number().describe('ID of the contact to update'),
      name: z.string().optional().describe('Full name'),
      email: z.string().optional().describe('Email address'),
      phone: z.string().optional().describe('Phone number'),
      mobile: z.string().optional().describe('Mobile phone number'),
      title: z.string().optional().describe('Job title'),
      extension: z.string().optional().describe('Phone extension')
    })
  )
  .output(contactSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });

    let data: Record<string, any> = {};
    if (ctx.input.name !== undefined) data.name = ctx.input.name;
    if (ctx.input.email !== undefined) data.email = ctx.input.email;
    if (ctx.input.phone !== undefined) data.phone = ctx.input.phone;
    if (ctx.input.mobile !== undefined) data.mobile = ctx.input.mobile;
    if (ctx.input.title !== undefined) data.title = ctx.input.title;
    if (ctx.input.extension !== undefined) data.ext = ctx.input.extension;

    let result = await client.updateContact(ctx.input.contactId, data);
    let c = result.contact || result;

    return {
      output: {
        contactId: c.id,
        clientId: c.client_id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        mobile: c.mobile,
        title: c.title,
        extension: c.ext
      },
      message: `Updated contact **${c.name}** (ID: ${c.id}).`
    };
  })
  .build();

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `List contacts, optionally filtered by client. Returns paginated results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      clientId: z.number().optional().describe('Filter contacts by client ID'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      contacts: z.array(contactSchema).describe('List of contacts'),
      totalCount: z.number().optional().describe('Total number of matching contacts'),
      pageCount: z.number().optional().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });

    let result = await client.listContacts({
      clientId: ctx.input.clientId,
      page: ctx.input.page
    });

    let contacts = (result.contacts || []).map((c: any) => ({
      contactId: c.id,
      clientId: c.client_id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      mobile: c.mobile,
      title: c.title,
      extension: c.ext
    }));

    return {
      output: {
        contacts,
        totalCount: result.total_count,
        pageCount: result.page_count
      },
      message: `Retrieved ${contacts.length} contact(s).`
    };
  })
  .build();

export let deleteContact = SlateTool.create(spec, {
  name: 'Delete Contact',
  key: 'delete_contact',
  description: `Permanently delete a contact. This also removes associated comments.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      contactId: z.number().describe('ID of the contact to delete')
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
      message: `Deleted contact ID ${ctx.input.contactId}.`
    };
  })
  .build();
