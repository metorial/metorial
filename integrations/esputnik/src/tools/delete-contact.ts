import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteContact = SlateTool.create(spec, {
  name: 'Delete Contact',
  key: 'delete_contact',
  description: `Delete a contact from eSputnik. You can delete by internal contact ID or by external customer ID.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      contactId: z.number().optional().describe('eSputnik internal contact ID'),
      externalCustomerId: z
        .string()
        .optional()
        .describe('External customer ID (used if contactId is not provided)')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the contact was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.contactId) {
      await client.deleteContact(ctx.input.contactId);
    } else if (ctx.input.externalCustomerId) {
      await client.deleteContactByExternalId(ctx.input.externalCustomerId);
    } else {
      throw new Error('Either contactId or externalCustomerId must be provided');
    }

    let identifier = ctx.input.contactId
      ? `ID ${ctx.input.contactId}`
      : `external ID "${ctx.input.externalCustomerId}"`;

    return {
      output: { deleted: true },
      message: `Contact with ${identifier} was deleted successfully.`
    };
  })
  .build();
