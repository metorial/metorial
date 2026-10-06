import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { contactOutput, id, invalid } from '../lib/response';
import { spec } from '../spec';
export let manageContact = SlateTool.create(spec, {
  key: 'manage_contact',
  name: 'Manage Contact',
  description:
    'Get, update, or delete an exact global contact discovered with list_contacts. Deletion affects the address book and can affect multiple lists; previously sent invitations and responses can retain personal data. This does not prove complete erasure.'
})
  .input(
    z.object({
      action: z.enum(['get', 'update', 'delete']),
      contactId: id,
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().optional(),
      phoneNumber: z.string().optional(),
      customFields: z.record(z.string(), z.string()).optional()
    })
  )
  .output(
    z.object({
      contactId: z.string(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().optional(),
      phoneNumber: z.string().optional(),
      status: z.string().optional(),
      statusFlag: z.boolean().optional(),
      customFields: z.record(z.string(), z.string()).optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let { action, contactId, ...changes } = ctx.input;
    if (action !== 'update' && Object.values(changes).some(value => value !== undefined))
      throw invalid('Contact changes apply only to update.');
    let client = new Client(ctx.auth);
    let contact = await client.getContact(contactId);
    if (action === 'delete') {
      await client.deleteContact(contactId);
      return {
        output: { contactId, deleted: true },
        message:
          'Global contact deletion confirmed. Sent invitations and responses may retain personal data.'
      };
    }
    if (action === 'update') contact = await client.updateContact(contactId, changes);
    return {
      output: contactOutput(contact),
      message: `Contact ${contact.id} ${action === 'update' ? 'updated' : 'retrieved'}.`
    };
  })
  .build();
