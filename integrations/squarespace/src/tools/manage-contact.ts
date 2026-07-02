import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { requireSquarespaceString, squarespaceServiceError } from '../lib/errors';
import { spec } from '../spec';

let primaryEmailSchema = z.object({
  email: z.string().describe('Primary email address for the contact'),
  acceptsMarketing: z
    .boolean()
    .optional()
    .describe('Whether this contact accepts marketing email')
});

let contactInputFrom = (input: {
  firstName?: string;
  lastName?: string;
  locale?: string;
  primaryEmail?: { email: string; acceptsMarketing?: boolean };
}) => ({
  firstName: input.firstName,
  lastName: input.lastName,
  locale: input.locale,
  primaryEmail: input.primaryEmail
});

export let manageContact = SlateTool.create(spec, {
  name: 'Manage Contact',
  key: 'manage_contact',
  description: `Create, update, or delete a Squarespace contact using the current Contacts API. Use action to select the operation; creates require name, locale, and primary email.`,
  instructions: [
    'For create, provide firstName, lastName, locale, and primaryEmail',
    'For update, provide contactId and at least one contact field to change',
    'For delete, provide contactId'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      contactId: z.string().optional().describe('Contact ID for update and delete'),
      firstName: z.string().optional().describe('Contact first name'),
      lastName: z.string().optional().describe('Contact last name'),
      locale: z.string().optional().describe('Contact locale, e.g. en-US'),
      primaryEmail: primaryEmailSchema.optional().describe('Primary email settings')
    })
  )
  .output(
    z.object({
      action: z.string().describe('Action performed'),
      contactId: z.string().optional().describe('Contact ID'),
      contact: z.any().optional().describe('Created or updated contact'),
      deleted: z.boolean().optional().describe('Whether the contact was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'create') {
      requireSquarespaceString(ctx.input.firstName, 'firstName', 'create');
      requireSquarespaceString(ctx.input.lastName, 'lastName', 'create');
      requireSquarespaceString(ctx.input.locale, 'locale', 'create');
      requireSquarespaceString(ctx.input.primaryEmail?.email, 'primaryEmail.email', 'create');

      let contact = await client.createContact(contactInputFrom(ctx.input));

      return {
        output: {
          action: 'created',
          contactId: contact.id,
          contact
        },
        message: `Created contact **${contact.primaryEmail?.email || contact.id}**.`
      };
    }

    if (ctx.input.action === 'update') {
      let contactId = requireSquarespaceString(ctx.input.contactId, 'contactId', 'update');
      let hasUpdates =
        ctx.input.firstName !== undefined ||
        ctx.input.lastName !== undefined ||
        ctx.input.locale !== undefined ||
        ctx.input.primaryEmail !== undefined;

      if (!hasUpdates) {
        throw squarespaceServiceError('At least one contact field is required for "update".');
      }

      let contact = await client.updateContact(contactId, contactInputFrom(ctx.input));

      return {
        output: {
          action: 'updated',
          contactId: contact.id || contactId,
          contact
        },
        message: `Updated contact **${contact.primaryEmail?.email || contact.id || contactId}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      let contactId = requireSquarespaceString(ctx.input.contactId, 'contactId', 'delete');

      await client.deleteContact(contactId);

      return {
        output: {
          action: 'deleted',
          contactId,
          deleted: true
        },
        message: `Deleted contact **${contactId}**.`
      };
    }

    throw squarespaceServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
