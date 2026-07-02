import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `Retrieve all contacts from your Helpwise account. Returns contact details including name, email, phone, and associated metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of contacts to return'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      contacts: z.array(z.record(z.string(), z.any())).describe('List of contacts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listContacts({
      limit: ctx.input.limit,
      page: ctx.input.page
    });

    let contacts = Array.isArray(result) ? result : (result.contacts ?? result.data ?? []);

    return {
      output: { contacts },
      message: `Retrieved ${contacts.length} contact(s).`
    };
  })
  .build();
