import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let batchImportContacts = SlateTool.create(spec, {
  name: 'Batch Import Contacts',
  key: 'batch_import_contacts',
  description: `Import multiple contacts at once. Creates new contacts or updates existing ones based on email address. Optionally assign all imported contacts to specific lists.`,
  constraints: ['Maximum of 1,000 contacts per request.'],
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
            email: z.string().describe('Email address of the contact'),
            firstName: z.string().optional().describe('First name'),
            lastName: z.string().optional().describe('Last name')
          })
        )
        .describe('Array of contacts to import (max 1,000)'),
      listIds: z
        .array(z.number())
        .optional()
        .describe('List IDs to add all imported contacts to')
    })
  )
  .output(
    z.object({
      created: z.number().describe('Number of new contacts created'),
      updated: z.number().describe('Number of existing contacts updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.batchImportContacts({
      contacts: ctx.input.contacts.map(c => ({
        email: c.email,
        first_name: c.firstName,
        last_name: c.lastName
      })),
      listIds: ctx.input.listIds
    });

    return {
      output: {
        created: result.created,
        updated: result.updated
      },
      message: `Batch import completed: **${result.created}** created, **${result.updated}** updated.`
    };
  })
  .build();
