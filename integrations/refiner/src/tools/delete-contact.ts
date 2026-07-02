import { SlateTool } from 'slates';
import { z } from 'zod';
import { RefinerClient } from '../lib/client';
import { spec } from '../spec';

export let deleteContact = SlateTool.create(spec, {
  name: 'Delete Contact',
  key: 'delete_contact',
  description: `Delete a contact from your Refiner project. Identify the contact by their user ID, email, or Refiner UUID. **Deleting a contact will also remove their survey responses.** If you need to delete for compliance but keep responses, consider overwriting sensitive data with empty values using the Identify User tool instead.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      userId: z
        .string()
        .optional()
        .describe('External user ID used when identifying the contact'),
      email: z.string().optional().describe('Email address of the contact'),
      contactUuid: z.string().optional().describe('Refiner internal UUID of the contact')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RefinerClient({ token: ctx.auth.token });

    await client.deleteContact({
      id: ctx.input.userId,
      email: ctx.input.email,
      uuid: ctx.input.contactUuid
    });

    let identifier = ctx.input.userId || ctx.input.email || ctx.input.contactUuid || 'unknown';

    return {
      output: { success: true },
      message: `Deleted contact **${identifier}** and their associated survey responses.`
    };
  })
  .build();
