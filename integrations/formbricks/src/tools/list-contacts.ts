import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `List contacts (people) who have interacted with your surveys. Returns contact identifiers and attributes. The documented v1 endpoint returns its contact list; limit and offset select a local slice from that list. Attributes are included only when the provider returns them.`,
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
          updatedAt: z.string().optional().describe('Contact last update timestamp'),
          workspaceId: z.string().optional().describe('Current workspace ID'),
          userId: z.string().optional().describe('Provider user identifier when returned')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl,
      instanceUrl: ctx.auth.instanceUrl
    });

    let contacts = await client.listContacts({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let mapped = contacts.map(c => ({
      contactId: c.id,
      attributes: c.attributes,
      workspaceId: c.workspaceId,
      userId: c.userId ?? undefined,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt
    }));

    return {
      output: { contacts: mapped },
      message: `Found **${mapped.length}** contact(s).`
    };
  })
  .build();
