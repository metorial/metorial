import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleContactsActionScopes } from '../scopes';
import { spec } from '../spec';

export let deleteContact = SlateTool.create(spec, {
  name: 'Delete Contact',
  key: 'delete_contact',
  description: `Permanently deletes a contact from the authenticated user's Google Contacts. This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .scopes(googleContactsActionScopes.deleteContact)
  .input(
    z.object({
      resourceName: z
        .string()
        .describe('Resource name of the contact to delete (e.g., "people/c12345")')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the contact was successfully deleted'),
      resourceName: z.string().describe('Resource name of the deleted contact')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteContact(ctx.input.resourceName);

    return {
      output: {
        deleted: true,
        resourceName: ctx.input.resourceName
      },
      message: `Deleted contact **${ctx.input.resourceName}**.`
    };
  })
  .build();
