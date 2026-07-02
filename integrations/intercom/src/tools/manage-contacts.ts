import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { intercomServiceError } from '../lib/errors';
import { stringOrUndefined, timestampOrUndefined } from '../lib/output';
import { spec } from '../spec';

export let manageContacts = SlateTool.create(spec, {
  name: 'Manage Contacts',
  key: 'manage_contacts',
  description: `Create, update, archive, unarchive, merge, or delete contacts (users and leads) in Intercom.
Use **action** to specify the operation. Supports custom attributes and contact ownership assignment.
For merging, provide both a lead ID and a user ID — the lead will be merged into the user.`,
  instructions: [
    'When creating a contact, provide at least a role ("user" or "lead") and either an email or externalId.',
    'When merging, the "from" contact (leadContactId) must be a lead and the "into" contact (userContactId) must be a user.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'archive', 'unarchive', 'delete', 'merge'])
        .describe('The operation to perform on the contact'),
      contactId: z
        .string()
        .optional()
        .describe('Intercom contact ID (required for update, archive, unarchive, delete)'),
      leadContactId: z
        .string()
        .optional()
        .describe('Lead contact ID to merge from (required for merge)'),
      userContactId: z
        .string()
        .optional()
        .describe('User contact ID to merge into (required for merge)'),
      role: z.enum(['user', 'lead']).optional().describe('Contact role (required for create)'),
      externalId: z.string().optional().describe('External ID from your system'),
      email: z.string().optional().describe('Contact email address'),
      phone: z.string().optional().describe('Contact phone number'),
      name: z.string().optional().describe('Contact full name'),
      avatar: z.string().optional().describe('URL to contact avatar image'),
      signedUpAt: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp of when the contact signed up'),
      lastSeenAt: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp of when the contact was last seen'),
      ownerId: z.string().optional().describe('Admin ID to assign as contact owner'),
      unsubscribedFromEmails: z
        .boolean()
        .optional()
        .describe('Whether contact has unsubscribed from emails'),
      customAttributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom attributes as key-value pairs')
    })
  )
  .output(
    z.object({
      contactId: z.string().optional().describe('Intercom contact ID'),
      role: z.string().optional().describe('Contact role (user or lead)'),
      email: z.string().optional().describe('Contact email'),
      name: z.string().optional().describe('Contact name'),
      phone: z.string().optional().describe('Contact phone'),
      externalId: z.string().optional().describe('External ID'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      deleted: z.boolean().optional().describe('Whether the contact was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let { action } = ctx.input;

    if (action === 'create') {
      let result = await client.createContact({
        role: ctx.input.role,
        externalId: ctx.input.externalId,
        email: ctx.input.email,
        phone: ctx.input.phone,
        name: ctx.input.name,
        avatar: ctx.input.avatar,
        signedUpAt: ctx.input.signedUpAt,
        lastSeenAt: ctx.input.lastSeenAt,
        ownerId: ctx.input.ownerId,
        unsubscribedFromEmails: ctx.input.unsubscribedFromEmails,
        customAttributes: ctx.input.customAttributes
      });
      return {
        output: mapContact(result),
        message: `Created ${result.role} contact **${result.name || result.email || result.id}**`
      };
    }

    if (action === 'update') {
      if (!ctx.input.contactId) throw intercomServiceError('contactId is required for update');
      let result = await client.updateContact(ctx.input.contactId, {
        role: ctx.input.role,
        externalId: ctx.input.externalId,
        email: ctx.input.email,
        phone: ctx.input.phone,
        name: ctx.input.name,
        avatar: ctx.input.avatar,
        signedUpAt: ctx.input.signedUpAt,
        lastSeenAt: ctx.input.lastSeenAt,
        ownerId: ctx.input.ownerId,
        unsubscribedFromEmails: ctx.input.unsubscribedFromEmails,
        customAttributes: ctx.input.customAttributes
      });
      return {
        output: mapContact(result),
        message: `Updated contact **${result.name || result.email || result.id}**`
      };
    }

    if (action === 'archive') {
      if (!ctx.input.contactId)
        throw intercomServiceError('contactId is required for archive');
      let result = await client.archiveContact(ctx.input.contactId);
      return {
        output: mapContact(result),
        message: `Archived contact **${ctx.input.contactId}**`
      };
    }

    if (action === 'unarchive') {
      if (!ctx.input.contactId)
        throw intercomServiceError('contactId is required for unarchive');
      let result = await client.unarchiveContact(ctx.input.contactId);
      return {
        output: mapContact(result),
        message: `Unarchived contact **${ctx.input.contactId}**`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.contactId) throw intercomServiceError('contactId is required for delete');
      await client.deleteContact(ctx.input.contactId);
      return {
        output: { contactId: ctx.input.contactId, deleted: true },
        message: `Deleted contact **${ctx.input.contactId}**`
      };
    }

    if (action === 'merge') {
      if (!ctx.input.leadContactId || !ctx.input.userContactId) {
        throw intercomServiceError(
          'Both leadContactId and userContactId are required for merge'
        );
      }
      let result = await client.mergeContacts(
        ctx.input.leadContactId,
        ctx.input.userContactId
      );
      return {
        output: mapContact(result),
        message: `Merged lead **${ctx.input.leadContactId}** into user **${ctx.input.userContactId}**`
      };
    }

    throw intercomServiceError(`Unknown action: ${action}`);
  })
  .build();

let mapContact = (data: any) => ({
  contactId: stringOrUndefined(data.id),
  role: stringOrUndefined(data.role),
  email: stringOrUndefined(data.email),
  name: stringOrUndefined(data.name),
  phone: stringOrUndefined(data.phone),
  externalId: stringOrUndefined(data.external_id),
  createdAt: timestampOrUndefined(data.created_at),
  updatedAt: timestampOrUndefined(data.updated_at)
});
