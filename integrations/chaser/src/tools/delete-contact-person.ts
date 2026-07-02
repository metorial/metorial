import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteContactPerson = SlateTool.create(spec, {
  name: 'Delete Contact Person',
  key: 'delete_contact_person',
  description: `Delete a contact person from a customer. Permanently removes the contact person from the customer's contact list.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      customerId: z
        .string()
        .describe('Internal Chaser customer ID or "ext_{externalId}" of the parent customer'),
      contactPersonId: z.string().describe('External ID of the contact person to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the contact person was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteContactPerson(ctx.input.customerId, ctx.input.contactPersonId);

    return {
      output: { deleted: true },
      message: `Deleted contact person **${ctx.input.contactPersonId}** from customer ${ctx.input.customerId}.`
    };
  })
  .build();
