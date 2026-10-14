import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { WrikeClient } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Get the authenticated Wrike user and account memberships. Use the contact ID to assign tasks and the account IDs to identify the connected account.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      contactId: z.string(),
      firstName: z.string(),
      lastName: z.string(),
      type: z.string(),
      profiles: z.array(
        z.object({
          accountId: z.string(),
          email: z.string().optional(),
          role: z.string().optional()
        })
      ),
      avatarUrl: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new WrikeClient(ctx.auth);
    let result = await client.getContacts({ me: true });
    let contact = result.data[0];
    if (!contact) {
      throw createApiServiceError('Wrike did not return the authenticated user.', {
        reason: 'missing_user_profile'
      });
    }
    return {
      output: {
        contactId: contact.id,
        firstName: contact.firstName,
        lastName: contact.lastName,
        type: contact.type,
        profiles: (contact.profiles ?? []).map(profile => ({
          accountId: profile.accountId,
          email: profile.email,
          role: profile.role
        })),
        avatarUrl: contact.avatarUrl
      },
      message: `Authenticated as **${contact.firstName} ${contact.lastName}** (${contact.id}).`
    };
  })
  .build();
