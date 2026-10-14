import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let contactSchema = z.object({
  id: z.string().describe('Contact ID'),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  fullName: z.string().nullable(),
  displayName: z.string().nullable(),
  phoneNumber: z.string().nullable(),
  email: z.string().nullable(),
  isSubscribed: z.boolean().describe('Whether the contact is subscribed to messaging'),
  handles: z.array(
    z.object({
      id: z.string(),
      type: z.enum([
        'phone_number',
        'email',
        'instagram',
        'messenger',
        'live_chat',
        'whatsapp'
      ]),
      isPrimary: z.boolean(),
      value: z.string(),
      extra: z.record(z.string(), z.unknown()).nullable(),
      hasChats: z.boolean().optional(),
      createdAt: z.string(),
      updatedAt: z.string()
    })
  ),
  labels: z.array(z.object({ id: z.string() })).describe('Assigned label IDs'),
  attributes: z.array(
    z.object({
      id: z.string().optional(),
      contactId: z.string().optional(),
      attribute: z
        .object({
          id: z.string(),
          name: z.string(),
          type: z.enum([
            'text',
            'number',
            'single_select',
            'multi_select',
            'date',
            'datetime'
          ]),
          displayName: z.string()
        })
        .nullable(),
      value: z.union([z.string(), z.number(), z.array(z.string()), z.null()])
    })
  ),
  chats: z.array(z.object({ id: z.string() })).describe('Associated chat IDs'),
  metadata: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
  updatedAt: z.string()
});

export let getContactTool = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description:
    'Retrieve one contact using Heyy API v3, including messaging handles, subscription state, label IDs, custom attribute values, and associated chat IDs. Use List Contacts to discover contact IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({ contactId: z.string().describe('Contact ID. Use List Contacts to find it.') })
  )
  .output(contactSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, version: 'v3' });
    let result = contactSchema.safeParse(await client.getContact(ctx.input.contactId));
    if (!result.success) {
      throw createApiServiceError('Heyy returned an invalid contact response.', {
        reason: 'heyy_invalid_response'
      });
    }
    return {
      output: result.data,
      message: `Retrieved contact **${result.data.displayName ?? result.data.fullName ?? result.data.id}**.`
    };
  })
  .build();
