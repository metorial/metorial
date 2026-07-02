import { SlateTool } from 'slates';
import { z } from 'zod';
import { LinkedInClient } from '../lib/client';
import { spec } from '../spec';

export let getProfile = SlateTool.create(spec, {
  name: 'Get Profile',
  key: 'get_profile',
  description: `Retrieve the authenticated LinkedIn member's profile information including name, email, and profile picture. Uses the OpenID Connect userinfo endpoint to return the current user's identity.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      memberId: z.string().describe('LinkedIn member ID (sub claim)'),
      name: z.string().describe('Full name of the member'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Primary email address'),
      emailVerified: z.boolean().optional().describe('Whether the email is verified'),
      profilePictureUrl: z.string().optional().describe('URL to the profile picture')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LinkedInClient({ token: ctx.auth.token });
    let userInfo = await client.getUserInfo();

    return {
      output: {
        memberId: userInfo.sub,
        name: userInfo.name,
        firstName: userInfo.given_name,
        lastName: userInfo.family_name,
        email: userInfo.email,
        emailVerified: userInfo.email_verified,
        profilePictureUrl: userInfo.picture
      },
      message: `Retrieved profile for **${userInfo.name}**${userInfo.email ? ` (${userInfo.email})` : ''}.`
    };
  })
  .build();
