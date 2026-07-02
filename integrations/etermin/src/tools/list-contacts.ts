import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `Retrieve contacts from eTermin. Filter by email, contact ID, external ID, or creation date. Returns contact details including name, email, phone, address, and custom fields.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().optional().describe('Filter by email address'),
      contactId: z.string().optional().describe('Filter by contact ID (cid)'),
      externalId: z.string().optional().describe('Filter by external ID'),
      creationDate: z
        .string()
        .optional()
        .describe('Filter contacts created on or after this date (yyyy-mm-dd)')
    })
  )
  .output(
    z.object({
      contacts: z.array(z.record(z.string(), z.any())).describe('List of contact records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      publicKey: ctx.auth.publicKey,
      privateKey: ctx.auth.privateKey
    });

    let result = await client.listContacts({
      email: ctx.input.email,
      cid: ctx.input.contactId,
      id: ctx.input.externalId,
      creationdate: ctx.input.creationDate
    });

    let contacts = Array.isArray(result) ? result : [result];

    return {
      output: { contacts },
      message: `Found **${contacts.length}** contact(s).`
    };
  })
  .build();
