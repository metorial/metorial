import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let contactOutputSchema = z.object({
  contactId: z.number().describe('Contact person ID'),
  firstname: z.string().optional().describe('First name'),
  lastname: z.string().describe('Last name'),
  gender: z.string().optional().describe('Gender (F/M/U)'),
  title: z.string().optional().describe('Professional title'),
  jobPosition: z.string().optional().describe('Job position/role'),
  email: z.string().optional().describe('Email address'),
  phone: z.string().optional().describe('Phone number'),
  mobile: z.string().optional().describe('Mobile phone number'),
  company: z.any().optional().describe('Associated company details'),
  tags: z.array(z.string()).optional().describe('Contact tags'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

let mapContact = (c: any) => ({
  contactId: c.id,
  firstname: c.firstname,
  lastname: c.lastname,
  gender: c.gender,
  title: c.title,
  jobPosition: c.job_position,
  email: c.email,
  phone: c.phone,
  mobile: c.mobile,
  company: c.company,
  tags: c.tags,
  createdAt: c.created_at,
  updatedAt: c.updated_at
});

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `Retrieve a list of contact persons. Supports filtering by tags, search term, and phone number.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tags: z.string().optional().describe('Comma-separated list of tags to filter by'),
      term: z.string().optional().describe('Full-text search term'),
      phone: z.string().optional().describe('Filter by phone number')
    })
  )
  .output(
    z.object({
      contacts: z.array(contactOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });

    let params: Record<string, any> = {};
    if (ctx.input.tags) params.tags = ctx.input.tags;
    if (ctx.input.term) params.term = ctx.input.term;
    if (ctx.input.phone) params.phone = ctx.input.phone;

    let data = await client.listContacts(params);
    let contacts = (data as any[]).map(mapContact);

    return {
      output: { contacts },
      message: `Found **${contacts.length}** contacts.`
    };
  })
  .build();

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieve detailed information about a specific contact person.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactId: z.number().describe('The ID of the contact to retrieve')
    })
  )
  .output(contactOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });
    let c = await client.getContact(ctx.input.contactId);

    return {
      output: mapContact(c),
      message: `Retrieved contact **${c.firstname} ${c.lastname}** (ID: ${c.id}).`
    };
  })
  .build();

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Create a new contact person in MOCO. Requires last name and gender. Can be linked to a company.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      firstname: z.string().optional().describe('First name'),
      lastname: z.string().describe('Last name'),
      gender: z.enum(['F', 'M', 'U']).describe('Gender: F (female), M (male), U (unknown)'),
      title: z.string().optional().describe('Professional title'),
      jobPosition: z.string().optional().describe('Job position/role'),
      email: z.string().optional().describe('Email address'),
      phone: z.string().optional().describe('Phone number'),
      mobile: z.string().optional().describe('Mobile phone number'),
      companyId: z.number().optional().describe('Company ID to associate this contact with'),
      tags: z.array(z.string()).optional().describe('Contact tags')
    })
  )
  .output(contactOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });

    let data: Record<string, any> = {
      lastname: ctx.input.lastname,
      gender: ctx.input.gender
    };

    if (ctx.input.firstname) data.firstname = ctx.input.firstname;
    if (ctx.input.title) data.title = ctx.input.title;
    if (ctx.input.jobPosition) data.job_position = ctx.input.jobPosition;
    if (ctx.input.email) data.email = ctx.input.email;
    if (ctx.input.phone) data.phone = ctx.input.phone;
    if (ctx.input.mobile) data.mobile = ctx.input.mobile;
    if (ctx.input.companyId) data.company_id = ctx.input.companyId;
    if (ctx.input.tags) data.tags = ctx.input.tags;

    let c = await client.createContact(data);

    return {
      output: mapContact(c),
      message: `Created contact **${c.firstname || ''} ${c.lastname}** (ID: ${c.id}).`
    };
  })
  .build();

export let updateContact = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Update an existing contact person's details.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      contactId: z.number().describe('The ID of the contact to update'),
      firstname: z.string().optional().describe('New first name'),
      lastname: z.string().optional().describe('New last name'),
      gender: z.enum(['F', 'M', 'U']).optional().describe('New gender'),
      title: z.string().optional().describe('New professional title'),
      jobPosition: z.string().optional().describe('New job position'),
      email: z.string().optional().describe('New email address'),
      phone: z.string().optional().describe('New phone number'),
      mobile: z.string().optional().describe('New mobile number'),
      tags: z.array(z.string()).optional().describe('Updated tags')
    })
  )
  .output(contactOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });

    let data: Record<string, any> = {};
    if (ctx.input.firstname !== undefined) data.firstname = ctx.input.firstname;
    if (ctx.input.lastname) data.lastname = ctx.input.lastname;
    if (ctx.input.gender) data.gender = ctx.input.gender;
    if (ctx.input.title !== undefined) data.title = ctx.input.title;
    if (ctx.input.jobPosition !== undefined) data.job_position = ctx.input.jobPosition;
    if (ctx.input.email !== undefined) data.email = ctx.input.email;
    if (ctx.input.phone !== undefined) data.phone = ctx.input.phone;
    if (ctx.input.mobile !== undefined) data.mobile = ctx.input.mobile;
    if (ctx.input.tags) data.tags = ctx.input.tags;

    let c = await client.updateContact(ctx.input.contactId, data);

    return {
      output: mapContact(c),
      message: `Updated contact **${c.firstname || ''} ${c.lastname}** (ID: ${c.id}).`
    };
  })
  .build();

export let deleteContact = SlateTool.create(spec, {
  name: 'Delete Contact',
  key: 'delete_contact',
  description: `Permanently delete a contact person from MOCO.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      contactId: z.number().describe('The ID of the contact to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });
    await client.deleteContact(ctx.input.contactId);

    return {
      output: { success: true },
      message: `Deleted contact **${ctx.input.contactId}**.`
    };
  })
  .build();
