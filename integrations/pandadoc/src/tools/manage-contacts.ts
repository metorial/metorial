import { SlateTool } from 'slates';
import { z } from 'zod';
import { PandaDocClient } from '../lib/client';
import { spec } from '../spec';

let contactFieldsSchema = z.object({
  email: z.string().describe('Contact email address'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  company: z.string().optional().describe('Company name'),
  jobTitle: z.string().optional().describe('Job title'),
  phone: z.string().optional().describe('Phone number'),
  country: z.string().optional().describe('Country'),
  state: z.string().optional().describe('State'),
  streetAddress: z.string().optional().describe('Street address')
});

let contactOutputSchema = z.object({
  contactId: z.string().describe('Contact UUID'),
  email: z.string().describe('Contact email'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  company: z.string().optional().describe('Company name'),
  jobTitle: z.string().optional().describe('Job title'),
  phone: z.string().optional().describe('Phone number'),
  country: z.string().optional().describe('Country'),
  state: z.string().optional().describe('State'),
  streetAddress: z.string().optional().describe('Street address')
});

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Create a new contact in the PandaDoc contacts directory. Contacts can be used as recipients when creating documents.`,
  tags: {
    readOnly: false
  }
})
  .input(contactFieldsSchema)
  .output(contactOutputSchema)
  .handleInvocation(async ctx => {
    let client = new PandaDocClient({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let result = await client.createContact({
      email: ctx.input.email,
      first_name: ctx.input.firstName,
      last_name: ctx.input.lastName,
      company: ctx.input.company,
      job_title: ctx.input.jobTitle,
      phone: ctx.input.phone,
      country: ctx.input.country,
      state: ctx.input.state,
      street_address: ctx.input.streetAddress
    });

    return {
      output: {
        contactId: result.id,
        email: result.email,
        firstName: result.first_name,
        lastName: result.last_name,
        company: result.company,
        jobTitle: result.job_title,
        phone: result.phone,
        country: result.country,
        state: result.state,
        streetAddress: result.street_address
      },
      message: `Created contact **${ctx.input.email}** (ID: \`${result.id}\`).`
    };
  })
  .build();

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `List contacts from the PandaDoc contacts directory. Optionally filter by email address.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().optional().describe('Filter by exact email address')
    })
  )
  .output(
    z.object({
      contacts: z.array(contactOutputSchema).describe('List of contacts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PandaDocClient({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let result = await client.listContacts(ctx.input.email);

    let contacts = (result.results || result || []).map((c: any) => ({
      contactId: c.id,
      email: c.email,
      firstName: c.first_name,
      lastName: c.last_name,
      company: c.company,
      jobTitle: c.job_title,
      phone: c.phone,
      country: c.country,
      state: c.state,
      streetAddress: c.street_address
    }));

    return {
      output: { contacts },
      message: `Found **${contacts.length}** contact(s).`
    };
  })
  .build();

export let updateContact = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Update an existing contact in the PandaDoc contacts directory. Only provide the fields you want to change.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      contactId: z.string().describe('UUID of the contact to update'),
      email: z.string().optional().describe('New email address'),
      firstName: z.string().optional().describe('New first name'),
      lastName: z.string().optional().describe('New last name'),
      company: z.string().optional().describe('New company name'),
      jobTitle: z.string().optional().describe('New job title'),
      phone: z.string().optional().describe('New phone number'),
      country: z.string().optional().describe('New country'),
      state: z.string().optional().describe('New state'),
      streetAddress: z.string().optional().describe('New street address')
    })
  )
  .output(contactOutputSchema)
  .handleInvocation(async ctx => {
    let client = new PandaDocClient({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let updateParams: any = {};
    if (ctx.input.email) updateParams.email = ctx.input.email;
    if (ctx.input.firstName) updateParams.first_name = ctx.input.firstName;
    if (ctx.input.lastName) updateParams.last_name = ctx.input.lastName;
    if (ctx.input.company) updateParams.company = ctx.input.company;
    if (ctx.input.jobTitle) updateParams.job_title = ctx.input.jobTitle;
    if (ctx.input.phone) updateParams.phone = ctx.input.phone;
    if (ctx.input.country) updateParams.country = ctx.input.country;
    if (ctx.input.state) updateParams.state = ctx.input.state;
    if (ctx.input.streetAddress) updateParams.street_address = ctx.input.streetAddress;

    let result = await client.updateContact(ctx.input.contactId, updateParams);

    return {
      output: {
        contactId: result.id,
        email: result.email,
        firstName: result.first_name,
        lastName: result.last_name,
        company: result.company,
        jobTitle: result.job_title,
        phone: result.phone,
        country: result.country,
        state: result.state,
        streetAddress: result.street_address
      },
      message: `Updated contact \`${ctx.input.contactId}\`.`
    };
  })
  .build();

export let deleteContact = SlateTool.create(spec, {
  name: 'Delete Contact',
  key: 'delete_contact',
  description: `Delete a contact from the PandaDoc contacts directory.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      contactId: z.string().describe('UUID of the contact to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the contact was successfully deleted'),
      contactId: z.string().describe('UUID of the deleted contact')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PandaDocClient({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    await client.deleteContact(ctx.input.contactId);

    return {
      output: {
        deleted: true,
        contactId: ctx.input.contactId
      },
      message: `Deleted contact \`${ctx.input.contactId}\`.`
    };
  })
  .build();
