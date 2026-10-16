import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { GistClient } from '../lib/client';
import { requiredId } from '../lib/response';
import { spec } from '../spec';

export let batchImportContacts = SlateTool.create(spec, {
  name: 'Batch Import Contacts',
  key: 'batch_import_contacts',
  description: `Import multiple contacts at once into Gist. Returns a batch ID that can be used to check import status. Contacts are de-duplicated by email address.`,
  instructions: [
    'Each contact in the array follows the same format as create/update contact.',
    'Use the batch ID to check import progress with get_batch_import_status.'
  ]
})
  .input(
    z.object({
      contacts: z
        .array(
          z.object({
            email: z.string().optional().describe('Contact email'),
            userId: z.string().optional().describe('External user ID'),
            name: z.string().optional().describe('Full name'),
            phone: z.string().optional().describe('Phone number'),
            customProperties: z
              .record(z.string(), z.any())
              .optional()
              .describe('Custom properties')
          })
        )
        .describe('Array of contacts to import')
    })
  )
  .output(
    z.object({
      rawResponse: z.any().optional().describe('Complete provider response data'),
      batchId: z.string().describe('Batch import ID for tracking status'),
      status: z.string().optional().describe('Initial batch status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GistClient({ token: ctx.auth.token });

    if (!ctx.input.contacts.length)
      throw createApiServiceError('Provide at least one contact.');
    let contacts = ctx.input.contacts.map(c => {
      if (!c.email && !c.userId)
        throw createApiServiceError('Each contact needs email or userId.');
      let contact: Record<string, any> = {};
      if (c.email) contact.email = c.email;
      if (c.userId) contact.user_id = c.userId;
      if (c.name) contact.name = c.name;
      if (c.phone) contact.phone = c.phone;
      if (c.customProperties) contact.custom_properties = c.customProperties;
      return contact;
    });

    let data = await client.batchImportContacts(contacts);
    let batch = data.batch || data;

    return {
      output: {
        rawResponse: client.responses,
        batchId: requiredId(batch.batch_id ?? batch.id),
        status: batch.status
      },
      message: `Started batch import of **${contacts.length}** contacts. Batch ID: **${batch.batch_id || batch.id}**.`
    };
  })
  .build();
