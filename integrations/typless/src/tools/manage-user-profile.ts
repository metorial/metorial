import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageUserProfile = SlateTool.create(spec, {
  name: 'Manage User Profile',
  key: 'manage_user_profile',
  description: `Retrieve or update the authenticated user's profile. When called without update fields, returns the current profile. When update fields are provided, updates the profile and returns the updated information. Supports updating first name, last name, and email address.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      firstName: z
        .string()
        .optional()
        .describe('New first name for the user (omit to keep current)'),
      lastName: z
        .string()
        .optional()
        .describe('New last name for the user (omit to keep current)'),
      email: z
        .string()
        .optional()
        .describe('New email address for the user (omit to keep current)')
    })
  )
  .output(
    z.object({
      email: z.string().describe('User email address'),
      firstName: z.string().describe('User first name'),
      lastName: z.string().describe('User last name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let hasUpdates =
      ctx.input.firstName !== undefined ||
      ctx.input.lastName !== undefined ||
      ctx.input.email !== undefined;

    let profile: any;
    if (hasUpdates) {
      profile = await client.updateUserProfile({
        firstName: ctx.input.firstName,
        lastName: ctx.input.lastName,
        email: ctx.input.email
      });

      return {
        output: profile,
        message: `Profile updated: **${profile.firstName} ${profile.lastName}** (${profile.email})`
      };
    } else {
      profile = await client.getUserProfile();

      return {
        output: profile,
        message: `Current profile: **${profile.firstName} ${profile.lastName}** (${profile.email})`
      };
    }
  })
  .build();
