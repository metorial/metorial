import { SlateTool } from 'slates';
import { z } from 'zod';
import { slackUserAuthMethods } from '../lib/auth-methods';
import { SlackClient } from '../lib/client';
import { missingRequiredAlternativeError } from '../lib/errors';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';

let userProfileSchema = z.object({
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  displayName: z.string().optional().describe('Display name'),
  title: z.string().optional().describe('Job title'),
  pronouns: z.string().optional().describe('Pronouns'),
  phone: z.string().optional().describe('Phone number')
});

export let updateUserProfile = SlateTool.create(spec, {
  name: 'Update User Profile',
  key: 'update_user_profile',
  description:
    "Update the connected Slack user's profile fields without changing their status or email address.",
  constraints: [
    'This tool only updates the connected Slack user and requires a user-token connection.',
    'Provide an empty string to clear a supported profile field.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(slackActionScopes.userProfileWrite)
  .authMethods(slackUserAuthMethods)
  .input(
    z.object({
      firstName: z.string().optional().describe('First name, or an empty string to clear it'),
      lastName: z.string().optional().describe('Last name, or an empty string to clear it'),
      displayName: z
        .string()
        .optional()
        .describe('Display name, or an empty string to clear it'),
      title: z.string().optional().describe('Job title, or an empty string to clear it'),
      pronouns: z.string().optional().describe('Pronouns, or an empty string to clear them'),
      phone: z.string().optional().describe('Phone number, or an empty string to clear it')
    })
  )
  .output(
    z.object({
      profile: userProfileSchema.describe('The connected user profile after the update')
    })
  )
  .handleInvocation(async ctx => {
    let hasUpdate = [
      ctx.input.firstName,
      ctx.input.lastName,
      ctx.input.displayName,
      ctx.input.title,
      ctx.input.pronouns,
      ctx.input.phone
    ].some(value => value !== undefined);

    if (!hasUpdate) {
      throw missingRequiredAlternativeError(
        'Provide at least one profile field to update: firstName, lastName, displayName, title, pronouns, or phone'
      );
    }

    let profile = await new SlackClient(ctx.auth.token).setUserProfile({
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      displayName: ctx.input.displayName,
      title: ctx.input.title,
      pronouns: ctx.input.pronouns,
      phone: ctx.input.phone
    });

    return {
      output: {
        profile: {
          firstName: profile?.first_name,
          lastName: profile?.last_name,
          displayName: profile?.display_name,
          title: profile?.title,
          pronouns: profile?.pronouns,
          phone: profile?.phone
        }
      },
      message: 'Updated the connected Slack user profile.'
    };
  })
  .build();
