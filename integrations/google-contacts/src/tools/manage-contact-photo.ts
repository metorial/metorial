import { googlePeopleServiceError } from '@slates/google-people-recipes';
import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { formatProfile, profileOutputSchema } from '../lib/schemas';
import { googleContactsActionScopes } from '../scopes';
import { spec } from '../spec';

export let manageContactPhoto = SlateTool.create(spec, {
  name: 'Manage Contact Photo',
  key: 'manage_contact_photo',
  description: `Updates or deletes the photo for a contact in the authenticated user's Google Contacts.`,
  instructions: [
    'For action "update", provide raw image bytes as a base64-encoded string in photoBase64.',
    'For action "delete", omit photoBase64. Google may return a default profile photo after deleting a custom contact photo.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .scopes(googleContactsActionScopes.manageContactPhoto)
  .input(
    z.object({
      action: z.enum(['update', 'delete']).describe('Photo operation to perform'),
      resourceName: z
        .string()
        .describe('Resource name of the contact (for example, "people/c12345")'),
      photoBase64: z
        .string()
        .optional()
        .describe('Raw photo bytes encoded as base64; required only for action "update"')
    })
  )
  .output(
    z.object({
      action: z.enum(['update', 'delete']).describe('Photo operation that was performed'),
      resourceName: z.string().describe('Resource name of the affected contact'),
      person: profileOutputSchema
        .optional()
        .describe(
          'Contact returned after the photo mutation, when Google includes it in the response'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'update') {
      if (!ctx.input.photoBase64?.trim()) {
        throw googlePeopleServiceError('photoBase64 is required for action "update"');
      }

      let result = await client.updateContactPhoto(
        ctx.input.resourceName,
        ctx.input.photoBase64
      );
      let person = result?.person ? formatProfile(result.person) : undefined;

      return {
        output: {
          action: 'update' as const,
          resourceName: person?.resourceName || ctx.input.resourceName,
          person
        },
        message: `Updated the photo for **${ctx.input.resourceName}**.`
      };
    }

    if (ctx.input.photoBase64 !== undefined) {
      throw googlePeopleServiceError('photoBase64 must be omitted for action "delete"');
    }

    let result = await client.deleteContactPhoto(ctx.input.resourceName);
    let person = result?.person ? formatProfile(result.person) : undefined;

    return {
      output: {
        action: 'delete' as const,
        resourceName: person?.resourceName || ctx.input.resourceName,
        person
      },
      message: `Deleted the custom photo for **${ctx.input.resourceName}**.`
    };
  })
  .build();
