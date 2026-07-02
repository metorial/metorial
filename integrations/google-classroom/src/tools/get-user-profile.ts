import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClassroomClient } from '../lib/client';
import { googleClassroomActionScopes } from '../scopes';
import { spec } from '../spec';

export let getUserProfile = SlateTool.create(spec, {
  name: 'Get User Profile',
  key: 'get_user_profile',
  description: `Retrieve a user profile from Google Classroom by user ID or email address. Returns name, email, and photo information. Use "me" to retrieve the current user's profile.`,
  tags: {
    readOnly: true
  }
})
  .scopes(googleClassroomActionScopes.getUserProfile)
  .input(
    z.object({
      userId: z.string().describe('User ID, email address, or "me" for the current user')
    })
  )
  .output(
    z.object({
      userId: z.string().optional().describe('User ID'),
      name: z
        .object({
          givenName: z.string().optional().describe('First name'),
          familyName: z.string().optional().describe('Last name'),
          fullName: z.string().optional().describe('Full name')
        })
        .optional()
        .describe('User name'),
      emailAddress: z.string().optional().describe('Email address'),
      photoUrl: z.string().optional().describe('Profile photo URL'),
      permissions: z
        .array(
          z.object({
            permission: z.string().optional()
          })
        )
        .optional()
        .describe('User permissions'),
      verifiedTeacher: z
        .boolean()
        .optional()
        .describe('Whether the user is a verified teacher')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClassroomClient({ token: ctx.auth.token });

    let profile = await client.getUserProfile(ctx.input.userId);

    return {
      output: {
        userId: profile.id,
        name: profile.name,
        emailAddress: profile.emailAddress,
        photoUrl: profile.photoUrl,
        permissions: profile.permissions,
        verifiedTeacher: profile.verifiedTeacher
      },
      message: `Retrieved profile for **${profile.name?.fullName ?? profile.id}**${profile.emailAddress ? ` (${profile.emailAddress})` : ''}.`
    };
  })
  .build();
