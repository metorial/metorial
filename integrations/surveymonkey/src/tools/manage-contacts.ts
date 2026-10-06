import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let contactSchema = z.object({
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  email: z.string().optional().describe('Email address (required if no phone number)'),
  phoneNumber: z.string().optional().describe('Phone number (required if no email)'),
  customFields: z
    .record(z.string(), z.string())
    .optional()
    .describe('Custom fields with numeric keys (1-50)')
});

export let listContactLists = SlateTool.create(spec, {
  name: 'List Contact Lists',
  key: 'list_contact_lists',
  description: `Retrieve one native page of contact lists in the account. Contact lists are used to organize recipients for email and SMS survey invitations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z
        .number()
        .int()
        .min(1)
        .max(Number.MAX_SAFE_INTEGER)
        .optional()
        .describe('Page number'),
      perPage: z.number().int().min(1).max(1000).optional().describe('Results per page')
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
      total: z.number(),
      perPage: z.number(),
      hasMore: z.boolean(),
      nextPage: z.number().optional()
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

    let contactLists = result.data.map(l => ({
      contactListId: l.id,
      name: l.name
    }));

    return {
      output: {
        contactLists,
        page: result.page,
        total: result.total,
        perPage: result.per_page,
        hasMore: result.nextPage !== undefined,
        nextPage: result.nextPage
      },
      message: `Found **${result.total}** contact lists.`
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
      page: z
        .number()
        .int()
        .min(1)
        .max(Number.MAX_SAFE_INTEGER)
        .optional()
        .describe('Page number'),
      perPage: z.number().int().min(1).max(1000).optional().describe('Results per page'),
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
          status: z.string().optional(),
          statusFlag: z.boolean().optional()
        })
      ),
      page: z.number(),
      total: z.number(),
      perPage: z.number(),
      hasMore: z.boolean(),
      nextPage: z.number().optional()
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

    let contacts = result.data.map(c => ({
      contactId: c.id,
      firstName: c.first_name,
      lastName: c.last_name,
      email: c.email,
      phoneNumber: c.phone_number,
      status: typeof c.status === 'string' ? c.status : undefined,
      statusFlag: typeof c.status === 'boolean' ? c.status : undefined
    }));

    return {
      output: {
        contacts,
        page: result.page,
        total: result.total,
        perPage: result.per_page,
        hasMore: result.nextPage !== undefined,
        nextPage: result.nextPage
      },
      message: `Found **${result.total}** contacts in list \`${ctx.input.contactListId}\`.`
    };
  })
  .build();

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Add a single contact to a contact list. Requires either email or phone number; names are optional.`
})
  .input(
    z.object({
      contactListId: z.string().describe('ID of the contact list to add the contact to'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Email address'),
      phoneNumber: z.string().optional().describe('Phone number'),
      customFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom fields with numeric keys (1-50)')
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
      contacts: z.array(contactSchema).min(1).max(1000).describe('Array of contacts to add'),
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
  description: `Delete a contact list. Global contacts and previously sent invitations or responses can remain; this does not prove erasure.`,
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
