import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { formatProfile, profileOutputSchema } from '../lib/schemas';
import { googleContactsActionScopes } from '../scopes';
import { spec } from '../spec';

export let getMyProfile = SlateTool.create(spec, {
  name: 'Get My Profile',
  key: 'get_my_profile',
  description: `Retrieves the authenticated Google user's People profile, including names, email addresses, photos, organizations, phone numbers, and biographies.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(googleContactsActionScopes.getMyProfile)
  .input(z.object({}))
  .output(profileOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let profile = formatProfile(await client.getMyProfile());
    let displayName =
      profile.names?.[0]?.displayName ||
      profile.emailAddresses?.[0]?.value ||
      'authenticated Google user';

    return {
      output: profile,
      message: `Retrieved profile for **${displayName}**.`
    };
  })
  .build();
