import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteUserAttribute = SlateTool.create(spec, {
  name: 'Delete User Attribute',
  key: 'delete_user_attribute',
  description:
    'Deletes a custom metadata attribute from an Engage customer or account. Standard fields such as first_name, last_name, email, and number cannot be deleted with this operation.',
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      uid: z.string().min(1).describe('Application-supplied user or account UID'),
      attribute: z.string().min(1).describe('Custom attribute key from the user meta object')
    })
  )
  .output(
    z.object({
      uid: z.string().describe('User or account UID'),
      attribute: z.string().describe('Deleted custom attribute key'),
      deleted: z.boolean().describe('Whether the delete request succeeded')
    })
  )
  .handleInvocation(async ctx => {
    if (['first_name', 'last_name', 'email', 'number'].includes(ctx.input.attribute)) {
      throw createApiServiceError(
        'Only custom metadata attributes can be deleted. Use create_or_update_user to update standard fields.'
      );
    }

    let client = new Client({ token: ctx.auth.token, secret: ctx.auth.secret });
    await client.deleteUserAttribute(ctx.input.uid, ctx.input.attribute);

    return {
      output: { uid: ctx.input.uid, attribute: ctx.input.attribute, deleted: true },
      message: `Deleted custom attribute **${ctx.input.attribute}** from user **${ctx.input.uid}**.`
    };
  })
  .build();
