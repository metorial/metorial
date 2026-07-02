import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `List contacts (people) who have interacted with your surveys. Returns contact identifiers and attributes. Supports pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of contacts to return'),
      offset: z.number().optional().describe('Number of contacts to skip for pagination')
    })
  )
  .output(
    z.object({
      contacts: z.array(
        z.object({
          contactId: z.string().describe('Unique contact identifier'),
          attributes: z.record(z.string(), z.any()).optional().describe('Contact attributes'),
          createdAt: z.string().optional().describe('Contact creation timestamp'),
          updatedAt: z.string().optional().describe('Contact last update timestamp')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let contacts = await client.listContacts({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let mapped = contacts.map((c: any) => ({
      contactId: c.id,
      attributes: c.attributes,
      createdAt: c.createdAt ?? '',
      updatedAt: c.updatedAt ?? ''
    }));

    return {
      output: { contacts: mapped },
      message: `Found **${mapped.length}** contact(s).`
    };
  })
  .build();
