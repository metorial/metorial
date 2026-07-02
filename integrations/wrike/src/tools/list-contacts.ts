import { SlateTool } from 'slates';
import { z } from 'zod';
import { WrikeClient } from '../lib/client';
import { spec } from '../spec';

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `List users and contacts in the Wrike account. Can retrieve specific contacts by ID, the current user, or all contacts. Useful for getting contact IDs needed when assigning tasks or sharing folders.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactIds: z.array(z.string()).optional().describe('Specific contact IDs to retrieve'),
      currentUserOnly: z
        .boolean()
        .optional()
        .describe('If true, only return the current authenticated user')
    })
  )
  .output(
    z.object({
      contacts: z.array(
        z.object({
          contactId: z.string(),
          firstName: z.string(),
          lastName: z.string(),
          type: z.string(),
          email: z.string().optional(),
          role: z.string().optional(),
          deleted: z.boolean().optional(),
          avatarUrl: z.string().optional()
        })
      ),
      count: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new WrikeClient({
      token: ctx.auth.token,
      host: ctx.auth.host
    });

    let result = await client.getContacts({
      contactIds: ctx.input.contactIds,
      me: ctx.input.currentUserOnly
    });

    let contacts = result.data.map(c => ({
      contactId: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      type: c.type,
      email: c.profiles?.[0]?.email,
      role: c.profiles?.[0]?.role,
      deleted: c.deleted,
      avatarUrl: c.avatarUrl
    }));

    return {
      output: { contacts, count: contacts.length },
      message: `Found **${contacts.length}** contact(s).`
    };
  })
  .build();
