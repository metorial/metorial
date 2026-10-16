import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, contactBody, inputId } from '../lib/client';
import { contactFields, contactOutput, mapContact } from '../lib/schemas';
import { spec } from '../spec';

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description:
    'Retrieve one recipient contact, optionally including its group memberships and postcard IDs.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      contactId: z.string().describe('Contact ID from List Contacts or Create Contact'),
      include: z
        .array(z.enum(['groups', 'cards']))
        .optional()
        .describe('Include related group or card IDs')
    })
  )
  .output(contactOutput)
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).get(
      `/contacts/${inputId(ctx.input.contactId, 'contactId')}`,
      {
        include: ctx.input.include?.join(',')
      }
    );
    return { output: mapContact(result), message: 'Retrieved contact.' };
  })
  .build();

export let updateContact = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description:
    'Update a recipient contact. Omitted fields stay unchanged. groupIds replaces memberships; groupNames adds named groups, creating missing groups.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      contactId: z.string().describe('Contact ID from List Contacts or Create Contact'),
      ...contactFields
    })
  )
  .output(contactOutput)
  .handleInvocation(async ctx => {
    let body = contactBody(ctx.input, false);
    if (!Object.keys(body).length) {
      throw createApiServiceError('Provide at least one contact field to update.');
    }
    let result = await new Client({ token: ctx.auth.token }).save(
      'PATCH',
      `/contacts/${inputId(ctx.input.contactId, 'contactId')}`,
      body
    );
    return { output: mapContact(result), message: 'Updated contact.' };
  })
  .build();

export let deleteContact = SlateTool.create(spec, {
  name: 'Delete Contact',
  key: 'delete_contact',
  description: 'Permanently delete a recipient contact from EchtPost.',
  tags: { readOnly: false, destructive: true }
})
  .input(z.object({ contactId: z.string().describe('Contact ID to delete') }))
  .output(
    z.object({
      contactId: z.string().describe('Deleted contact ID'),
      deleted: z.boolean().describe('Whether EchtPost confirmed deletion')
    })
  )
  .handleInvocation(async ctx => {
    await new Client({ token: ctx.auth.token }).remove(
      `/contacts/${inputId(ctx.input.contactId, 'contactId')}`
    );
    return {
      output: { contactId: ctx.input.contactId, deleted: true },
      message: 'Contact deleted.'
    };
  })
  .build();
