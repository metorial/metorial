import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { listIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let batchUpdateContacts = SlateTool.create(spec, {
  name: 'Batch Update Contacts',
  key: 'batch_update_contacts',
  description: `Update multiple contacts in a single request. Each contact update can modify email address, custom fields, tags, and status. Returns succeeded and failed receipts matched to the requested contacts. Partial failures do not roll back successful updates; read each contact before retrying.`,
  constraints: ['Maximum 100 contacts per request.'],
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      listId: listIdSchema,
      contacts: z
        .array(
          z.object({
            contactId: z.string().describe('ID of the contact to update'),
            emailAddress: z.string().optional().describe('New email address'),
            fields: z
              .record(z.string(), z.string())
              .optional()
              .describe('Custom field values to update'),
            fieldValues: z
              .record(z.string(), z.union([z.string(), z.number(), z.null()]))
              .optional()
              .describe(
                'Typed custom field values; null clears a field. Do not conflict with fields.'
              ),
            tags: z
              .record(z.string(), z.boolean())
              .optional()
              .describe('Tags to add (true) or remove (false)'),
            status: z
              .enum(['SUBSCRIBED', 'UNSUBSCRIBED', 'PENDING'])
              .optional()
              .describe(
                'New subscription status; uppercase inputs are normalized to lowercase API values'
              )
          })
        )
        .describe('Array of contact updates (max 100)')
    })
  )
  .output(
    z.object({
      succeeded: z.array(z.any()).describe('Successfully updated contacts'),
      failed: z.array(z.any()).describe('Failed updates with error details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.batchUpdateContacts(ctx.input.listId, ctx.input.contacts);

    return {
      output: result,
      message: `Batch update complete: ${result.succeeded.length} succeeded, ${result.failed.length} failed.`
    };
  })
  .build();
