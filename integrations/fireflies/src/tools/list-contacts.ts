import { SlateTool } from 'slates';
import { z } from 'zod';
import { FirefliesClient } from '../lib/client';
import { spec } from '../spec';

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `Retrieve contacts associated with the authenticated Fireflies user. Contacts are people who have participated in meetings with the user.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      contacts: z
        .array(
          z.object({
            email: z.string().nullable(),
            name: z.string().nullable(),
            picture: z.string().nullable(),
            lastMeetingDate: z.string().nullable()
          })
        )
        .describe('Contacts associated with the authenticated user')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FirefliesClient({ token: ctx.auth.token });
    let contacts = await client.getContacts();
    let mapped = (contacts || []).map((contact: any) => ({
      email: contact?.email ?? null,
      name: contact?.name ?? null,
      picture: contact?.picture ?? null,
      lastMeetingDate: contact?.last_meeting_date ?? null
    }));

    return {
      output: { contacts: mapped },
      message: `Found **${mapped.length}** contact(s).`
    };
  })
  .build();
