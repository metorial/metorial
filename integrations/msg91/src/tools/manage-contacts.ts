import { SlateTool } from 'slates';
import { z } from 'zod';
import { Msg91Client } from '../lib/client';
import { spec } from '../spec';

export let createOrUpdateContact = SlateTool.create(spec, {
  name: 'Create or Update Contact',
  key: 'create_or_update_contact',
  description: `Create a new contact or update an existing contact in MSG91 Segmento. Pass any phonebook fields as key-value pairs to set contact attributes.`,
  instructions: [
    'Use "getPhonebookFields" to discover available fields before creating contacts.',
    'If a contact with the same identifier already exists, it will be updated.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contactFields: z
        .record(z.string(), z.any())
        .describe(
          'Contact field values as key-value pairs (e.g., {"name": "John", "mobiles": "919XXXXXXXXX", "email": "john@example.com"})'
        )
    })
  )
  .output(
    z.object({
      response: z.any().describe('API response from MSG91')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Msg91Client({ token: ctx.auth.token });

    let result = await client.createOrUpdateContact({
      contact: ctx.input.contactFields
    });

    return {
      output: { response: result },
      message: `Contact created/updated successfully.`
    };
  })
  .build();

export let searchContacts = SlateTool.create(spec, {
  name: 'Search Contacts',
  key: 'search_contacts',
  description: `Search and filter contacts in MSG91 Segmento. Apply filters to find contacts matching specific criteria.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      filters: z
        .record(z.string(), z.any())
        .optional()
        .describe('Filter criteria as key-value pairs'),
      page: z.number().optional().describe('Page number for pagination'),
      pageSize: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      response: z.any().describe('Search results with matching contacts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Msg91Client({ token: ctx.auth.token });

    let result = await client.searchContacts({
      filters: ctx.input.filters,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    return {
      output: { response: result },
      message: `Contact search completed.`
    };
  })
  .build();

export let deleteContacts = SlateTool.create(spec, {
  name: 'Delete Contacts',
  key: 'delete_contacts',
  description: `Delete one or more contacts from MSG91 Segmento by their IDs.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      contactIds: z.array(z.string()).describe('Array of contact IDs to delete')
    })
  )
  .output(
    z.object({
      response: z.any().describe('API response from MSG91')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Msg91Client({ token: ctx.auth.token });

    let result = await client.deleteContacts({
      contactIds: ctx.input.contactIds
    });

    return {
      output: { response: result },
      message: `Deleted **${ctx.input.contactIds.length}** contact(s).`
    };
  })
  .build();
