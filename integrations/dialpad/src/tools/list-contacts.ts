import { SlateTool } from 'slates';
import { z } from 'zod';
import { DialpadClient } from '../lib/client';
import { spec } from '../spec';

export let listContactsTool = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `List shared and local contacts in your Dialpad account with cursor-based pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ownerId: z.string().optional().describe('Filter contacts by owner user ID'),
      cursor: z.string().optional().describe('Pagination cursor from a previous request')
    })
  )
  .output(
    z.object({
      contacts: z.array(
        z.object({
          contactId: z.string().describe('Contact ID'),
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          displayName: z.string().optional(),
          emails: z.array(z.string()).optional(),
          phones: z.array(z.string()).optional(),
          companyName: z.string().optional(),
          jobTitle: z.string().optional(),
          type: z.string().optional()
        })
      ),
      nextCursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DialpadClient({
      token: ctx.auth.token,
      environment: ctx.auth.environment
    });

    let result = await client.listContacts({
      cursor: ctx.input.cursor,
      owner_id: ctx.input.ownerId
    });

    let contacts = (result.items || []).map((c: any) => ({
      contactId: String(c.id),
      firstName: c.first_name,
      lastName: c.last_name,
      displayName: c.display_name,
      emails: c.emails,
      phones: c.phones,
      companyName: c.company_name,
      jobTitle: c.job_title,
      type: c.type
    }));

    return {
      output: {
        contacts,
        nextCursor: result.cursor || undefined
      },
      message: `Found **${contacts.length}** contact(s)${result.cursor ? '. More results available.' : '.'}`
    };
  })
  .build();
