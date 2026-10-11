import { SlateTool } from 'slates';
import { z } from 'zod';
import { graphAuthMethodKeys } from '../auth';
import { GraphClient } from '../lib/client';
import { microsoftTeamsActionScopes } from '../scopes';
import { spec } from '../spec';

// https://learn.microsoft.com/en-us/graph/api/user-get?view=graph-rest-1.0
export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description: `Get the profile of the signed-in Microsoft Teams user, including the user ID used by chat, membership, mention, and presence tools.`,
  tags: {
    readOnly: true
  }
})
  .scopes(microsoftTeamsActionScopes.getCurrentUser)
  .authMethods(graphAuthMethodKeys)
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().describe('Microsoft Entra object ID of the signed-in user'),
      displayName: z.string().nullable().describe('Display name'),
      userPrincipalName: z.string().nullable().describe('User principal name (sign-in name)'),
      mail: z.string().nullable().describe('Primary email address'),
      jobTitle: z.string().nullable().describe('Job title'),
      preferredLanguage: z.string().nullable().describe('Preferred language')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GraphClient({ token: ctx.auth.token });
    let me = await client.getMe();

    return {
      output: {
        userId: me.id,
        displayName: me.displayName ?? null,
        userPrincipalName: me.userPrincipalName ?? null,
        mail: me.mail ?? null,
        jobTitle: me.jobTitle ?? null,
        preferredLanguage: me.preferredLanguage ?? null
      },
      message: `Signed in as **${me.displayName ?? me.userPrincipalName ?? me.id}**.`
    };
  })
  .build();
