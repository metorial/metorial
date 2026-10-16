import { SlateTool } from 'slates';
import { z } from 'zod';
import { ImportClient } from '../lib/client';
import { importScopeFields, resolveImportConfig } from '../lib/context';
import { spec } from '../spec';

export let deleteContact = SlateTool.create(spec, {
  name: 'Delete Contact',
  key: 'delete_contact',
  description: `Permanently deletes a contact from a SegMetrics integration. This action **cannot be undone**.
Associated invoices and purchases are **not** deleted.
If an email address is used, all contacts in the integration with that email will be deleted.`,
  constraints: ['This is a permanent, irreversible action.'],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      ...importScopeFields,
      contactIdOrEmail: z
        .string()
        .describe('The contact ID or email address of the contact to delete.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful.'),
      response: z.unknown().optional().describe('Raw API response.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ImportClient(resolveImportConfig(ctx));

    let response = await client.deleteContact(ctx.input.contactIdOrEmail);

    return {
      output: {
        success: true,
        response
      },
      message: `Contact **${ctx.input.contactIdOrEmail}** has been permanently deleted.`
    };
  })
  .build();
