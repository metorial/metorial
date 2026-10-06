import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { id, mapContact } from '../lib/contracts';
import { spec } from '../spec';
export const getContact = SlateTool.create(spec, {
  key: 'get_contact',
  name: 'Get Contact',
  description:
    'Retrieve an exact shared contact and its native phone/email detail IDs. Discover contact IDs with list_contacts; private contacts are not exposed by this API.',
  tags: { readOnly: true }
})
  .input(
    z.object({ contactId: z.number().describe('Exact shared contact ID from list_contacts.') })
  )
  .output(
    z.object({
      contactId: z.number(),
      firstName: z.string().nullable(),
      lastName: z.string().nullable(),
      fullName: z.string().nullable(),
      companyName: z.string().nullable(),
      information: z.string().nullable(),
      phoneNumbers: z.array(
        z.object({
          phoneNumberId: z.number(),
          label: z.string().optional(),
          value: z.string()
        })
      ),
      emails: z.array(
        z.object({ emailId: z.number(), label: z.string().optional(), value: z.string() })
      ),
      createdAt: z.string().optional(),
      updatedAt: z.string().nullable()
    })
  )
  .handleInvocation(async ctx => ({
    output: mapContact(await new Client(ctx.auth).getContact(id(ctx.input.contactId))),
    message: 'Retrieved exact native shared contact and detail identifiers.'
  }))
  .build();
