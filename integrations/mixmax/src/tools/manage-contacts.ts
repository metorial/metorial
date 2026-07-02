import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let contactSchema = z.object({
  contactId: z.string().describe('Contact ID'),
  email: z.string().optional().describe('Contact email address'),
  name: z.string().optional().describe('Contact name'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  groups: z.array(z.string()).optional().describe('Contact group IDs'),
  meta: z.record(z.string(), z.any()).optional().describe('Custom metadata fields'),
  createdAt: z.string().optional().describe('When the contact was created')
});

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `List and search contacts. Contacts are people you've emailed via Mixmax. Supports search filtering and sorting by name, email, timestamp, or usage count.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search query to filter contacts'),
      sort: z
        .enum(['name', 'email', 'timestamp', 'usedCount'])
        .optional()
        .describe('Sort field'),
      sortAscending: z.boolean().optional().describe('Sort direction (default: descending)'),
      includeShared: z
        .boolean()
        .optional()
        .describe('Include contacts shared by team members'),
      limit: z.number().optional().describe('Maximum number of results (default: 50)'),
      cursor: z.string().optional().describe('Pagination cursor for next page')
    })
  )
  .output(
    z.object({
      contacts: z.array(contactSchema).describe('List of contacts'),
      nextCursor: z.string().optional().describe('Cursor for next page'),
      hasNext: z.boolean().optional().describe('Whether more results exist')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.listContacts({
      search: ctx.input.search,
      sort: ctx.input.sort,
      sortAscending: ctx.input.sortAscending,
      includeShared: ctx.input.includeShared,
      limit: ctx.input.limit,
      next: ctx.input.cursor
    });

    let results = data.results || data || [];
    let contacts = results.map((c: any) => ({
      contactId: c._id,
      email: c.email,
      name: c.name,
      firstName: c.firstName,
      lastName: c.lastName,
      groups: c.groups,
      meta: c.meta,
      createdAt: c.createdAt
    }));

    return {
      output: {
        contacts,
        nextCursor: data.next,
        hasNext: data.hasNext
      },
      message: `Found ${contacts.length} contact(s).`
    };
  })
  .build();

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Create a new contact in Mixmax. At minimum, an email address is required. Optionally, you can assign the contact to groups and set custom metadata.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      email: z.string().describe('Contact email address'),
      name: z.string().optional().describe('Contact full name'),
      groups: z.array(z.string()).optional().describe('Group IDs to assign the contact to'),
      meta: z.record(z.string(), z.any()).optional().describe('Custom metadata fields'),
      enrich: z
        .boolean()
        .optional()
        .describe('Attempt to enrich the contact with external data')
    })
  )
  .output(contactSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let c = await client.createContact({
      email: ctx.input.email,
      name: ctx.input.name,
      groups: ctx.input.groups,
      meta: ctx.input.meta,
      enrich: ctx.input.enrich
    });

    return {
      output: {
        contactId: c._id,
        email: c.email,
        name: c.name,
        firstName: c.firstName,
        lastName: c.lastName,
        groups: c.groups,
        meta: c.meta,
        createdAt: c.createdAt
      },
      message: `Contact "${ctx.input.email}" created.`
    };
  })
  .build();

export let updateContact = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Update an existing contact's name, email, groups, or metadata.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact to update'),
      email: z.string().optional().describe('New email address'),
      name: z.string().optional().describe('New name'),
      groups: z.array(z.string()).optional().describe('New group IDs'),
      meta: z.record(z.string(), z.any()).optional().describe('Custom metadata to update')
    })
  )
  .output(contactSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let updates: Record<string, any> = {};
    if (ctx.input.email !== undefined) updates.email = ctx.input.email;
    if (ctx.input.name !== undefined) updates.name = ctx.input.name;
    if (ctx.input.groups !== undefined) updates.groups = ctx.input.groups;
    if (ctx.input.meta !== undefined) updates.meta = ctx.input.meta;

    let c = await client.updateContact(ctx.input.contactId, updates);

    return {
      output: {
        contactId: c._id,
        email: c.email,
        name: c.name,
        firstName: c.firstName,
        lastName: c.lastName,
        groups: c.groups,
        meta: c.meta,
        createdAt: c.createdAt
      },
      message: `Contact ${ctx.input.contactId} updated.`
    };
  })
  .build();

export let deleteContact = SlateTool.create(spec, {
  name: 'Delete Contact',
  key: 'delete_contact',
  description: `Permanently delete a contact from Mixmax.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the contact was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteContact(ctx.input.contactId);

    return {
      output: { success: true },
      message: `Contact ${ctx.input.contactId} deleted.`
    };
  })
  .build();
