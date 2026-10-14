import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let unsubscribeContact = SlateTool.create(spec, {
  name: 'Unsubscribe Contact',
  key: 'unsubscribe_contact',
  description: `Unsubscribe a contact from a specific list. You can unsubscribe by email address (which removes all matching contacts on the list) or by a specific contact ID.`,
  instructions: [
    'Provide either an email or a contactId, not both. Email-based unsubscription removes all contacts with that email on the list.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      listId: z.string().describe('List ID. Call list_lists to discover available lists.'),
      email: z
        .string()
        .optional()
        .describe(
          'Email address to unsubscribe (unsubscribes all matching contacts on the list)'
        ),
      contactId: z
        .string()
        .optional()
        .describe('Contact ID. Call list_contacts for the chosen list to find contacts.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the unsubscription was successful'),
      unsubscribeCount: z
        .number()
        .optional()
        .describe('Number of contacts unsubscribed (email-based only)')
    })
  )
  .handleInvocation(async ctx => {
    let input = ctx.input;

    if ((!input.email && !input.contactId) || (input.email && input.contactId)) {
      throw createApiServiceError('Provide exactly one of email or contactId.');
    }

    let client = new Client({ token: ctx.auth.token });

    if (input.contactId) {
      let result = await client.unsubscribeById(input.listId, input.contactId);
      return {
        output: { success: result.success === 1 },
        message: `Unsubscribed contact ${input.contactId} from list ${input.listId}.`
      };
    }

    if (input.email) {
      let result = await client.unsubscribeByEmail(input.listId, input.email);
      return {
        output: {
          success: result.success,
          unsubscribeCount: result.unsubscribeCount
        },
        message: `Unsubscribed **${result.unsubscribeCount}** contact(s) with email ${input.email} from list ${input.listId}.`
      };
    }

    throw createApiServiceError('Provide exactly one of email or contactId.');
  })
  .build();
