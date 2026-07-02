import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let addOrUpdateContacts = SlateTool.create(spec, {
  name: 'Add or Update Contacts',
  key: 'add_or_update_contacts',
  description: `Add new contacts or update existing ones in SendGrid Marketing. Contacts are matched by email address. Optionally assign contacts to one or more lists simultaneously.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contacts: z
        .array(
          z.object({
            email: z.string().describe('Contact email address'),
            firstName: z.string().optional().describe('Contact first name'),
            lastName: z.string().optional().describe('Contact last name'),
            customFields: z
              .record(z.string(), z.any())
              .optional()
              .describe('Custom field values keyed by field ID or name')
          })
        )
        .describe('Contacts to add or update'),
      listIds: z.array(z.string()).optional().describe('List IDs to add the contacts to')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Async job ID for tracking the import')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.addOrUpdateContacts(ctx.input.contacts, ctx.input.listIds);

    return {
      output: {
        jobId: result.job_id
      },
      message: `Submitted **${ctx.input.contacts.length}** contact(s) for import. Job ID: ${result.job_id}`
    };
  })
  .build();

export let searchContacts = SlateTool.create(spec, {
  name: 'Search Contacts',
  key: 'search_contacts',
  description: `Search for contacts using SendGrid's SGQL query syntax. Supports filtering by email, name, custom fields, and list membership. Returns matching contacts with all their field data.`,
  instructions: [
    "Use SGQL syntax, e.g.: email LIKE '%@example.com' AND CONTAINS(list_ids, 'abc-123')"
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('SGQL query string to filter contacts')
    })
  )
  .output(
    z.object({
      contacts: z
        .array(
          z.object({
            contactId: z.string().describe('Contact ID'),
            email: z.string().describe('Contact email'),
            firstName: z.string().optional().describe('First name'),
            lastName: z.string().optional().describe('Last name'),
            listIds: z.array(z.string()).optional().describe('Lists this contact belongs to'),
            customFields: z
              .record(z.string(), z.any())
              .optional()
              .describe('Custom field values'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            updatedAt: z.string().optional().describe('Last update timestamp')
          })
        )
        .describe('Matching contacts'),
      contactCount: z.number().describe('Total number of matching contacts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.searchContacts(ctx.input.query);

    let contacts = (result.result || []).map((c: any) => ({
      contactId: c.id,
      email: c.email,
      firstName: c.first_name || undefined,
      lastName: c.last_name || undefined,
      listIds: c.list_ids || undefined,
      customFields: c.custom_fields || undefined,
      createdAt: c.created_at || undefined,
      updatedAt: c.updated_at || undefined
    }));

    return {
      output: {
        contacts,
        contactCount: result.contact_count || contacts.length
      },
      message: `Found **${contacts.length}** contact(s) matching query.`
    };
  })
  .build();

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieve a single contact by ID with all associated field data, list memberships, and metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactId: z.string().describe('Contact ID to retrieve')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('Contact ID'),
      email: z.string().describe('Contact email'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      listIds: z.array(z.string()).optional().describe('Lists this contact belongs to'),
      customFields: z.record(z.string(), z.any()).optional().describe('Custom field values'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let c = await client.getContactById(ctx.input.contactId);

    return {
      output: {
        contactId: c.id,
        email: c.email,
        firstName: c.first_name || undefined,
        lastName: c.last_name || undefined,
        listIds: c.list_ids || undefined,
        customFields: c.custom_fields || undefined,
        createdAt: c.created_at || undefined,
        updatedAt: c.updated_at || undefined
      },
      message: `Retrieved contact **${c.email}** (ID: ${c.id}).`
    };
  })
  .build();

export let deleteContacts = SlateTool.create(spec, {
  name: 'Delete Contacts',
  key: 'delete_contacts',
  description: `Delete one or more contacts by their IDs. Optionally delete all contacts in the account.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      contactIds: z.array(z.string()).optional().describe('Contact IDs to delete'),
      deleteAll: z
        .boolean()
        .optional()
        .describe('Set to true to delete ALL contacts in the account')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Async job ID for tracking the deletion')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.deleteContacts(ctx.input.contactIds || [], ctx.input.deleteAll);

    return {
      output: {
        jobId: result.job_id
      },
      message: ctx.input.deleteAll
        ? `Submitted request to delete **all contacts**. Job ID: ${result.job_id}`
        : `Submitted deletion of **${(ctx.input.contactIds || []).length}** contact(s). Job ID: ${result.job_id}`
    };
  })
  .build();
