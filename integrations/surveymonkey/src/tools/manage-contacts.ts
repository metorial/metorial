import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let contactSchema = z.object({
  firstName: z.string().describe('First name'),
  lastName: z.string().describe('Last name'),
  email: z.string().optional().describe('Email address (required if no phone number)'),
  phoneNumber: z.string().optional().describe('Phone number (required if no email)'),
  customFields: z
    .record(z.string(), z.string())
    .optional()
    .describe('Custom fields with numeric keys (1-6)')
});

export let listContactLists = SlateTool.create(spec, {
  name: 'List Contact Lists',
  key: 'list_contact_lists',
  description: `Retrieve all contact lists in the account. Contact lists are used to organize recipients for email and SMS survey invitations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number'),
      perPage: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      contactLists: z.array(
        z.object({
          contactListId: z.string(),
          name: z.string()
        })
      ),
      page: z.number(),
      total: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accessUrl: ctx.auth.accessUrl
    });

    let result = await client.listContactLists({
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let contactLists = (result.data || []).map((l: any) => ({
      contactListId: l.id,
      name: l.name
    }));

    return {
      output: {
        contactLists,
        page: result.page || 1,
        total: result.total || contactLists.length
      },
      message: `Found **${result.total || contactLists.length}** contact lists.`
    };
  })
  .build();

export let createContactList = SlateTool.create(spec, {
  name: 'Create Contact List',
  key: 'create_contact_list',
  description: `Create a new contact list for organizing survey recipients. Contact lists can be assigned to email and SMS collectors for sending invitations.`
})
  .input(
    z.object({
      name: z.string().describe('Name for the new contact list')
    })
  )
  .output(
    z.object({
      contactListId: z.string(),
      name: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accessUrl: ctx.auth.accessUrl
    });

    let list = await client.createContactList(ctx.input.name);

    return {
      output: {
        contactListId: list.id,
        name: list.name
      },
      message: `Created contact list **"${list.name}"** with ID \`${list.id}\`.`
    };
  })
  .build();

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `Retrieve contacts from a specific contact list. Supports searching by email or name and filtering by status (active, optout, bounced).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactListId: z.string().describe('ID of the contact list'),
      page: z.number().optional().describe('Page number'),
      perPage: z.number().optional().describe('Results per page'),
      status: z
        .enum(['active', 'optout', 'bounced'])
        .optional()
        .describe('Filter by contact status'),
      search: z.string().optional().describe('Search term'),
      searchBy: z
        .enum(['email', 'first_name', 'last_name'])
        .optional()
        .describe('Field to search by'),
      sortBy: z.enum(['email', 'first_name', 'last_name']).optional().describe('Sort field'),
      sortOrder: z.enum(['ASC', 'DESC']).optional().describe('Sort direction')
    })
  )
  .output(
    z.object({
      contacts: z.array(
        z.object({
          contactId: z.string(),
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          email: z.string().optional(),
          phoneNumber: z.string().optional(),
          status: z.string().optional()
        })
      ),
      page: z.number(),
      total: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accessUrl: ctx.auth.accessUrl
    });

    let result = await client.listContacts(ctx.input.contactListId, {
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      status: ctx.input.status,
      search: ctx.input.search,
      searchBy: ctx.input.searchBy,
      sortBy: ctx.input.sortBy,
      sortOrder: ctx.input.sortOrder
    });

    let contacts = (result.data || []).map((c: any) => ({
      contactId: c.id,
      firstName: c.first_name,
      lastName: c.last_name,
      email: c.email,
      phoneNumber: c.phone_number,
      status: c.status
    }));

    return {
      output: {
        contacts,
        page: result.page || 1,
        total: result.total || contacts.length
      },
      message: `Found **${result.total || contacts.length}** contacts in list \`${ctx.input.contactListId}\`.`
    };
  })
  .build();

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Add a single contact to a contact list. Requires first name, last name, and either email or phone number.`
})
  .input(
    z.object({
      contactListId: z.string().describe('ID of the contact list to add the contact to'),
      firstName: z.string().describe('First name'),
      lastName: z.string().describe('Last name'),
      email: z.string().optional().describe('Email address'),
      phoneNumber: z.string().optional().describe('Phone number'),
      customFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom fields with numeric keys (1-6)')
    })
  )
  .output(
    z.object({
      contactId: z.string(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accessUrl: ctx.auth.accessUrl
    });

    let contact = await client.createContact(ctx.input.contactListId, {
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      email: ctx.input.email,
      phoneNumber: ctx.input.phoneNumber,
      customFields: ctx.input.customFields
    });

    return {
      output: {
        contactId: contact.id,
        firstName: contact.first_name,
        lastName: contact.last_name,
        email: contact.email
      },
      message: `Created contact **${contact.first_name} ${contact.last_name}** in list \`${ctx.input.contactListId}\`.`
    };
  })
  .build();

export let createContactsBulk = SlateTool.create(spec, {
  name: 'Create Contacts Bulk',
  key: 'create_contacts_bulk',
  description: `Add multiple contacts to a contact list in a single operation. Optionally update existing contacts that match by email.`
})
  .input(
    z.object({
      contactListId: z.string().describe('ID of the contact list'),
      contacts: z.array(contactSchema).describe('Array of contacts to add'),
      updateExisting: z
        .boolean()
        .optional()
        .describe('If true, updates existing contacts that match by email')
    })
  )
  .output(
    z.object({
      succeeded: z.array(z.any()).optional(),
      invalids: z.array(z.any()).optional(),
      existing: z.array(z.any()).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accessUrl: ctx.auth.accessUrl
    });

    let contacts = ctx.input.contacts.map(c => ({
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      phoneNumber: c.phoneNumber,
      customFields: c.customFields
    }));

    let result = await client.createContactsBulk(
      ctx.input.contactListId,
      contacts,
      ctx.input.updateExisting
    );

    let succeededCount = result.succeeded?.length || 0;
    let invalidCount = result.invalids?.length || 0;
    let existingCount = result.existing?.length || 0;

    return {
      output: {
        succeeded: result.succeeded,
        invalids: result.invalids,
        existing: result.existing
      },
      message: `Bulk contact import: **${succeededCount}** succeeded, ${existingCount} existing, ${invalidCount} invalid.`
    };
  })
  .build();

export let deleteContactList = SlateTool.create(spec, {
  name: 'Delete Contact List',
  key: 'delete_contact_list',
  description: `Permanently delete a contact list and all its contacts.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      contactListId: z.string().describe('ID of the contact list to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accessUrl: ctx.auth.accessUrl
    });

    await client.deleteContactList(ctx.input.contactListId);

    return {
      output: { deleted: true },
      message: `Deleted contact list \`${ctx.input.contactListId}\`.`
    };
  })
  .build();
