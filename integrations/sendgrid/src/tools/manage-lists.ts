import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let listSchema = z.object({
  listId: z.string().describe('Unique list identifier'),
  name: z.string().describe('List name'),
  contactCount: z.number().describe('Number of contacts in the list'),
  billableCount: z.number().optional().describe('Billable contacts in the list')
});

let listContactSchema = z.object({
  contactId: z.string().optional().describe('Contact ID when returned by SendGrid'),
  email: z.string().optional().describe('Contact email address'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

let contactInputSchema = z.object({
  email: z.string().describe('Contact email address'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  phone: z.string().optional().describe('Phone number'),
  addressLine1: z.string().optional().describe('Address line 1'),
  addressLine2: z.string().optional().describe('Address line 2'),
  city: z.string().optional().describe('City'),
  stateProvinceRegion: z.string().optional().describe('State, province, or region'),
  postalCode: z.string().optional().describe('Postal/ZIP code'),
  country: z.string().optional().describe('Country'),
  alternateEmails: z.array(z.string()).optional().describe('Alternate email addresses'),
  customFields: z
    .record(z.string(), z.any())
    .optional()
    .describe('Custom field values (field_id -> value)')
});

export let listContactLists = SlateTool.create(spec, {
  name: 'List Contact Lists',
  key: 'list_contact_lists',
  description: `Retrieve all marketing contact lists with their contact counts. Use this to find list IDs for adding contacts or sending campaigns.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      pageSize: z.number().optional().describe('Number of lists per page (max 1000)'),
      pageToken: z.string().optional().describe('Pagination token for next page')
    })
  )
  .output(
    z.object({
      lists: z.array(listSchema).describe('Contact lists'),
      metadata: z
        .object({
          count: z.number().optional().describe('Total number of lists'),
          nextPageToken: z.string().optional().describe('Token for the next page')
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.listContactLists(ctx.input.pageSize, ctx.input.pageToken);

    let lists = (result.result || []).map((l: any) => ({
      listId: l.id,
      name: l.name,
      contactCount: l.contact_count
    }));

    return {
      output: {
        lists,
        metadata: result._metadata
          ? {
              count: result._metadata.count,
              nextPageToken: result._metadata.next_page_token
            }
          : undefined
      },
      message: `Found **${lists.length}** contact list(s).`
    };
  });

export let createContactList = SlateTool.create(spec, {
  name: 'Create Contact List',
  key: 'create_contact_list',
  description: `Create a new marketing contact list for organizing and segmenting contacts.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      name: z.string().describe('Name for the new contact list')
    })
  )
  .output(listSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let l = await client.createContactList(ctx.input.name);

    return {
      output: {
        listId: l.id,
        name: l.name,
        contactCount: l.contact_count || 0
      },
      message: `Created contact list **${l.name}** (\`${l.id}\`).`
    };
  });

export let getContactList = SlateTool.create(spec, {
  name: 'Get Contact List',
  key: 'get_contact_list',
  description: `Retrieve a single marketing contact list by ID, optionally including a sample of recent contacts.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      listId: z.string().describe('ID of the contact list to retrieve'),
      includeContactSample: z
        .boolean()
        .optional()
        .describe('Include up to 50 recent contacts attached to the list')
    })
  )
  .output(
    listSchema.extend({
      contactSample: z
        .array(listContactSchema)
        .optional()
        .describe('Sample of recent contacts in the list')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let l = await client.getContactList(ctx.input.listId, ctx.input.includeContactSample);
    let sample = Array.isArray(l.contact_sample)
      ? l.contact_sample
      : l.contact_sample
        ? [l.contact_sample]
        : undefined;

    return {
      output: {
        listId: l.id,
        name: l.name,
        contactCount: l.contact_count || 0,
        contactSample: sample?.map((contact: any) => ({
          contactId: contact.id,
          email: contact.email,
          firstName: contact.first_name,
          lastName: contact.last_name,
          createdAt: contact.created_at,
          updatedAt: contact.updated_at
        }))
      },
      message: `Retrieved contact list **${l.name}** (\`${l.id}\`) with **${l.contact_count || 0}** contact(s).`
    };
  });

export let getContactListCount = SlateTool.create(spec, {
  name: 'Get Contact List Count',
  key: 'get_contact_list_count',
  description: `Retrieve the contact and billable counts for a specific marketing contact list.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      listId: z.string().describe('ID of the contact list')
    })
  )
  .output(
    z.object({
      listId: z.string().describe('Contact list ID'),
      contactCount: z.number().describe('Number of contacts in the list'),
      billableCount: z.number().optional().describe('Billable contacts in the list')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.getContactListContactCount(ctx.input.listId);

    return {
      output: {
        listId: ctx.input.listId,
        contactCount: result.contact_count || 0,
        billableCount: result.billable_count
      },
      message: `Contact list \`${ctx.input.listId}\` has **${result.contact_count || 0}** contact(s).`
    };
  });

export let addContactsToList = SlateTool.create(spec, {
  name: 'Add Contacts To List',
  key: 'add_contacts_to_list',
  description: `Add or update contacts and assign them to a marketing contact list. SendGrid processes this asynchronously and returns a job ID.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      listId: z.string().describe('ID of the contact list'),
      contacts: z
        .array(contactInputSchema)
        .min(1)
        .describe('Contacts to add to the list by email address')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Async job ID for tracking list assignment')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.addContactsToList(ctx.input.listId, ctx.input.contacts);

    return {
      output: {
        jobId: result.job_id
      },
      message: `Submitted **${ctx.input.contacts.length}** contact(s) to list \`${ctx.input.listId}\`. Job ID: \`${result.job_id}\`.`
    };
  });

export let updateContactList = SlateTool.create(spec, {
  name: 'Update Contact List',
  key: 'update_contact_list',
  description: `Rename an existing marketing contact list.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      listId: z.string().describe('ID of the list to update'),
      name: z.string().describe('New name for the contact list')
    })
  )
  .output(listSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let l = await client.updateContactList(ctx.input.listId, ctx.input.name);

    return {
      output: {
        listId: l.id,
        name: l.name,
        contactCount: l.contact_count || 0
      },
      message: `Renamed contact list to **${l.name}** (\`${l.id}\`).`
    };
  });

export let deleteContactList = SlateTool.create(spec, {
  name: 'Delete Contact List',
  key: 'delete_contact_list',
  description: `Delete a marketing contact list. Optionally also delete the contacts that belong to the list.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      listId: z.string().describe('ID of the list to delete'),
      deleteContacts: z.boolean().optional().describe('Also delete the contacts in this list')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    await client.deleteContactList(ctx.input.listId, ctx.input.deleteContacts);

    return {
      output: { deleted: true },
      message: `Deleted contact list \`${ctx.input.listId}\`${ctx.input.deleteContacts ? ' and its contacts' : ''}.`
    };
  });

export let removeContactFromList = SlateTool.create(spec, {
  name: 'Remove Contact From List',
  key: 'remove_contact_from_list',
  description: `Remove a contact from a specific contact list without deleting the contact itself.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      listId: z.string().describe('ID of the list'),
      contactId: z.string().describe('ID of the contact to remove from the list')
    })
  )
  .output(
    z.object({
      removed: z.boolean().describe('Whether removal was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    await client.removeContactFromList(ctx.input.listId, ctx.input.contactId);

    return {
      output: { removed: true },
      message: `Removed contact \`${ctx.input.contactId}\` from list \`${ctx.input.listId}\`.`
    };
  });
