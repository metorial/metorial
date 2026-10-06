import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { fail } from '../lib/validation';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description: `Get information about the currently authenticated user, including username, email, site admin status, and organization memberships.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().describe('GraphQL ID of the user'),
      username: z.string(),
      displayName: z.string().optional(),
      email: z
        .string()
        .optional()
        .describe('Verified primary email, when the native deployment supplies one.'),
      avatarUrl: z.string().optional(),
      siteAdmin: z.boolean(),
      organizationCount: z.number().optional(),
      organizationsComplete: z.boolean().optional(),
      organizations: z
        .array(
          z.object({
            organizationId: z.string(),
            name: z.string(),
            displayName: z.string().optional()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = Client.forContext(ctx);

    let data = await client.getCurrentUser();
    let user = data.currentUser;

    if (!user) {
      throw fail('Unable to retrieve current user. The access token may be invalid.');
    }

    let organizations = (user.organizations?.nodes || []).map(org => ({
      organizationId: org.id,
      name: org.name,
      displayName: org.displayName ?? undefined
    }));

    return {
      output: {
        userId: user.id,
        username: user.username,
        displayName: user.displayName ?? undefined,
        email: user.email ?? undefined,
        avatarUrl: user.avatarURL ?? undefined,
        siteAdmin: user.siteAdmin,
        organizations,
        organizationCount: user.organizations.totalCount,
        organizationsComplete: organizations.length === user.organizations.totalCount
      },
      message: `Authenticated as **${user.username}**${user.siteAdmin ? ' (site admin)' : ''}.`
    };
  })
  .build();
